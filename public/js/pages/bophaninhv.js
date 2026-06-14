// ========== BỘ PHẬN IN — Desktop SPA ==========
var currentYear = new Date().getFullYear();
var _bpi = { records: [], tree: null, filter: { year: currentYear, status: 'pending', field: null }, statsFilter: 'all', search: '', page: 1, ps: 200, contractors: [] };
window._bpiRecentlyCompletedIds = [];
var _bpiOpen = {};
_bpiOpen['y' + currentYear] = true;
_bpiOpen['p' + currentYear] = true;

function _bpiSaveUrlState() {
    var f = _bpi.filter;
    var params = new URLSearchParams();
    if (f.year) params.set('year', f.year);
    if (f.status) params.set('status', f.status);
    if (f.field) params.set('field', f.field);
    if (f.month) params.set('month', f.month);
    if (f.operator_type) params.set('operator_type', f.operator_type);
    if (f.operator_id) params.set('operator_id', f.operator_id);
    if (_bpi.search) params.set('search', _bpi.search);
    
    var openKeys = Object.keys(_bpiOpen).filter(function(k) { return _bpiOpen[k]; });
    if (openKeys.length) params.set('open', openKeys.join(','));
    
    var searchStr = params.toString();
    var newUrl = window.location.pathname + (searchStr ? '?' + searchStr : '');
    window.history.replaceState(null, '', newUrl);
}

function _bpiRestoreUrlState() {
    var params = new URLSearchParams(window.location.search);
    var currentYear = new Date().getFullYear();
    
    if (params.has('year') || params.has('status') || params.has('field') || params.has('month') || params.has('operator_id') || params.has('search')) {
        var year = params.get('year');
        var status = params.get('status');
        var field = params.get('field');
        var month = params.get('month');
        var operator_type = params.get('operator_type');
        var operator_id = params.get('operator_id');
        var search = params.get('search');
        
        _bpi.filter = {
            year: year ? Number(year) : null,
            status: status || null,
            field: field || null,
            month: month ? Number(month) : null,
            operator_type: operator_type || null,
            operator_id: operator_id ? Number(operator_id) : null
        };
        _bpi.search = '';
        _bpi.statsFilter = 'all';
        
        var openStr = params.get('open');
        _bpiOpen = {};
        if (openStr) {
            openStr.split(',').forEach(function(k) {
                if (k) _bpiOpen[k] = true;
            });
        }
    } else {
        _bpi.filter = { year: currentYear, status: 'pending', field: null };
        _bpi.statsFilter = 'all';
        _bpi.search = '';
        _bpiOpen = {};
        _bpiOpen['y' + currentYear] = true;
        _bpiOpen['p' + currentYear] = true;
    }
}

function renderBophaninPage(content) {
    _bpiRestoreUrlState();
    if (!document.getElementById('_bpiFontLink')) {
        var fl = document.createElement('link'); fl.id = '_bpiFontLink'; fl.rel = 'stylesheet';
        fl.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@500;600;700;800;900&display=swap';
        document.head.appendChild(fl);
    }
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
+'.bpi-ib.on-test{background:#fef3c7;border-color:#f59e0b}.bpi-ib.on-done{background:#dcfce7;border-color:#22c55e}.bpi-ib.on-err{background:#fee2e2;border-color:#ef4444}.bpi-ib.on-audit{background:#e0f2fe;border-color:#0ea5e9;color:#0284c7}'
+'.bpi-stat-btn{padding:8px 18px;border-radius:10px;min-width:110px;text-align:center;cursor:pointer;transition:all .2s ease;border:2px solid transparent;user-select:none;opacity:0.55}'
+'.bpi-stat-btn:hover{opacity:0.85;transform:translateY(-2px);box-shadow:0 6px 20px rgba(0,0,0,0.15)}'
+'.bpi-stat-btn.active{opacity:1;transform:scale(1.05);border-color:#fff;box-shadow:0 0 0 2px rgba(124,58,237,0.3)}'
+'@media(max-width:768px){.bpi-sb{display:none}}'
+ '.bpi-modal-overlay{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(15,23,42,0.6);backdrop-filter:blur(6px);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding-top:40px;overflow-y:auto;opacity:0;transition:opacity .25s ease}'
+ '.bpi-modal-overlay.show{opacity:1}'
+ '.bpi-modal{background:#fff;border-radius:16px;width:460px;max-width:92vw;box-shadow:0 25px 60px rgba(0,0,0,0.25);transform:scale(0.85);transition:transform .3s cubic-bezier(0.34,1.56,0.64,1);overflow:hidden;margin-bottom:40px}'
+ '.bpi-modal-overlay.show .bpi-modal{transform:scale(1)}'
+ '.bpi-modal-header{background:linear-gradient(135deg,#7c3aed,#9333ea);color:#fff;padding:18px 24px;display:flex;align-items:center;gap:12px}'
+ '.bpi-modal-header .m-icon{font-size:28px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.2))}'
+ '.bpi-modal-header .m-title{font-size:16px;font-weight:800;letter-spacing:0.3px;font-family:Inter,system-ui,sans-serif}'
+ '.bpi-modal-header .m-sub{font-size:11px;opacity:0.85;margin-top:2px}'
+ '.bpi-modal-body{padding:20px 24px}'
+ '.bpi-modal-row{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f1f5f9;font-family:Inter,system-ui,sans-serif}'
+ '.bpi-modal-row:last-child{border-bottom:none}'
+ '.bpi-modal-lbl{font-size:12px;color:#64748b;font-weight:600}'
+ '.bpi-modal-val{font-size:13px;color:#1e293b;font-weight:700;text-align:right;max-width:60%}'
+ '.bpi-modal-actions{display:flex;gap:10px;padding:16px 24px;border-top:1px solid #f1f5f9}'
+ '.bpi-modal-btn{flex:1;padding:12px;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;font-family:Inter,system-ui,sans-serif;transition:all .15s}'
+ '.bpi-modal-btn.confirm{background:linear-gradient(135deg,#7c3aed,#9333ea);color:#fff;box-shadow:0 4px 15px rgba(124,58,237,0.3)}'
+ '.bpi-modal-btn.confirm:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(124,58,237,0.4)}'
+ '.bpi-modal-btn.cancel{background:#f1f5f9;color:#475569}'
+ '.bpi-modal-btn.cancel:hover{background:#e2e8f0}'
+ '.bpi-name-link{cursor:pointer;color:#2563eb;text-decoration:underline dashed #3b82f6;font-weight:700;transition:color .15s}'
+ '.bpi-name-link:hover{color:#1d4ed8;text-decoration:underline}';
        document.head.appendChild(st);
    }
    content.innerHTML = '<div class="bpi-wrap"><div class="bpi-sb" id="bpiSb"><div style="padding:20px;text-align:center;color:var(--gray-400);font-size:12px">Đang tải...</div></div><div class="bpi-main">'
        +'<div style="display:flex;gap:10px;margin-bottom:8px;flex-wrap:wrap;align-items:center">'
        +'<div style="display:flex;flex-direction:column;gap:8px;align-items:flex-start">'
        +'<div id="bpiInfo" style="font-size:12px"></div>'
        +'<input id="bpiSearch" autocomplete="off" placeholder="🔍 Tìm SP, mã đơn, nhân viên..." style="padding:6px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:12px;width:240px;outline:none">'
        +'</div>'
        +'<div id="bpiStats" style="display:flex;gap:10px;flex:1;justify-content:center"></div>'
        +(window._currentUser && window._currentUser.role === 'giam_doc' ? '<button onclick="_bpiManageContractors()" style="padding:6px 14px;background:linear-gradient(135deg,#7c3aed,#8b5cf6);color:#fff;border:none;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;margin-left:8px;transition:all .2s" onmouseover="this.style.opacity=0.85" onmouseout="this.style.opacity=1">🏭 Quản Lý Gia Công In</button>'
        +'<button onclick="_bpiManageFields()" style="padding:6px 14px;background:linear-gradient(135deg,#0ea5e9,#0284c7);color:#fff;border:none;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;margin-left:8px;transition:all .2s" onmouseover="this.style.opacity=0.85" onmouseout="this.style.opacity=1">⚙️ Quản Lý Lĩnh Vực In</button>' : '')
        +'</div>'
        +'<div class="card"><div class="card-body" style="overflow-x:auto;padding:8px"><table class="table" style="font-size:11px;white-space:nowrap" id="bpiTable"><thead><tr style="background:var(--gray-800)">'
        +'<th>STT</th><th>🔍</th><th>🧪</th><th>✅</th><th>⚠️</th><th>Lĩnh Vực</th><th>Ngày In / Bàn Giao</th><th>Tiến Độ</th><th>NV In</th><th>Tên SP/Phối</th><th>Tên Khách</th><th>CSKH</th><th>SL Đơn</th><th>Mét In</th><th>Cuộn Vật Liệu</th><th>SL Đầu Cuộn</th><th>SL Cuối Cuộn</th><th>In/Thêu Chung</th><th>Ghi Chú</th><th>Cập Nhật</th>'
        +'</tr></thead><tbody id="bpiTb"><tr><td colspan="20" style="text-align:center;padding:40px">⏳</td></tr></tbody></table></div></div></div></div>';
    
    _bpi.search = '';
    var searchEl = document.getElementById('bpiSearch');
    if (searchEl) searchEl.value = '';

    var _t; document.getElementById('bpiSearch').addEventListener('input', function() {
        clearTimeout(_t); _t = setTimeout(function() {
            _bpi.search = document.getElementById('bpiSearch').value || '';
            _bpi.page = 1;
            _bpiSaveUrlState();
            _bpiRender();
        }, 300);
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
    h += '<div class="bpi-sb-total" onclick="_bpiFilter(null,null,null)"><span>📦 Tổng đơn in</span><span style="font-size:16px">'+(t.total||0)+'</span></div>';
    if (t.tree) t.tree.forEach(function(yr) {
        var yKey = 'y' + yr.year;
        var yo = !!_bpiOpen[yKey];
        h += '<div class="bpi-sb-year" onclick="_bpiFilter('+yr.year+',null,null)">'
          + '<span onclick="event.stopPropagation();_bpiTgl(\''+yKey+'\')" style="display:inline-block;padding:2px 6px;cursor:pointer;margin-right:2px">'+(yo?'▼':'▶')+'</span>'
          + '<span>📆 '+yr.year+'</span>'
          + '<span style="background:linear-gradient(135deg,#7c3aed,#8b5cf6);color:#fff;padding:2px 10px;border-radius:10px;font-size:10px">'+yr.count+'</span></div>';
        if (yo) {
            // "Chưa in xong" folder
            var pendingKey = 'p' + yr.year;
            var po = !!_bpiOpen[pendingKey];
            var pendingActive = f.year == yr.year && f.status === 'pending' && !f.field;
            h += '<div class="bpi-sb-month'+(pendingActive?' active':'')+'" onclick="event.stopPropagation();_bpiFilter('+yr.year+',\'pending\',null)">'
              + '<span onclick="event.stopPropagation();_bpiTgl(\''+pendingKey+'\')" style="display:inline-block;padding:2px 6px;cursor:pointer;margin-right:2px">'+(po?'▼':'▶')+'</span>'
              + '<span>⏳ Chưa in xong</span>'
              + '<span>'+yr.pending.total+'</span></div>';
              
            if (po) {
                // IN PET
                var petActive = f.year == yr.year && f.status === 'pending' && f.field === 'IN PET';
                h += '<div class="bpi-sb-item'+(petActive?' active':'')+'" onclick="event.stopPropagation();_bpiFilter('+yr.year+',\'pending\',\'IN PET\')">'
                  + '<span>🟣 IN PET</span><span>'+yr.pending.pet+'</span></div>';
                
                // IN DECAL
                var decalActive = f.year == yr.year && f.status === 'pending' && f.field === 'IN DECAL';
                h += '<div class="bpi-sb-item'+(decalActive?' active':'')+'" onclick="event.stopPropagation();_bpiFilter('+yr.year+',\'pending\',\'IN DECAL\')">'
                  + '<span>🔵 IN DECAL</span><span>'+yr.pending.decal+'</span></div>';
                  
                // IN TEM
                var temActive = f.year == yr.year && f.status === 'pending' && f.field === 'IN TEM';
                h += '<div class="bpi-sb-item'+(temActive?' active':'')+'" onclick="event.stopPropagation();_bpiFilter('+yr.year+',\'pending\',\'IN TEM\')">'
                  + '<span>🟢 IN TEM</span><span>'+yr.pending.tem+'</span></div>';
            }
            
            // "Đã in xong" folder
            var doneActive = f.year == yr.year && f.status === 'done' && !f.month;
            var doneKey = 'd' + yr.year;
            var doOpen = !!_bpiOpen[doneKey];
            h += '<div class="bpi-sb-month'+(doneActive?' active':'')+'" onclick="event.stopPropagation();_bpiFilter('+yr.year+',\'done\',null)" style="color:#059669">'
              + '<span onclick="event.stopPropagation();_bpiTgl(\''+doneKey+'\')" style="display:inline-block;padding:2px 6px;cursor:pointer;margin-right:2px;color:#059669">'+(doOpen?'▼':'▶')+'</span>'
              + '<span>✅ Đã in xong</span>'
              + '<span>'+yr.done+'</span></div>';
 
            if (doOpen && yr.doneMonths) {
                var months = Object.keys(yr.doneMonths).map(Number).sort(function(a,b){return b-a;});
                months.forEach(function(m) {
                    var mKey = 'm_' + yr.year + '_' + m;
                    var moOpen = !!_bpiOpen[mKey];
                    var monthActive = f.year == yr.year && f.status === 'done' && f.month == m && !f.operator_id;
                    
                    var mData = yr.doneMonths[m];
                    var monthQty = 0;
                    if (mData) {
                        monthQty += (mData.pet || []).reduce(function(sum, op){return sum + op.count;}, 0);
                        monthQty += (mData.decal || []).reduce(function(sum, op){return sum + op.count;}, 0);
                        monthQty += (mData.tem || []).reduce(function(sum, op){return sum + op.count;}, 0);
                        monthQty += (mData.contractors || []).reduce(function(sum, op){return sum + op.count;}, 0);
                    }
                    
                    h += '<div class="bpi-sb-item'+(monthActive?' active':'')+'" onclick="event.stopPropagation();_bpiFilter('+yr.year+',\'done\',null,'+m+')" style="padding-left:36px;font-weight:700;color:#059669">'
                      + '<span onclick="event.stopPropagation();_bpiTgl(\''+mKey+'\')" style="display:inline-block;padding:2px 6px;cursor:pointer;margin-right:2px;color:#059669">'+(moOpen?'▼':'▶')+'</span>'
                      + '<span>📅 Tháng '+String(m).padStart(2,'0')+'</span>'
                      + '<span>'+monthQty+'</span></div>';
                      
                    if (moOpen && mData) {
                        // 1. IN PET
                        if (mData.pet && mData.pet.length > 0) {
                            var petFKey = 'mf_pet_' + yr.year + '_' + m;
                            var petFOpen = !!_bpiOpen[petFKey];
                            var petFActive = f.year == yr.year && f.status === 'done' && f.month == m && f.field === 'IN PET' && !f.operator_id;
                            var petQty = mData.pet.reduce(function(sum, op){return sum + op.count;}, 0);
                            
                            h += '<div class="bpi-sb-item'+(petFActive?' active':'')+'" onclick="event.stopPropagation();_bpiFilter('+yr.year+',\'done\',\'IN PET\','+m+')" style="padding-left:48px;font-weight:700;color:#7c3aed">'
                              + '<span onclick="event.stopPropagation();_bpiTgl(\''+petFKey+'\')" style="display:inline-block;padding:2px 6px;cursor:pointer;margin-right:2px;color:#7c3aed">'+(petFOpen?'▼':'▶')+'</span>'
                              + '<span>🟣 IN PET</span>'
                              + '<span>'+petQty+'</span></div>';
                              
                            if (petFOpen) {
                                mData.pet.forEach(function(op) {
                                    var opActive = f.year == yr.year && f.status === 'done' && f.month == m && f.field === 'IN PET' && f.operator_type === 'user' && f.operator_id == op.operator_id;
                                    h += '<div class="bpi-sb-item'+(opActive?' active':'')+'" onclick="event.stopPropagation();_bpiFilter('+yr.year+',\'done\',\'IN PET\','+m+',\'user\','+op.operator_id+')" style="padding-left:64px;font-size:10px">'
                                      + '<span>'+op.operator_name+'</span>'
                                      + '<span style="background:#f3e8ff;color:#7e22ce;padding:1px 6px;border-radius:8px;font-size:9px;font-weight:700">'+op.count+'</span></div>';
                                });
                            }
                        }
                        
                        // 2. IN DECAL
                        if (mData.decal && mData.decal.length > 0) {
                            var decalFKey = 'mf_decal_' + yr.year + '_' + m;
                            var decalFOpen = !!_bpiOpen[decalFKey];
                            var decalFActive = f.year == yr.year && f.status === 'done' && f.month == m && f.field === 'IN DECAL' && !f.operator_id;
                            var decalQty = mData.decal.reduce(function(sum, op){return sum + op.count;}, 0);
                            
                            h += '<div class="bpi-sb-item'+(decalFActive?' active':'')+'" onclick="event.stopPropagation();_bpiFilter('+yr.year+',\'done\',\'IN DECAL\','+m+')" style="padding-left:48px;font-weight:700;color:#0284c7">'
                              + '<span onclick="event.stopPropagation();_bpiTgl(\''+decalFKey+'\')" style="display:inline-block;padding:2px 6px;cursor:pointer;margin-right:2px;color:#0284c7">'+(decalFOpen?'▼':'▶')+'</span>'
                              + '<span>🔵 IN DECAL</span>'
                              + '<span>'+decalQty+'</span></div>';
                              
                            if (decalFOpen) {
                                mData.decal.forEach(function(op) {
                                    var opActive = f.year == yr.year && f.status === 'done' && f.month == m && f.field === 'IN DECAL' && f.operator_type === 'user' && f.operator_id == op.operator_id;
                                    h += '<div class="bpi-sb-item'+(opActive?' active':'')+'" onclick="event.stopPropagation();_bpiFilter('+yr.year+',\'done\',\'IN DECAL\','+m+',\'user\','+op.operator_id+')" style="padding-left:64px;font-size:10px">'
                                      + '<span>'+op.operator_name+'</span>'
                                      + '<span style="background:#e0f2fe;color:#0369a1;padding:1px 6px;border-radius:8px;font-size:9px;font-weight:700">'+op.count+'</span></div>';
                                });
                            }
                        }
 
                        // 3. IN TEM
                        if (mData.tem && mData.tem.length > 0) {
                            var temFKey = 'mf_tem_' + yr.year + '_' + m;
                            var temFOpen = !!_bpiOpen[temFKey];
                            var temFActive = f.year == yr.year && f.status === 'done' && f.month == m && f.field === 'IN TEM' && !f.operator_id;
                            var temQty = mData.tem.reduce(function(sum, op){return sum + op.count;}, 0);
                            
                            h += '<div class="bpi-sb-item'+(temFActive?' active':'')+'" onclick="event.stopPropagation();_bpiFilter('+yr.year+',\'done\',\'IN TEM\','+m+')" style="padding-left:48px;font-weight:700;color:#0d9488">'
                              + '<span onclick="event.stopPropagation();_bpiTgl(\''+temFKey+'\')" style="display:inline-block;padding:2px 6px;cursor:pointer;margin-right:2px;color:#0d9488">'+(temFOpen?'▼':'▶')+'</span>'
                              + '<span>🟢 IN TEM</span>'
                              + '<span>'+temQty+'</span></div>';
                              
                            if (temFOpen) {
                                mData.tem.forEach(function(op) {
                                    var opActive = f.year == yr.year && f.status === 'done' && f.month == m && f.field === 'IN TEM' && f.operator_type === 'user' && f.operator_id == op.operator_id;
                                    h += '<div class="bpi-sb-item'+(opActive?' active':'')+'" onclick="event.stopPropagation();_bpiFilter('+yr.year+',\'done\',\'IN TEM\','+m+',\'user\','+op.operator_id+')" style="padding-left:64px;font-size:10px">'
                                      + '<span>'+op.operator_name+'</span>'
                                      + '<span style="background:#ccfbf1;color:#0f766e;padding:1px 6px;border-radius:8px;font-size:9px;font-weight:700">'+op.count+'</span></div>';
                                });
                            }
                        }
 
                        // 4. Gia công
                        if (mData.contractors && mData.contractors.length > 0) {
                            mData.contractors.forEach(function(op) {
                                var opActive = f.year == yr.year && f.status === 'done' && f.month == m && f.operator_type === 'contractor' && f.operator_id == op.operator_id;
                                h += '<div class="bpi-sb-item'+(opActive?' active':'')+'" onclick="event.stopPropagation();_bpiFilter('+yr.year+',\'done\',null,'+m+',\'contractor\','+op.operator_id+')" style="padding-left:48px;font-size:10px;font-weight:600;color:#374151">'
                                  + '<span>'+op.operator_name+'</span>'
                                  + '<span style="background:#e2e8f0;color:#334155;padding:1px 6px;border-radius:8px;font-size:9px;font-weight:700">'+op.count+'</span></div>';
                            });
                        }
                    }
                });
            }
        }
    });
    sb.innerHTML = h;
}

function _bpiTgl(k) { _bpiOpen[k] = !_bpiOpen[k]; _bpiSaveUrlState(); _bpiRenderSb(); }
function _bpiFilter(y,s,f,m,opType,opId) { _bpi.statsFilter = 'all'; _bpi.filter = { year:y||null, status:s||null, field:f||null, month:m||null, operator_type:opType||null, operator_id:opId||null }; _bpi.page=1; _bpiSaveUrlState(); _bpiRenderSb(); _bpiLoadRecs(); }
function _bpiSetStatsFilter(filterType) { _bpi.statsFilter = filterType; _bpi.page = 1; _bpiRender(); }

async function _bpiLoadRecs() {
    var f = _bpi.filter, qs = '?_=1';
    if (f.year) qs += '&year='+f.year;
    if (f.status) qs += '&status='+f.status;
    if (f.field) qs += '&field='+encodeURIComponent(f.field);
    if (f.month) qs += '&month='+f.month;
    if (f.operator_type) qs += '&operator_type='+f.operator_type;
    if (f.operator_id) qs += '&operator_id='+f.operator_id;
    if (window._bpiRecentlyCompletedIds && window._bpiRecentlyCompletedIds.length) {
        qs += '&include_ids='+window._bpiRecentlyCompletedIds.join(',');
    }
    try { var res = await apiCall('/api/printing/records'+qs); _bpi.records = res.records||[]; _bpi.page=1; _bpiRender(); } catch(e) { console.error('[BPI]',e); }
}

function _bpiFD(d) { if (!d) return '—'; try { var p=d.split('T')[0].split('-'); return p[2]+'/'+p[1]+'/'+p[0]; } catch(e) { return d; } }

function _bpiCanAudit() {
    return window._currentUser && (window._currentUser.role === 'giam_doc' || window._currentUser.username === 'trinh');
}

function _bpiFT(d) {
    if (!d) return '';
    try {
        var dt = new Date(d);
        var timeStr = String(dt.getHours()).padStart(2, '0') + ':' + String(dt.getMinutes()).padStart(2, '0');
        var dateStr = String(dt.getDate()).padStart(2, '0') + '/' + String(dt.getMonth() + 1).padStart(2, '0');
        return timeStr + ' ' + dateStr;
    } catch(e) {
        return '';
    }
}

function _bpiGetQtyColor(r) {
    var code = (r.order_code || '').toUpperCase();
    var isTarget = code.indexOf('GCPET') >= 0 || code.indexOf('GCTEM') >= 0 || code.indexOf('SUAGCPET') >= 0 || code.indexOf('SUAGCTEM') >= 0 || code.indexOf('SUAPET') >= 0 || code.indexOf('SUATEM') >= 0;
    if (isTarget) {
        return '#0284c7'; // Nice blue/sky-blue for PET/TEM quantities
    }
    var isPhoi = false;
    if (r.product_name) {
        var match = r.product_name.match(/— P(\d+)/);
        if (match && parseInt(match[1]) > 1) isPhoi = true;
    }
    return isPhoi ? '#c084fc' : '#7c3aed'; // Lighter purple for coordination, purple for main uniform
}

function _bpiGetQtyDisplay(r) {
    if (!r.order_quantity && r.order_quantity !== 0) return '—';
    var code = (r.order_code || '').toUpperCase();
    var isTarget = code.indexOf('GCPET') >= 0 || code.indexOf('GCTEM') >= 0 || code.indexOf('SUAGCPET') >= 0 || code.indexOf('SUAGCTEM') >= 0 || code.indexOf('SUAPET') >= 0 || code.indexOf('SUATEM') >= 0;
    if (isTarget) {
        var prod = (r.product_name || '').toLowerCase();
        if (prod.indexOf('tờ') >= 0 || prod.indexOf('to') >= 0) {
            return r.order_quantity.toLocaleString('vi-VN') + ' Tờ';
        } else if (prod.indexOf('mét') >= 0 || prod.indexOf('met') >= 0) {
            return r.order_quantity.toLocaleString('vi-VN') + ' Mét';
        }
        return r.order_quantity.toLocaleString('vi-VN');
    }
    var isPhoi = false;
    if (r.product_name) {
        var match = r.product_name.match(/— P(\d+)/);
        if (match && parseInt(match[1]) > 1) isPhoi = true;
    }
    if (isPhoi) {
        return r.order_quantity.toLocaleString('vi-VN') + ' Phối';
    } else {
        var category = r.cutting_category || 'Áo';
        return r.order_quantity.toLocaleString('vi-VN') + ' ' + category;
    }
}

function _bpiGetProductNameDisplay(r) {
    var code = (r.order_code || '').toUpperCase();
    var isTarget = code.indexOf('GCPET') >= 0 || code.indexOf('GCTEM') >= 0 || code.indexOf('SUAGCPET') >= 0 || code.indexOf('SUAGCTEM') >= 0 || code.indexOf('SUAPET') >= 0 || code.indexOf('SUATEM') >= 0;
    if (isTarget) {
        return r.order_code || '—';
    }
    return r.product_name || '—';
}

function _bpiGetProgressDisplay(r) {
    if (r.is_completed) {
        if (!r.expected_ship_date) {
            return '<span style="color:#059669;font-weight:700">✅ Xong</span>';
        }
        try {
            var expected = new Date(r.expected_ship_date);
            expected.setHours(0,0,0,0);
            
            var actual = r.print_done_at ? new Date(r.print_done_at) : null;
            if (!actual) {
                actual = r.updated_at ? new Date(r.updated_at) : new Date();
            }
            actual.setHours(0,0,0,0);
            
            var diffTime = actual.getTime() - expected.getTime();
            var diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays <= 0) {
                return '<span style="color:#059669;font-weight:700">✅ Kịp tiến độ</span>';
            } else {
                return '<span style="color:#ea580c;font-weight:700">✅ Trễ ' + diffDays + ' ngày</span>';
            }
        } catch(e) {
            return '<span style="color:#059669;font-weight:700">✅ Xong</span>';
        }
    }
    if (!r.expected_ship_date) {
        return '<span style="color:#94a3b8">—</span>';
    }
    try {
        var today = vnNow();
        today.setHours(0,0,0,0);
        
        var expected = new Date(r.expected_ship_date);
        expected.setHours(0,0,0,0);
        
        var diffTime = expected.getTime() - today.getTime();
        var diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) {
            return '<span style="color:#dc2626;font-weight:800;animation:dhtBlink 1s infinite">🔥 Quá hạn ' + Math.abs(diffDays) + ' ngày</span>';
        } else if (diffDays === 0) {
            return '<span style="color:#d97706;font-weight:800">📦 Hôm nay!</span>';
        } else {
            return '<span style="color:#2563eb;font-weight:700">⏳ Còn ' + diffDays + ' ngày</span>';
        }
    } catch(e) {
        return '<span style="color:#94a3b8">—</span>';
    }
}

function _bpiRender() {
    var all = _bpi.records.slice();
    if (_bpi.search) {
        var q = _bpi.search.toLowerCase();
        all = all.filter(function(r) {
            return (r.product_name||'').toLowerCase().indexOf(q)>=0 
                || (r.cskh_name||'').toLowerCase().indexOf(q)>=0 
                || (r.order_code||'').toLowerCase().indexOf(q)>=0 
                || (r.customer_name||'').toLowerCase().indexOf(q)>=0
                || (r.printer_name||'').toLowerCase().indexOf(q)>=0
                || (r.contractor_name||'').toLowerCase().indexOf(q)>=0;
        });
    }
    
    // Compute stats BEFORE applying statsFilter so numbers match the current view
    var totalCount = all.length;
    var testingCount = all.filter(function(r){
        var isRecent = window._bpiRecentlyCompletedIds && window._bpiRecentlyCompletedIds.indexOf(r.id) !== -1;
        return r.is_test_print && (!r.is_completed || isRecent);
    }).length;
    var pendingCount = all.filter(function(r){
        var isRecent = window._bpiRecentlyCompletedIds && window._bpiRecentlyCompletedIds.indexOf(r.id) !== -1;
        return !r.is_completed || isRecent;
    }).length;
    var doneCount = all.filter(function(r){return r.is_completed;}).length;

    // Apply statsFilter
    if (_bpi.statsFilter === 'testing') {
        all = all.filter(function(r){
            var isRecent = window._bpiRecentlyCompletedIds && window._bpiRecentlyCompletedIds.indexOf(r.id) !== -1;
            return r.is_test_print && (!r.is_completed || isRecent);
        });
    } else if (_bpi.statsFilter === 'pending') {
        all = all.filter(function(r){
            var isRecent = window._bpiRecentlyCompletedIds && window._bpiRecentlyCompletedIds.indexOf(r.id) !== -1;
            return !r.is_completed || isRecent;
        });
    } else if (_bpi.statsFilter === 'done') {
        all = all.filter(function(r){return r.is_completed;});
    }

    var tot=all.length, tp=Math.ceil(tot/_bpi.ps)||1; if(_bpi.page>tp)_bpi.page=tp; if(_bpi.page<1)_bpi.page=1;
    var s=(_bpi.page-1)*_bpi.ps, paged=all.slice(s,s+_bpi.ps);
    // Render rows
    var tb=document.getElementById('bpiTb'); if(!tb)return;
    if(!paged.length){tb.innerHTML='<tr><td colspan="20"><div class="empty-state"><div class="icon">🖨️</div><h3>Chưa có đơn in nào</h3></div></td></tr>';} else {
    tb.innerHTML=paged.map(function(r,i){
        var priority = (r.shipping_priority || 'CHUẨN').toUpperCase();
        var priBadge = '';
        if (priority === 'GẤP') {
            priBadge = '<span style="margin-right: 6px; background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; font-size: 9px; padding: 1px 4px; border-radius: 3px; font-weight: bold; display: inline-block; vertical-align: middle;">Gấp</span>';
        } else if (priority === 'GỬI') {
            priBadge = '<span style="margin-right: 6px; background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; font-size: 9px; padding: 1px 4px; border-radius: 3px; font-weight: bold; display: inline-block; vertical-align: middle;">Gửi</span>';
        } else {
            priBadge = '<span style="margin-right: 6px; background: #f3e8ff; color: #7e22ce; border: 1px solid #d8b4fe; font-size: 9px; padding: 1px 4px; border-radius: 3px; font-weight: bold; display: inline-block; vertical-align: middle;">Chuẩn</span>';
        }
        var tI=r.is_test_print?'🧪':'⬜',tC=r.is_test_print?' on-test':'',tA=r.is_test_print?'undo_test':'start_test';
        var dI=r.is_print_done?'✅':'⬜',dC=r.is_print_done?' on-done':'',dA=r.is_print_done?'undo_done':'print_done';
        
        var isManager = window._currentUser && ['giam_doc', 'quan_ly_xuong', 'quan_ly_cap_cao', 'quan_ly', 'truong_phong'].indexOf(window._currentUser.role) !== -1;
        var errBtnHtml = '';
        if (r.error_reported) {
            if (isManager) {
                errBtnHtml = '<button class="bpi-ib on-err" onclick="_bpiErr(\''+r.id+'\')" title="Báo lỗi tiếp">⚠️</button>';
            } else {
                errBtnHtml = '<span style="font-size:12px;display:inline-block;width:26px;text-align:center;line-height:26px">⚠️</span>';
            }
        } else {
            errBtnHtml = '<button class="bpi-ib" onclick="_bpiErr(\''+r.id+'\')" title="Báo lỗi">⬜</button>';
        }

        var nvName=r.contractor_id?(r.contractor_name?'🏭 '+r.contractor_name:'🏭 Gia công'):(r.printer_name||'—');
        var fieldBadge = '—';
        if (r.print_field) {
            var bg = '#f1f5f9', fg = '#475569';
            var fUpper = r.print_field.toUpperCase();
            if (fUpper.includes('PET')) { bg = '#ede9fe'; fg = '#7c3aed'; }
            else if (fUpper.includes('TEM')) { bg = '#ccfbf1'; fg = '#0d9488'; }
            else if (fUpper.includes('DECAL')) { bg = '#e0f2fe'; fg = '#0369a1'; }
            else if (fUpper.includes('THÊU')) { bg = '#fef3c7'; fg = '#b45309'; }
            else if (fUpper.includes('3D')) { bg = '#dcfce7'; fg = '#15803d'; }
            else if (fUpper.includes('LƯỚI')) { bg = '#fee2e2'; fg = '#b91c1c'; }
            fieldBadge = '<span style="background:'+bg+';color:'+fg+';padding:2px 8px;border-radius:4px;font-size:9px;font-weight:800">'+r.print_field+'</span>';
        }
        var upd=''; if(r.last_update_at){upd=_bpiFD(r.last_update_at); if(r.last_update_by)upd+='<br><span style="color:#7c3aed;font-size:9px">'+r.last_update_by+'</span>';}
        
        // Build the Audit (Kiểm tra) column cell
        var auditCell = '';
        var canAudit = _bpiCanAudit();
        if (canAudit) {
            var aI = r.audit_checked ? '✓' : '⬜';
            var aC = r.audit_checked ? ' on-audit' : '';
            var auditDetails = '';
            if (r.audit_checked && r.audit_checked_by_name) {
                var shName = r.audit_checked_by_name.split(' ').pop(); // last name
                var noteHtml = '';
                if (r.audit_note) {
                    var shNote = r.audit_note.length > 20 ? (r.audit_note.substring(0, 17) + '...') : r.audit_note;
                    noteHtml = '<br><span style="font-style:italic;opacity:0.85" title="' + r.audit_note.replace(/"/g, '&quot;') + '">📝 ' + shNote + '</span>';
                }
                auditDetails = '<div style="font-size:8px;color:#0284c7;margin-top:2px;line-height:1">' + shName + '<br>' + _bpiFT(r.audit_checked_at) + noteHtml + '</div>';
            }
            var titleText = r.audit_checked ? ('Đã kiểm tra: ' + (r.audit_note || '(Không có ghi chú)')) : 'Kiểm tra';
            auditCell = '<td style="text-align:center"><button class="bpi-ib' + aC + '" onclick="_bpiAudit(\'' + r.id + '\')" title="' + titleText + '">' + aI + '</button>' + auditDetails + '</td>';
        } else {
            if (r.audit_checked) {
                var shName = (r.audit_checked_by_name || '').split(' ').pop() || 'Duyệt';
                var noteHtml = '';
                if (r.audit_note) {
                    var shNote = r.audit_note.length > 20 ? (r.audit_note.substring(0, 17) + '...') : r.audit_note;
                    noteHtml = '<br><span style="font-style:italic;opacity:0.85;font-weight:normal" title="' + r.audit_note.replace(/"/g, '&quot;') + '">📝 ' + shNote + '</span>';
                }
                auditCell = '<td style="text-align:center;color:#0284c7;font-weight:700;font-size:9.5px"><span style="background:#e0f2fe;padding:2px 4px;border-radius:4px">✓ ' + shName + '<br>' + _bpiFT(r.audit_checked_at) + noteHtml + '</span></td>';
            } else {
                auditCell = '<td style="text-align:center;color:#94a3b8">—</td>';
            }
        }

        var rollDisplay = '—';
        var parts = [];
        if (r.pettem_roll_id) {
            var typeLabel = r.pettem_roll_type ? r.pettem_roll_type.toUpperCase() : 'PET';
            var formattedType = 'Pet';
            var bg = '#fee2e2';
            var color = '#dc2626';
            var border = '#fca5a5';
            if (typeLabel === 'TEM') {
                formattedType = 'Tem';
                bg = '#f3e8ff';
                color = '#7c3aed';
                border = '#d8b4fe';
            } else if (typeLabel === 'DECAL') {
                formattedType = 'Decal';
                bg = '#d1fae5';
                color = '#059669';
                border = '#6ee7b7';
            } else if (typeLabel !== 'PET') {
                formattedType = typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1).toLowerCase();
                bg = '#f3e8ff';
                color = '#7c3aed';
                border = '#d8b4fe';
            }
            var seqDisplay = r.pettem_roll_seq ? '#' + r.pettem_roll_seq : '#' + r.pettem_roll_id;
            var rollLabel = 'Cây ' + formattedType + ' ' + seqDisplay;
            parts.push('<span style="background:' + bg + ';color:' + color + ';padding:1.5px 5.5px;border-radius:4px;font-size:9px;font-weight:800;border:1px solid ' + border + ';display:inline-block;vertical-align:middle;line-height:1.2" title="' + (r.pettem_roll_notes || '').replace(/"/g, '&quot;') + '">' + rollLabel + '</span>');
        } else if (r.material_tx_id) {
            parts.push('<span style="color:#7c3aed;font-weight:700" title="' + (r.material_roll_notes || '').replace(/"/g, '&quot;') + '">🌀 Lô #' + r.material_tx_id + '</span>');
            if (r.material_roll_supplier) {
                parts.push('<span style="font-size:8px;color:#64748b;display:block">🏭 ' + r.material_roll_supplier.replace(/"/g, '&quot;') + '</span>');
            }
        }
        if (parts.length > 0) {
            rollDisplay = parts.join('');
        }

        var metersCell = '';
        var startCell = '';
        var endCell = '';
        var rollCell = '';
        
        if (r.id) {
            metersCell = '<td style="text-align:center;font-weight:700;color:#dc2626">'+(r.print_meters||'0')+'</td>';
            if (r.material_tx_id || r.pettem_roll_id) {
                rollCell = '<td style="text-align:center;font-weight:600">' + rollDisplay + '</td>';
            } else {
                rollCell = '<td style="text-align:center;font-weight:600;cursor:pointer;text-decoration:underline dashed #cbd5e1" onclick="_bpiEditRollCell(this,\''+r.id+'\',\''+(r.print_field||'')+'\',\''+(r.pettem_roll_id||'')+'\')">' +rollDisplay+'</td>';
            }
            startCell = '<td style="text-align:center;font-weight:600">'+(r.roll_start_qty||'0')+'</td>';
            endCell = '<td style="text-align:center;font-weight:600">'+(r.roll_end_qty||'0')+'</td>';
        } else {
            metersCell = '<td style="text-align:center;color:#94a3b8">—</td>';
            rollCell = '<td style="text-align:center;color:#94a3b8">—</td>';
            startCell = '<td style="text-align:center;color:#94a3b8">—</td>';
            endCell = '<td style="text-align:center;color:#94a3b8">—</td>';
        }

        var imgIcon = '';
        if (r.image_url) {
            imgIcon = ' <a href="' + r.image_url + '" target="_blank" style="margin-left:6px;font-size:12px;text-decoration:none" title="Xem hình ảnh file in">🖼️</a>';
        }
        var printDateVal = '—';
        if (r.contractor_id) {
            if (r.print_date) {
                var fd = _bpiFT(r.print_date);
                var text = 'Bàn giao: ' + fd;
                printDateVal = '<span style="background: #e0f2fe; color: #0369a1; padding: 2px 6px; border-radius: 4px; font-weight: 700; display: inline-block;">' + text + '</span>';
            }
        } else {
            if (r.print_done_at) {
                var text = 'In Xong: ' + _bpiFT(r.print_done_at);
                printDateVal = '<span style="background: #dcfce7; color: #15803d; padding: 2px 6px; border-radius: 4px; font-weight: 700; display: inline-block;">' + text + '</span>';
            }
        }
        var doneBtnHtml = '';
        if (r.contractor_id) {
            doneBtnHtml = '<span style="color:#059669;font-weight:700">✓ Xong</span>';
        } else {
            if (r.is_print_done && !isManager) {
                doneBtnHtml = '<button class="bpi-ib' + dC + '" style="opacity:0.75;cursor:not-allowed" disabled>' + dI + '</button>';
            } else {
                doneBtnHtml = '<button class="bpi-ib' + dC + '" onclick="_bpiTog(\'' + r.id + '\',\'' + dA + '\')" title="In xong">' + dI + '</button>';
            }
        }
        var clickableName = '<span class="bpi-name-link" onclick="_bpiShowDetailModal(\'' + r.id + '\')">' + _bpiGetProductNameDisplay(r) + '</span>';
        return '<tr><td style="text-align:center;font-weight:700;color:#94a3b8">'+(i+1+(_bpi.page-1)*_bpi.ps)+'</td>'
        + auditCell
        +'<td style="text-align:center">'+(r.contractor_id ? '<span style="color:#94a3b8">—</span>' : '<button class="bpi-ib'+tC+'" onclick="_bpiTog(\''+r.id+'\',\''+tA+'\')" title="In test">'+tI+'</button>')+'</td>'
        +'<td style="text-align:center">'+doneBtnHtml+'</td>'
        +'<td style="text-align:center">' + errBtnHtml + '</td>'
        +'<td style="text-align:center">'+fieldBadge+'</td>'
        +'<td style="font-size:10px">'+printDateVal+'</td>'
        +'<td style="font-size:10px;font-weight:600">'+_bpiGetProgressDisplay(r)+'</td>'
        +'<td style="font-size:10px;color:#059669;font-weight:600">'+nvName+'</td>'
        +'<td style="font-weight:600;color:#1e293b">'+priBadge+clickableName+imgIcon+'</td>'
        +'<td style="font-weight:700;color:#e11d48">'+(r.customer_name||'—')+'</td>'
        +'<td style="font-size:10px;color:#0369a1">'+(r.cskh_name||'—')+'</td>'
        +'<td style="text-align:center;font-weight:700;color:'+_bpiGetQtyColor(r)+'">'+_bpiGetQtyDisplay(r)+'</td>'
        + metersCell
        + rollCell
        + startCell
        + endCell
        +'<td style="font-size:9px;color:#6b7280;max-width:80px;overflow:hidden;text-overflow:ellipsis">'+(r.shared_process||'—')+'</td>'
        +'<td style="font-size:9px;color:#6b7280;max-width:80px;overflow:hidden;text-overflow:ellipsis">'+(r.notes||'—')+'</td>'
        +'<td style="font-size:9px;color:#6b7280">'+upd+'</td></tr>';
    }).join(''); }
    // Stats
    var el=document.getElementById('bpiInfo'); if(el){
        var parts=['🖨️ Bộ Phận In']; if(_bpi.filter.year)parts.push('📆 '+_bpi.filter.year); if(_bpi.filter.status==='pending')parts.push('⏳ Chưa in'); else if(_bpi.filter.status==='done')parts.push('✅ Đã in');
        if(_bpi.filter.field)parts.push(_bpi.filter.field);
        el.innerHTML='<div style="display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,#5b21b6,#7c3aed);color:#fff;padding:6px 18px;border-radius:8px;font-size:13px;font-weight:700">'+parts.join(' <span style="opacity:0.5;margin:0 6px">•</span> ')+' — <span style="color:#c4b5fd;font-weight:900">'+tot+'</span> đơn</div>';
    }
    var sc=document.getElementById('bpiStats'); if(sc){
        sc.innerHTML='<div class="bpi-stat-btn' + (_bpi.statsFilter === 'all' ? ' active' : '') + '" onclick="_bpiSetStatsFilter(\'all\')" style="background:linear-gradient(135deg,#7c3aed,#8b5cf6);color:#fff;padding:8px 18px;border-radius:10px;min-width:110px;text-align:center;box-shadow:0 4px 15px rgba(124,58,237,0.3)"><div style="font-size:9px;font-weight:600;opacity:.85;letter-spacing:1px;margin-bottom:2px">📦 TỔNG ĐƠN</div><div style="font-size:15px;font-weight:900">'+totalCount+'</div></div>'
        +'<div class="bpi-stat-btn' + (_bpi.statsFilter === 'testing' ? ' active' : '') + '" onclick="_bpiSetStatsFilter(\'testing\')" style="background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;padding:8px 18px;border-radius:10px;min-width:110px;text-align:center;box-shadow:0 4px 15px rgba(245,158,11,0.3)"><div style="font-size:9px;font-weight:600;opacity:.85;letter-spacing:1px;margin-bottom:2px">🧪 ĐƠN IN TEST</div><div style="font-size:15px;font-weight:900">'+testingCount+'</div></div>'
        +'<div class="bpi-stat-btn' + (_bpi.statsFilter === 'pending' ? ' active' : '') + '" onclick="_bpiSetStatsFilter(\'pending\')" style="background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;padding:8px 18px;border-radius:10px;min-width:110px;text-align:center;box-shadow:0 4px 15px rgba(59,130,246,0.3)"><div style="font-size:9px;font-weight:600;opacity:.85;letter-spacing:1px;margin-bottom:2px">⏳ CHƯA IN XONG</div><div style="font-size:15px;font-weight:900">'+pendingCount+'</div></div>'
        +'<div class="bpi-stat-btn' + (_bpi.statsFilter === 'done' ? ' active' : '') + '" onclick="_bpiSetStatsFilter(\'done\')" style="background:linear-gradient(135deg,#059669,#10b981);color:#fff;padding:8px 18px;border-radius:10px;min-width:110px;text-align:center;box-shadow:0 4px 15px rgba(5,150,105,0.3)"><div style="font-size:9px;font-weight:600;opacity:.85;letter-spacing:1px;margin-bottom:2px">✅ HOÀN THÀNH</div><div style="font-size:15px;font-weight:900">'+doneCount+'</div></div>';
    }
    
    // Render pagination
    var pagEl = document.getElementById('bpiPagination');
    if (!pagEl) {
        var card = document.querySelector('.bpi-main .card');
        if (card) {
            pagEl = document.createElement('div');
            pagEl.id = 'bpiPagination';
            pagEl.style.cssText = 'padding:12px;border-top:1px solid #f1f5f9;display:flex;justify-content:center;align-items:center;gap:16px;background:#fff;border-bottom-left-radius:8px;border-bottom-right-radius:8px';
            card.appendChild(pagEl);
        }
    }
    if (pagEl) {
        if (tp <= 1) {
            pagEl.style.display = 'none';
        } else {
            pagEl.style.display = 'flex';
            pagEl.innerHTML = 
                '<button onclick="_bpiPrevPage()" style="padding:6px 12px;border:1px solid #e2e8f0;border-radius:6px;background:#fff;font-size:11px;font-weight:700;color:#475569;cursor:pointer;transition:all 0.15s' + (_bpi.page === 1 ? ';opacity:0.5;cursor:not-allowed' : '') + '"' + (_bpi.page === 1 ? ' disabled' : '') + '>◀ Trang trước</button>'
                + '<span style="font-size:11px;font-weight:700;color:#1e293b">Trang ' + _bpi.page + ' / ' + tp + '</span>'
                + '<button onclick="_bpiNextPage()" style="padding:6px 12px;border:1px solid #e2e8f0;border-radius:6px;background:#fff;font-size:11px;font-weight:700;color:#475569;cursor:pointer;transition:all 0.15s' + (_bpi.page === tp ? ';opacity:0.5;cursor:not-allowed' : '') + '"' + (_bpi.page === tp ? ' disabled' : '') + '>Trang sau ▶</button>';
        }
    }
}

function _bpiPrevPage() {
    if (_bpi.page > 1) {
        _bpi.page--;
        _bpiRender();
    }
}
function _bpiNextPage() {
    var all = _bpi.records.slice();
    if (_bpi.search) { 
        var q = _bpi.search.toLowerCase(); 
        all = all.filter(function(r) {
            return (r.product_name||'').toLowerCase().indexOf(q)>=0 
                || (r.cskh_name||'').toLowerCase().indexOf(q)>=0 
                || (r.order_code||'').toLowerCase().indexOf(q)>=0 
                || (r.customer_name||'').toLowerCase().indexOf(q)>=0
                || (r.printer_name||'').toLowerCase().indexOf(q)>=0
                || (r.contractor_name||'').toLowerCase().indexOf(q)>=0;
        }); 
    }
    var tp = Math.ceil(all.length / _bpi.ps) || 1;
    if (_bpi.page < tp) {
        _bpi.page++;
        _bpiRender();
    }
}

async function _bpiTog(id, action) {
    var r = _bpi.records.find(function(rec) { return String(rec.id) === String(id); });
    if (!r) return;

    var isManager = window._currentUser && ['giam_doc', 'quan_ly_xuong', 'quan_ly_cap_cao', 'quan_ly', 'truong_phong'].includes(window._currentUser.role);

    if (action === 'undo_done') {
        if (!isManager) {
            showToast('Chỉ Giám đốc hoặc Quản lý mới được phép sửa đổi/báo cáo lại đơn đã in xong!', 'error');
            return;
        }
        var fUpper = (r.print_field || '').toUpperCase();
        var isPetOrTem = fUpper.includes('PET') || fUpper.includes('TEM') || fUpper.includes('DECAL');
        if (isPetOrTem) {
            _bpiShowDoneModal(r);
        } else {
            var inputVal = prompt('Nhập lại số lượng mét in cho đơn hàng này (Nhập 0 nếu bạn muốn HỦY xác nhận in xong):', r.print_meters || 0);
            if (inputVal === null) return;
            var newMeters = Number(inputVal);
            if (isNaN(newMeters) || newMeters < 0) {
                showToast('Số mét in phải là số không âm!', 'error');
                return;
            }
            if (newMeters === 0) {
                if (confirm('Bạn có muốn hủy xác nhận in xong cho đơn này không?')) {
                    try {
                        await apiCall('/api/printing/toggle/'+id,'POST',{action: 'undo_done'});
                        showToast('✅ Đã hủy xác nhận');
                        window._bpiRecentlyCompletedIds = window._bpiRecentlyCompletedIds.filter(function(x) { return String(x) !== String(id); });
                        await _bpiLoadAll();
                    } catch(e) {
                        showToast(e.message||'Lỗi','error');
                    }
                }
            } else {
                try {
                    await apiCall('/api/printing/toggle/'+id,'POST',{action: 'undo_done', print_meters: newMeters});
                    showToast('✅ Đã cập nhật số mét in');
                    await _bpiLoadAll();
                } catch(e) {
                    showToast(e.message||'Lỗi','error');
                }
            }
        }
        return;
    }

    if (action === 'print_done') {
        var fUpper = (r.print_field || '').toUpperCase();
        var isPetOrTem = fUpper.includes('PET') || fUpper.includes('TEM') || fUpper.includes('DECAL');
        if (isPetOrTem) {
            _bpiShowDoneModal(r);
            return;
        }
    }
    try {
        await apiCall('/api/printing/toggle/'+id,'POST',{action});
        showToast('✅ Cập nhật');
        if (action === 'print_done') {
            if (window._bpiRecentlyCompletedIds.indexOf(Number(id)) === -1) {
                window._bpiRecentlyCompletedIds.push(Number(id));
            }
        }
        await _bpiLoadAll();
    } catch(e) {
        showToast(e.message||'Lỗi','error');
    }
}

// Modal functions for printing completion
async function _bpiShowDoneModal(r) {
    var old = document.getElementById('_bpiDoneModal'); if (old) old.remove();

    var printReminders = [];
    var printReminderIds = [];
    var printViewedIds = [];
    if (!r.contractor_id) {
        try {
            var url = '/api/qlx/reminders?order_id=' + r.dht_order_id + '&dept=in&record_type=printing&record_id=' + r.id;
            if (r.order_item_id) url += '&item_id=' + r.order_item_id;
            var remRes = await apiCall(url);
            printReminders = remRes.reminders || [];
            printReminderIds = remRes.reminder_ids || [];
            printViewedIds = remRes.viewed_ids || [];
            
            if (printReminders.length > 0) {
                var cleanAccents = function(str) {
                    if (!str) return '';
                    return str.normalize('NFD')
                              .replace(/[\u0300-\u036f]/g, '')
                              .replace(/đ/g, 'd')
                              .replace(/Đ/g, 'D');
                };
                var allTechs = ['IN PET', 'IN DECAL', 'THÊU', 'IN LƯỚI', 'IN 3D', 'IN KHÁC', 'IN TEM'];
                var currentField = r.print_field || '';
                var filteredRem = [];
                var filteredRemIds = [];
                var filteredVwIds = [];
                
                printReminders.forEach(function(rem, remIdx) {
                    var remId = printReminderIds[remIdx] || 0;
                    var isViewed = printViewedIds.indexOf(remId) >= 0;
                    
                    var matchedField = null;
                    var remLower = rem.toLowerCase();
                    var remClean = cleanAccents(remLower);
                    
                    for (var fIdx = 0; fIdx < allTechs.length; fIdx++) {
                        var f = allTechs[fIdx];
                        var fLower = f.toLowerCase();
                        var fClean = cleanAccents(fLower);
                        
                        if (remLower.indexOf(fLower) >= 0 || remClean.indexOf(fClean) >= 0) {
                            matchedField = f;
                            break;
                        }
                        if (fLower.indexOf('pet') >= 0 && remLower.indexOf('pet') >= 0) { matchedField = f; break; }
                        if (fLower.indexOf('decal') >= 0 && remLower.indexOf('decal') >= 0) { matchedField = f; break; }
                        if (fLower.indexOf('thêu') >= 0 && (remLower.indexOf('thêu') >= 0 || remLower.indexOf('theu') >= 0)) { matchedField = f; break; }
                        if (fLower.indexOf('lưới') >= 0 && (remLower.indexOf('lưới') >= 0 || remLower.indexOf('luoi') >= 0)) { matchedField = f; break; }
                        if (fLower.indexOf('3d') >= 0 && remLower.indexOf('3d') >= 0) { matchedField = f; break; }
                    }
                    
                    var isMatchCurrent = false;
                    if (matchedField) {
                        var currentLower = currentField.toLowerCase();
                        var currentClean = cleanAccents(currentLower);
                        var mClean = cleanAccents(matchedField.toLowerCase());
                        if (currentClean.indexOf(mClean) >= 0 || mClean.indexOf(currentClean) >= 0) {
                            isMatchCurrent = true;
                        }
                    }
                    
                    if (matchedField) {
                        if (isMatchCurrent) {
                            filteredRem.push(rem);
                            filteredRemIds.push(remId);
                            if (isViewed) filteredVwIds.push(remId);
                        }
                    } else {
                        filteredRem.push(rem);
                        filteredRemIds.push(remId);
                        if (isViewed) filteredVwIds.push(remId);
                    }
                });
                
                printReminders = filteredRem;
                printReminderIds = filteredRemIds;
                printViewedIds = filteredVwIds;
            }
        } catch(e) {
            console.error('Lỗi tải nhắc nhở:', e);
        }
    }
    
    var rollType = 'PET';
    var fieldUpper = (r.print_field || '').toUpperCase();
    if (fieldUpper.includes('TEM')) {
        rollType = 'TEM';
    } else if (fieldUpper.includes('DECAL')) {
        rollType = 'DECAL';
    }
    
    var activeRolls = [];
    try {
        var res = await apiCall('/api/pettem/active-rolls?roll_type=' + rollType);
        activeRolls = res.rolls || [];
    } catch (e) {
        showToast('Lỗi tải cây in: ' + e.message, 'error');
    }
    
    // Sort rolls to show active first
    activeRolls = activeRolls.filter(function(x) { return !x.confirmed_by; });

    var isEditing = r.is_print_done;
    if (isEditing && r.pettem_roll_id) {
        var found = activeRolls.some(function(x) { return String(x.id) === String(r.pettem_roll_id); });
        if (!found) {
            activeRolls.unshift({
                id: r.pettem_roll_id,
                roll_type: r.pettem_roll_type || rollType,
                qty_remaining: Number(r.roll_start_qty) || 0
            });
        }
    }

    var opName = window._currentUser ? (window._currentUser.full_name || window._currentUser.username) : 'Nhân viên in';
    var progressHtml = _bpiGetProgressDisplay(r);
    var qtyDisplay = _bpiGetQtyDisplay(r);

    var h = '<div class="bpi-modal-overlay" id="_bpiDoneModal" tabindex="-1" style="outline:none">';
    h += '<div class="bpi-modal" style="width:480px;max-height:95vh;overflow-y:auto;display:flex;flex-direction:column">';
    
    var titleText = isEditing ? 'CẬP NHẬT BÁO CÁO IN XONG' : 'XÁC NHẬN IN XONG';
    h += '<div class="bpi-modal-header" style="background:linear-gradient(135deg,#059669,#10b981)"><div class="m-icon">🖨️</div><div><div class="m-title">' + titleText + '</div><div class="m-sub">' + (r.order_code || '') + '</div></div></div>';
    h += '<div class="bpi-modal-body" style="overflow-y:auto;flex:1;padding:16px 20px">';
    
    h += '<div class="bpi-modal-row"><span class="bpi-modal-lbl">Tên SP/Phối</span><span class="bpi-modal-val">' + _bpiGetProductNameDisplay(r) + '</span></div>';
    h += '<div class="bpi-modal-row"><span class="bpi-modal-lbl">CSKH</span><span class="bpi-modal-val">' + (r.cskh_name || '—') + '</span></div>';
    h += '<div class="bpi-modal-row"><span class="bpi-modal-lbl">Nhân Viên In</span><span class="bpi-modal-val" style="color:#059669;font-weight:700">' + opName + '</span></div>';
    h += '<div class="bpi-modal-row"><span class="bpi-modal-lbl">Tiến Độ</span><span class="bpi-modal-val">' + progressHtml + '</span></div>';
    h += '<div class="bpi-modal-row"><span class="bpi-modal-lbl">Số Lượng Theo Đơn</span><span class="bpi-modal-val" style="font-weight:800;color:#7c3aed">' + qtyDisplay + '</span></div>';
    
    if (printReminders.length > 0) {
        h += '<div style="margin-top:12px;background:#fee2e2;border:1.5px solid #fca5a5;padding:12px 14px;border-radius:12px;">';
        h += '  <div style="font-weight:800;color:#991b1b;font-size:12px;margin-bottom:8px;text-transform:uppercase;display:flex;align-items:center;gap:6px">🔔 QLX NHẮC NHỞ BỘ PHẬN IN:</div>';
        h += '  <div style="display:flex;flex-direction:column;gap:10px">';
        printReminders.forEach(function(rem, remIdx) {
            var remId = printReminderIds[remIdx] || 0;
            var isViewed = printViewedIds.indexOf(remId) >= 0;
            h += '    <div style="display:flex;align-items:center;gap:10px;background:#fff;border:1.5px solid ' + (isViewed ? '#059669' : '#fca5a5') + ';border-radius:10px;padding:10px 12px;transition:all 0.3s">';
            h += '       <input type="checkbox" class="bpi-reminder-cb" data-reminder-id="' + remId + '" ' + (isViewed ? 'checked' : '') + ' style="display:none">';
            h += '       <div style="flex:1;font-size:12px;font-weight:700;color:#7f1d1d;line-height:1.4">' + rem.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</div>';
            if (isViewed) {
                h += '       <button type="button" class="bpi-reminder-btn" data-reminder-id="' + remId + '" onclick="_bpiToggleReminder(this)" style="flex-shrink:0;padding:6px 14px;border-radius:8px;border:1.5px solid #059669;background:#ecfdf5;color:#059669;font-size:11px;font-weight:800;cursor:pointer;display:flex;align-items:center;gap:4px;transition:all 0.2s">✅ Đã Xem và Làm</button>';
            } else {
                h += '       <button type="button" class="bpi-reminder-btn" data-reminder-id="' + remId + '" onclick="_bpiToggleReminder(this)" style="flex-shrink:0;padding:6px 14px;border-radius:8px;border:1.5px solid #dc2626;background:#fee2e2;color:#dc2626;font-size:11px;font-weight:800;cursor:pointer;display:flex;align-items:center;gap:4px;transition:all 0.2s;animation:bpiReminderPulse 2s infinite">👉 Đã Xem và Làm</button>';
            }
            h += '    </div>';
        });
        h += '  </div>';
        h += '</div>';
    }

    // Select roll
    var rollLabel = 'Cây In Pet';
    if (rollType === 'TEM') {
        rollLabel = 'Cây In Tem';
    } else if (rollType === 'DECAL') {
        rollLabel = 'Cây In Decal';
    }
    h += '<div style="margin-top:12px"><label style="display:block;font-size:11px;font-weight:800;color:#475569;text-transform:uppercase;margin-bottom:4px">' + rollLabel + ' <span style="color:#ef4444">*</span></label>';
    h += '<select id="bpiDone_roll_id" onchange="_bpiUpdateDoneMeters()" style="width:100%;padding:8px 12px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:13px;background:#f8fafc">';
    h += '<option value="">-- Chọn ' + rollLabel.toLowerCase() + ' --</option>';
    
    // Auto-select the oldest active roll (FIFO)
    var defaultSelectId = activeRolls.length > 0 ? activeRolls[0].id : '';
    if (isEditing && r.pettem_roll_id) {
        defaultSelectId = r.pettem_roll_id;
    }
    
    activeRolls.forEach(function(roll) {
        var selectedStr = String(roll.id) === String(defaultSelectId) ? ' selected' : '';
        var typeLabel = roll.roll_type ? roll.roll_type.toUpperCase() : 'PET';
        h += '<option value="' + roll.id + '"' + selectedStr + '>Cây ' + typeLabel + ' #' + roll.id + ' (Tồn: ' + Number(roll.qty_remaining).toFixed(2) + 'm)</option>';
    });
    h += '</select></div>';
    
    // Qty start & meters
    h += '<div style="margin-top:12px;display:grid;grid-template-columns:1fr 1fr;gap:12px">';
    h += '<div><label style="display:block;font-size:11px;font-weight:800;color:#475569;text-transform:uppercase;margin-bottom:4px">SL Đầu Cuộn (m)</label>';
    h += '<input type="text" id="bpiDone_start_qty" readonly value="0" style="width:100%;padding:8px 12px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:13px;background:#f1f5f9;font-weight:700">';
    h += '</div>';
    
    var initMeters = isEditing ? (r.print_meters || '') : '';
    h += '<div><label style="display:block;font-size:11px;font-weight:800;color:#475569;text-transform:uppercase;margin-bottom:4px">Số Mét In (m) <span style="color:#ef4444">*</span></label>';
    h += '<input type="number" id="bpiDone_meters" step="any" min="0.01" value="' + initMeters + '" oninput="_bpiUpdateDoneMeters()" style="width:100%;padding:8px 12px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:13px;font-weight:700;color:#ef4444" placeholder="Nhập số mét...">';
    h += '</div>';
    h += '</div>';
    
    // Qty end
    h += '<div style="margin-top:12px"><label style="display:block;font-size:11px;font-weight:800;color:#475569;text-transform:uppercase;margin-bottom:4px">SL Cuối Cuộn (m)</label>';
    h += '<input type="text" id="bpiDone_end_qty" readonly value="0" style="width:100%;padding:8px 12px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:13px;background:#f1f5f9;font-weight:700">';
    h += '<div id="bpiDone_warning" style="display:none;color:#dc2626;font-size:11px;font-weight:700;margin-top:4px"></div>';
    h += '</div>';
    
    // Image upload / paste area
    h += '<div style="margin-top:12px"><label style="display:block;font-size:11px;font-weight:800;color:#475569;text-transform:uppercase;margin-bottom:4px">Hình Ảnh File In <span style="color:#ef4444">*</span></label>';
    h += '<div style="border:1.5px dashed #059669;border-radius:10px;padding:16px 20px;text-align:center;background:rgba(5,150,105,0.03);color:#059669;font-size:13px;font-weight:700;">';
    h += '    Bấm <span style="background:#059669;color:#fff;padding:2px 8px;border-radius:4px;font-family:monospace;font-size:12px;font-weight:800">Ctrl + V</span> để dán ảnh';
    h += '</div>';
    h += '<input type="file" id="bpiDone_file_input" accept="image/*" onchange="_bpiDoneHandleFileSelect(event)" style="display:none">';
    
    var initImgUrl = isEditing ? (r.image_url || '') : '';
    h += '<input type="hidden" id="bpiDone_image_url" value="' + initImgUrl + '">';
    var initPreview = '';
    if (isEditing && r.image_url) {
        initPreview = '<div style="position:relative;display:inline-block">' +
            '<img src="' + r.image_url + '" style="max-width:150px;max-height:150px;object-fit:cover;border-radius:8px;border:1px solid #cbd5e1;margin-top:6px">' +
            '<span onclick="_bpiDoneRemoveImage()" style="position:absolute;top:2px;right:-4px;background:#ef4444;color:#fff;border-radius:50%;width:18px;height:18px;font-size:11px;font-weight:900;text-align:center;line-height:18px;cursor:pointer;box-shadow:0 1px 4px rgba(0,0,0,0.2)">×</span>' +
            '</div>';
    }
    h += '<div id="bpiDone_preview_zone" style="text-align:center;margin-top:8px">' + initPreview + '</div>';
    h += '</div>';
    
    h += '</div>'; // End body
    
    h += '<div class="bpi-modal-actions" style="margin-top:0">';
    h += '<button class="bpi-modal-btn cancel" onclick="_bpiCloseDoneModal()">Hủy</button>';
    var btnText = isEditing ? '✅ CẬP NHẬT' : '✅ HOÀN THÀNH';
    h += '<button class="bpi-modal-btn confirm" id="_bpiDoneSubmitBtn" disabled style="background:linear-gradient(135deg,#059669,#10b981);opacity:0.5" onclick="_bpiSubmitDone(\'' + r.id + '\')">' + btnText + '</button>';
    h += '</div>';
    
    h += '</div></div>';
    document.body.insertAdjacentHTML('beforeend', h);
    
    // Setup paste listener
    window._bpiDoneHandlePaste = function(e) {
        if (!document.getElementById('_bpiDoneModal')) return;
        var items = (e.clipboardData || e.originalEvent.clipboardData).items;
        for (var i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') === 0) {
                e.preventDefault();
                var blob = items[i].getAsFile();
                _bpiDoneProcessAndUpload(blob);
                break;
            }
        }
    };
    window.addEventListener('paste', window._bpiDoneHandlePaste);
    
    // Store active rolls locally
    window._bpiActiveRolls = activeRolls;
    
    // Trigger initial calculation
    _bpiUpdateDoneMeters();
    
    requestAnimationFrame(function() {
        var m = document.getElementById('_bpiDoneModal');
        if (m) {
            m.classList.add('show');
            m.focus();
        }
    });
}

function _bpiToggleReminder(btn) {
    var remId = btn.getAttribute('data-reminder-id');
    var cb = document.querySelector('.bpi-reminder-cb[data-reminder-id="' + remId + '"]');
    if (!cb) return;
    
    var isNowChecked = !cb.checked;
    cb.checked = isNowChecked;
    
    var card = btn.closest('div[style*="display:flex;align-items:center"]');
    
    if (isNowChecked) {
        btn.innerHTML = '✅ Đã Xem và Làm';
        btn.style.border = '1.5px solid #059669';
        btn.style.background = '#ecfdf5';
        btn.style.color = '#059669';
        btn.style.animation = 'none';
        if (card) card.style.borderColor = '#059669';
    } else {
        btn.innerHTML = '👉 Đã Xem và Làm';
        btn.style.border = '1.5px solid #dc2626';
        btn.style.background = '#fee2e2';
        btn.style.color = '#dc2626';
        btn.style.animation = 'bpiReminderPulse 2s infinite';
        if (card) card.style.borderColor = '#fca5a5';
    }
    
    _bpiUpdateDoneMeters();
}

// Add CSS animation for reminder pulse
(function() {
    if (document.getElementById('bpiReminderStyles')) return;
    var style = document.createElement('style');
    style.id = 'bpiReminderStyles';
    style.textContent = '@keyframes bpiReminderPulse { 0%,100%{transform:scale(1);box-shadow:0 0 0 0 rgba(220,38,38,0.4)} 50%{transform:scale(1.05);box-shadow:0 0 0 8px rgba(220,38,38,0)} }';
    document.head.appendChild(style);
})();

function _bpiCloseDoneModal() {
    var m = document.getElementById('_bpiDoneModal');
    if (m) { m.classList.remove('show'); setTimeout(function() { m.remove(); }, 300); }
    if (window._bpiDoneHandlePaste) {
        window.removeEventListener('paste', window._bpiDoneHandlePaste);
        window._bpiDoneHandlePaste = null;
    }
}

function _bpiUpdateDoneMeters() {
    var selectEl = document.getElementById('bpiDone_roll_id');
    var startEl = document.getElementById('bpiDone_start_qty');
    var metersEl = document.getElementById('bpiDone_meters');
    var endEl = document.getElementById('bpiDone_end_qty');
    var confirmBtn = document.getElementById('_bpiDoneSubmitBtn');
    
    if (!selectEl || !startEl || !metersEl || !endEl) return;
    
    var rollId = selectEl.value;
    if (!rollId) {
        startEl.value = '0';
        endEl.value = '0';
        confirmBtn.disabled = true;
        confirmBtn.style.opacity = '0.5';
        return;
    }
    
    var selectedRoll = (window._bpiActiveRolls || []).find(function(x) { return String(x.id) === String(rollId); });
    var qtyStart = selectedRoll ? Number(selectedRoll.qty_remaining) : 0;
    startEl.value = qtyStart.toFixed(2);
    
    var metersVal = Number(metersEl.value) || 0;
    var qtyEnd = qtyStart - metersVal;
    endEl.value = qtyEnd.toFixed(2);
    
    var warnEl = document.getElementById('bpiDone_warning');
    if (qtyEnd < 0) {
        endEl.style.color = '#dc2626';
        if (warnEl) {
            warnEl.style.display = 'block';
            warnEl.textContent = '⚠️ Số lượng cuối cuộn bị âm! Không cho phép in quá tồn kho.';
        }
        confirmBtn.disabled = true;
        confirmBtn.style.opacity = '0.5';
    } else {
        endEl.style.color = '#059669';
        if (warnEl) {
            warnEl.style.display = 'none';
        }
        
        var imgUrl = document.getElementById('bpiDone_image_url')?.value;
        var reminderCbs = document.querySelectorAll('.bpi-reminder-cb');
        var allRemindersChecked = true;
        for (var i = 0; i < reminderCbs.length; i++) {
            if (!reminderCbs[i].checked) {
                allRemindersChecked = false;
                break;
            }
        }
        // Update reminder count indicator
        var totalRem = reminderCbs.length;
        var checkedRem = 0;
        for (var i = 0; i < reminderCbs.length; i++) { if (reminderCbs[i].checked) checkedRem++; }
        var remCountEl = document.getElementById('_bpiRemCount');
        if (!remCountEl && totalRem > 0) {
            var remSection = document.querySelector('.bpi-reminder-btn');
            if (remSection) {
                var parent = remSection.closest('div[style*="margin-top:12px"]');
                if (parent) {
                    var countDiv = document.createElement('div');
                    countDiv.id = '_bpiRemCount';
                    countDiv.style.cssText = 'margin-top:8px;text-align:center;font-size:11px;font-weight:800';
                    parent.appendChild(countDiv);
                    remCountEl = countDiv;
                }
            }
        }
        if (remCountEl) {
            if (allRemindersChecked) {
                remCountEl.innerHTML = '<span style="color:#059669">✅ Đã xem tất cả ' + totalRem + ' nhắc nhở</span>';
            } else {
                remCountEl.innerHTML = '<span style="color:#dc2626">⚠️ Còn ' + (totalRem - checkedRem) + '/' + totalRem + ' nhắc nhở chưa xem</span>';
            }
        }

        if (metersVal > 0 && imgUrl && allRemindersChecked) {
            confirmBtn.disabled = false;
            confirmBtn.style.opacity = '1';
        } else {
            confirmBtn.disabled = true;
            confirmBtn.style.opacity = '0.5';
        }
    }
}

function _bpiDoneTriggerUpload() {
    var input = document.getElementById('bpiDone_file_input');
    if (input) input.click();
}

function _bpiDoneHandleFileSelect(e) {
    var file = e.target.files[0];
    if (file) {
        _bpiDoneProcessAndUpload(file);
    }
}

function _bpiDoneProcessAndUpload(file) {
    var previewZone = document.getElementById('bpiDone_preview_zone');
    if (previewZone) previewZone.innerHTML = '<div style="font-size:11px;color:#059669;font-weight:700">⏳ Đang nén và tải lên...</div>';
    
    _bpiCompressImage(file, async function(compressedDataURL) {
        if (!compressedDataURL) {
            if (previewZone) previewZone.innerHTML = '<div style="font-size:11px;color:#ef4444">❌ Không nén được ảnh</div>';
            return;
        }
        try {
            var blob = _bpiDataURLtoBlob(compressedDataURL);
            var fd = new FormData();
            fd.append('file', blob, 'print_file_' + Date.now() + '.jpg');
            
            var response = await fetch('/api/import/upload-image', { method: 'POST', body: fd, credentials: 'include' });
            var data = await response.json();
            if (data.success) {
                var imgUrlInput = document.getElementById('bpiDone_image_url');
                if (imgUrlInput) imgUrlInput.value = data.url;
                
                if (previewZone) {
                    previewZone.innerHTML = '<div style="position:relative;display:inline-block">' +
                        '<img src="' + data.url + '" style="max-width:150px;max-height:150px;object-fit:cover;border-radius:8px;border:1px solid #cbd5e1;margin-top:6px">' +
                        '<span onclick="_bpiDoneRemoveImage()" style="position:absolute;top:2px;right:-4px;background:#ef4444;color:#fff;border-radius:50%;width:18px;height:18px;font-size:11px;font-weight:900;text-align:center;line-height:18px;cursor:pointer;box-shadow:0 1px 4px rgba(0,0,0,0.2)">×</span>' +
                        '</div>';
                }
                _bpiUpdateDoneMeters();
            } else {
                if (previewZone) previewZone.innerHTML = '<div style="font-size:11px;color:#ef4444">❌ Lỗi: ' + (data.error || 'không rõ') + '</div>';
            }
        } catch (err) {
            if (previewZone) previewZone.innerHTML = '<div style="font-size:11px;color:#ef4444">❌ Lỗi tải lên</div>';
            showToast(err.message, 'error');
        }
    });
}

function _bpiDoneRemoveImage() {
    var imgUrlInput = document.getElementById('bpiDone_image_url');
    if (imgUrlInput) imgUrlInput.value = '';
    var previewZone = document.getElementById('bpiDone_preview_zone');
    if (previewZone) previewZone.innerHTML = '';
    _bpiUpdateDoneMeters();
}

async function _bpiSubmitDone(id) {
    var selectEl = document.getElementById('bpiDone_roll_id');
    var metersEl = document.getElementById('bpiDone_meters');
    var startEl = document.getElementById('bpiDone_start_qty');
    var endEl = document.getElementById('bpiDone_end_qty');
    var imgUrlEl = document.getElementById('bpiDone_image_url');
    var confirmBtn = document.getElementById('_bpiDoneSubmitBtn');
    
    if (!selectEl || !metersEl || !imgUrlEl) return;

    var reminderCbs = document.querySelectorAll('.bpi-reminder-cb');
    for (var i = 0; i < reminderCbs.length; i++) {
        if (!reminderCbs[i].checked) {
            showToast('Bạn phải tích chọn Đã Xem Nhắc Nhở cho tất cả các dòng nhắc nhở bộ phận in!', 'error');
            return;
        }
    }
    
    var rollId = selectEl.value;
    var metersVal = Number(metersEl.value);
    var startQty = Number(startEl.value) || 0;
    var endQty = Number(endEl.value) || 0;
    var imageUrl = imgUrlEl.value;
    
    if (!rollId) {
        var rollType = 'PET';
        var r = _bpi.records.find(function(x) { return x.id == id; });
        if (r) {
            var fieldUpper = (r.print_field || '').toUpperCase();
            if (fieldUpper.includes('TEM') || fieldUpper.includes('DECAL')) {
                rollType = 'TEM';
            }
        }
        showToast('Vui lòng chọn cây in ' + (rollType === 'TEM' ? 'Tem' : 'Pet') + '!', 'error');
        return;
    }
    if (isNaN(metersVal) || metersVal <= 0) {
        showToast('Số mét in phải lớn hơn 0!', 'error');
        return;
    }
    if (endQty < 0) {
        showToast('Số lượng cuối cuộn không được phép âm!', 'error');
        return;
    }
    if (!imageUrl) {
        showToast('Vui lòng tải lên hoặc dán hình ảnh file in!', 'error');
        return;
    }
    
    if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.textContent = '⏳ Đang lưu...';
    }
    
    try {
        await apiCall('/api/printing/toggle/' + id, 'POST', {
            action: 'print_done',
            pettem_roll_id: rollId,
            roll_start_qty: startQty,
            print_meters: metersVal,
            roll_end_qty: endQty,
            image_url: imageUrl
        });
        
        // Save viewed reminders
        var viewedReminderIds = [];
        var reminderCbs2 = document.querySelectorAll('.bpi-reminder-cb');
        for (var j = 0; j < reminderCbs2.length; j++) {
            if (reminderCbs2[j].checked) {
                var remId = reminderCbs2[j].getAttribute('data-reminder-id');
                if (remId && remId !== '0') viewedReminderIds.push(Number(remId));
            }
        }
        if (viewedReminderIds.length > 0) {
            try {
                await apiCall('/api/qlx/reminders/viewed', 'POST', {
                    reminder_ids: viewedReminderIds,
                    record_type: 'printing',
                    record_id: Number(id)
                });
            } catch(ve) { console.error('Lỗi lưu trạng thái xem nhắc nhở:', ve); }
        }
        
        if (window._bpiRecentlyCompletedIds.indexOf(Number(id)) === -1) {
            window._bpiRecentlyCompletedIds.push(Number(id));
        }
        showToast('✅ Đã xác nhận in xong');
        _bpiCloseDoneModal();
        await _bpiLoadAll();
    } catch (e) {
        showToast(e.message || 'Lỗi', 'error');
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.textContent = '✅ HOÀN THÀNH';
        }
    }
}

window._bpiCloseDetailModal = function() {
    var m = document.getElementById('_bpiDetailModal');
    if (m) {
        m.classList.remove('show');
        setTimeout(function() { m.remove(); }, 300);
    }
};

window._bpiShowDetailModal = async function(id) {
    var old = document.getElementById('_bpiDetailModal');
    if (old) old.remove();
    
    var r = _bpi.records.find(function(x) { return String(x.id) === String(id); });
    if (!r) {
        showToast('Không tìm thấy bản ghi!', 'error');
        return;
    }
    
    var printReminders = [];
    var printReminderIds = [];
    var printViewedIds = [];
    if (!r.contractor_id) {
        try {
            var url = '/api/qlx/reminders?order_id=' + r.dht_order_id + '&dept=in&record_type=printing&record_id=' + r.id;
            if (r.order_item_id) url += '&item_id=' + r.order_item_id;
            var remRes = await apiCall(url);
            printReminders = remRes.reminders || [];
            printReminderIds = remRes.reminder_ids || [];
            printViewedIds = remRes.viewed_ids || [];
            
            if (printReminders.length > 0) {
                var cleanAccents = function(str) {
                    if (!str) return '';
                    return str.normalize('NFD')
                              .replace(/[\u0300-\u036f]/g, '')
                              .replace(/đ/g, 'd')
                              .replace(/Đ/g, 'D');
                };
                var allTechs = ['IN PET', 'IN DECAL', 'THÊU', 'IN LƯỚI', 'IN 3D', 'IN KHÁC', 'IN TEM'];
                var currentField = r.print_field || '';
                var filteredRem = [];
                var filteredRemIds = [];
                var filteredVwIds = [];
                
                printReminders.forEach(function(rem, remIdx) {
                    var remId = printReminderIds[remIdx] || 0;
                    var isViewed = printViewedIds.indexOf(remId) >= 0;
                    
                    var matchedField = null;
                    var remLower = rem.toLowerCase();
                    var remClean = cleanAccents(remLower);
                    
                    for (var fIdx = 0; fIdx < allTechs.length; fIdx++) {
                        var f = allTechs[fIdx];
                        var fLower = f.toLowerCase();
                        var fClean = cleanAccents(fLower);
                        
                        if (remLower.indexOf(fLower) >= 0 || remClean.indexOf(fClean) >= 0) {
                            matchedField = f;
                            break;
                        }
                        if (fLower.indexOf('pet') >= 0 && remLower.indexOf('pet') >= 0) { matchedField = f; break; }
                        if (fLower.indexOf('decal') >= 0 && remLower.indexOf('decal') >= 0) { matchedField = f; break; }
                        if (fLower.indexOf('thêu') >= 0 && (remLower.indexOf('thêu') >= 0 || remLower.indexOf('theu') >= 0)) { matchedField = f; break; }
                        if (fLower.indexOf('lưới') >= 0 && (remLower.indexOf('lưới') >= 0 || remLower.indexOf('luoi') >= 0)) { matchedField = f; break; }
                        if (fLower.indexOf('3d') >= 0 && remLower.indexOf('3d') >= 0) { matchedField = f; break; }
                    }
                    
                    var isMatchCurrent = false;
                    if (matchedField) {
                        var currentLower = currentField.toLowerCase();
                        var currentClean = cleanAccents(currentLower);
                        var mClean = cleanAccents(matchedField.toLowerCase());
                        if (currentClean.indexOf(mClean) >= 0 || mClean.indexOf(currentClean) >= 0) {
                            isMatchCurrent = true;
                        }
                    }
                    
                    if (matchedField) {
                        if (isMatchCurrent) {
                            filteredRem.push(rem);
                            filteredRemIds.push(remId);
                            if (isViewed) filteredVwIds.push(remId);
                        }
                    } else {
                        filteredRem.push(rem);
                        filteredRemIds.push(remId);
                        if (isViewed) filteredVwIds.push(remId);
                    }
                });
                
                printReminders = filteredRem;
                printReminderIds = filteredRemIds;
                printViewedIds = filteredVwIds;
            }
        } catch(e) {
            console.error('Lỗi tải nhắc nhở:', e);
        }
    }
    
    var rollDisp = '—';
    if (r.pettem_roll_id) {
        var typeLabel = r.pettem_roll_type ? r.pettem_roll_type.toUpperCase() : 'PET';
        var seqDisplay = r.pettem_roll_seq ? '#' + r.pettem_roll_seq : '#' + r.pettem_roll_id;
        rollDisp = 'Cây ' + typeLabel + ' ' + seqDisplay;
    } else if (r.material_tx_id) {
        rollDisp = 'Lô #' + r.material_tx_id;
        if (r.material_roll_supplier) {
            rollDisp += ' (' + r.material_roll_supplier + ')';
        }
    }
    
    var rollType = 'PET';
    var fieldUpper = (r.print_field || '').toUpperCase();
    if (fieldUpper.includes('TEM')) {
        rollType = 'TEM';
    } else if (fieldUpper.includes('DECAL')) {
        rollType = 'DECAL';
    }
    var rollLabel = 'Cây In Pet';
    if (rollType === 'TEM') {
        rollLabel = 'Cây In Tem';
    } else if (rollType === 'DECAL') {
        rollLabel = 'Cây In Decal';
    }

    var progressHtml = _bpiGetProgressDisplay(r);
    var qtyDisplay = _bpiGetQtyDisplay(r);
    var opName = r.printer_name || (r.contractor_name ? 'Gia công: ' + r.contractor_name : '—');
    
    var h = '<div class="bpi-modal-overlay" id="_bpiDetailModal" tabindex="-1" style="outline:none">';
    h += '<div class="bpi-modal" style="width:480px;max-height:95vh;overflow-y:auto;display:flex;flex-direction:column">';
    h += '<div class="bpi-modal-header" style="background:linear-gradient(135deg,#0284c7,#0ea5e9)"><div class="m-icon">🖨️</div><div><div class="m-title">CHI TIẾT BÁO CÁO IN XONG</div><div class="m-sub">' + (r.order_code || '') + '</div></div></div>';
    h += '<div class="bpi-modal-body" style="overflow-y:auto;flex:1;padding:16px 20px">';
    
    h += '<div class="bpi-modal-row"><span class="bpi-modal-lbl">Tên SP/Phối</span><span class="bpi-modal-val">' + _bpiGetProductNameDisplay(r) + '</span></div>';
    h += '<div class="bpi-modal-row"><span class="bpi-modal-lbl">CSKH</span><span class="bpi-modal-val">' + (r.cskh_name || '—') + '</span></div>';
    h += '<div class="bpi-modal-row"><span class="bpi-modal-lbl">Nhân Viên In</span><span class="bpi-modal-val" style="color:#0284c7;font-weight:700">' + opName + '</span></div>';
    h += '<div class="bpi-modal-row"><span class="bpi-modal-lbl">Tiến Độ</span><span class="bpi-modal-val">' + progressHtml + '</span></div>';
    h += '<div class="bpi-modal-row"><span class="bpi-modal-lbl">Số Lượng Theo Đơn</span><span class="bpi-modal-val" style="font-weight:800;color:#7c3aed">' + qtyDisplay + '</span></div>';
    
    if (printReminders.length > 0) {
        h += '<div style="margin-top:12px;background:#fee2e2;border:1.5px solid #fca5a5;padding:12px 14px;border-radius:12px;">';
        h += '  <div style="font-weight:800;color:#991b1b;font-size:12px;margin-bottom:8px;text-transform:uppercase;display:flex;align-items:center;gap:6px">🔔 QLX NHẮC NHỞ BỘ PHẬN IN:</div>';
        h += '  <div style="display:flex;flex-direction:column;gap:10px">';
        printReminders.forEach(function(rem, remIdx) {
            var remId = printReminderIds[remIdx] || 0;
            var isViewed = printViewedIds.indexOf(remId) >= 0;
            h += '    <div style="display:flex;align-items:center;gap:10px;background:#fff;border:1.5px solid ' + (isViewed ? '#059669' : '#fca5a5') + ';border-radius:10px;padding:10px 12px;">';
            h += '       <div style="flex:1;font-size:12px;font-weight:700;color:#7f1d1d;line-height:1.4">' + rem.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</div>';
            if (isViewed) {
                h += '       <span style="flex-shrink:0;padding:4px 10px;border-radius:6px;border:1px solid #059669;background:#ecfdf5;color:#059669;font-size:11px;font-weight:800">✅ Đã Xem và Làm</span>';
            } else {
                h += '       <span style="flex-shrink:0;padding:4px 10px;border-radius:6px;border:1px solid #dc2626;background:#fee2e2;color:#dc2626;font-size:11px;font-weight:800">❌ Chưa Xem</span>';
            }
            h += '    </div>';
        });
        h += '  </div>';
        h += '</div>';
    }
    
    h += '<div style="margin-top:12px"><label style="display:block;font-size:11px;font-weight:800;color:#475569;text-transform:uppercase;margin-bottom:4px">' + rollLabel + '</label>';
    h += '<input type="text" readonly value="' + rollDisp + '" style="width:100%;padding:8px 12px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:13px;background:#f1f5f9;font-weight:700" disabled>';
    h += '</div>';
    
    h += '<div style="margin-top:12px;display:grid;grid-template-columns:1fr 1fr;gap:12px">';
    h += '<div><label style="display:block;font-size:11px;font-weight:800;color:#475569;text-transform:uppercase;margin-bottom:4px">SL Đầu Cuộn (m)</label>';
    h += '<input type="text" readonly value="' + (r.roll_start_qty || '0') + '" style="width:100%;padding:8px 12px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:13px;background:#f1f5f9;font-weight:700" disabled>';
    h += '</div>';
    h += '<div><label style="display:block;font-size:11px;font-weight:800;color:#475569;text-transform:uppercase;margin-bottom:4px">Số Mét In (m)</label>';
    h += '<input type="text" readonly value="' + (r.print_meters || '0') + '" style="width:100%;padding:8px 12px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:13px;font-weight:700;color:#ef4444;background:#f1f5f9" disabled>';
    h += '</div>';
    h += '</div>';
    
    h += '<div style="margin-top:12px"><label style="display:block;font-size:11px;font-weight:800;color:#475569;text-transform:uppercase;margin-bottom:4px">SL Cuối Cuộn (m)</label>';
    h += '<input type="text" readonly value="' + (r.roll_end_qty || '0') + '" style="width:100%;padding:8px 12px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:13px;background:#f1f5f9;font-weight:700" disabled>';
    h += '</div>';
    
    h += '<div style="margin-top:12px"><label style="display:block;font-size:11px;font-weight:800;color:#475569;text-transform:uppercase;margin-bottom:4px">Hình Ảnh File In</label>';
    if (r.image_url) {
        h += '<div style="text-align:center;margin-top:8px">';
        h += '  <a href="' + r.image_url + '" target="_blank">';
        h += '    <img src="' + r.image_url + '" style="max-width:100%;max-height:200px;object-fit:contain;border-radius:8px;border:1px solid #cbd5e1;box-shadow:0 2px 10px rgba(0,0,0,0.1);">';
        h += '  </a>';
        h += '  <div style="font-size:11px;color:#64748b;margin-top:4px">Bấm vào ảnh để xem kích thước đầy đủ</div>';
        h += '</div>';
    } else {
        h += '<div style="border:1.5px dashed #cbd5e1;border-radius:10px;padding:16px 20px;text-align:center;background:#f8fafc;color:#64748b;font-size:13px;font-weight:600;">';
        h += '    Không có hình ảnh báo cáo';
        h += '</div>';
    }
    h += '</div>';
    
    h += '</div>';
    h += '<div class="bpi-modal-actions" style="margin-top:0">';
    h += '<button class="bpi-modal-btn cancel" onclick="_bpiCloseDetailModal()" style="width:100%;background:#475569;color:#fff">Đóng</button>';
    h += '</div>';
    h += '</div></div>';
    
    document.body.insertAdjacentHTML('beforeend', h);
    requestAnimationFrame(function() {
        var m = document.getElementById('_bpiDetailModal');
        if (m) {
            m.classList.add('show');
            m.focus();
        }
    });
};

async function _bpiAudit(id) {
    var r = _bpi.records.find(function(item) { return item.id == id; });
    if (!r) {
        showToast('Không tìm thấy bản ghi', 'error');
        return;
    }
    
    // Create audit modal HTML
    var h = '<div class="bpi-modal-overlay" id="_bpiAuditModal" tabindex="-1" style="outline:none">';
    h += '<div class="bpi-modal" style="width:400px;max-height:95vh;overflow-y:auto;display:flex;flex-direction:column">';
    h += '<div class="bpi-modal-header" style="background:linear-gradient(135deg,#0284c7,#0ea5e9)"><div class="m-icon">🔍</div><div><div class="m-title">KIỂM TRA ĐƠN IN</div><div class="m-sub">' + (r.order_code || '') + '</div></div></div>';
    h += '<div class="bpi-modal-body" style="overflow-y:auto;flex:1;padding:16px 20px">';
    
    h += '<div style="font-size:12px;color:#475569;margin-bottom:12px;line-height:1.5">';
    h += '<div><strong>Mã đơn hàng:</strong> ' + (r.order_code || '') + '</div>';
    h += '<div><strong>Sản phẩm/Phối:</strong> ' + (r.product_name || '') + '</div>';
    if (r.audit_checked) {
        h += '<div><strong>Trạng thái:</strong> <span style="color:#059669;font-weight:700">✓ Đã kiểm tra</span></div>';
        h += '<div><strong>Người kiểm tra:</strong> ' + (r.audit_checked_by_name || '') + '</div>';
        h += '<div><strong>Thời gian:</strong> ' + _bpiFT(r.audit_checked_at) + '</div>';
    } else {
        h += '<div><strong>Trạng thái:</strong> <span style="color:#64748b">Chưa kiểm tra</span></div>';
    }
    h += '</div>';
    
    h += '<div style="margin-top:12px"><label style="display:block;font-size:11px;font-weight:800;color:#475569;text-transform:uppercase;margin-bottom:4px">Nội Dung Ghi Chú <span style="color:#ef4444">*</span></label>';
    h += '<textarea id="bpiAudit_note" style="width:100%;height:100px;padding:8px 12px;border:1px solid #cbd5e1;border-radius:6px;font-size:13px;resize:none" placeholder="Nhập ghi chú kiểm tra...">' + (r.audit_note || '') + '</textarea>';
    h += '</div>';
    
    h += '</div>'; // End body
    
    h += '<div class="bpi-modal-footer" style="padding:12px 20px;border-top:1px solid #e2e8f0;display:flex;justify-content:flex-end;gap:8px;background:#f8fafc">';
    h += '<button class="bpi-btn" onclick="_bpiCloseAuditModal()" style="background:#e2e8f0;color:#475569">Đóng</button>';
    if (r.audit_checked) {
        h += '<button class="bpi-btn" id="_bpiCancelAuditBtn" onclick="_bpiSubmitAudit(\'' + id + '\', true)" style="background:#ef4444;color:#fff">Hủy kiểm tra</button>';
    }
    h += '<button class="bpi-btn" id="_bpiSaveAuditBtn" onclick="_bpiSubmitAudit(\'' + id + '\', false)" style="background:#0284c7;color:#fff;font-weight:700">💾 LƯU</button>';
    h += '</div>'; // End footer
    
    h += '</div></div>';
    
    document.body.insertAdjacentHTML('beforeend', h);
    
    requestAnimationFrame(function() {
        var m = document.getElementById('_bpiAuditModal');
        if (m) {
            m.classList.add('show');
            m.focus();
            var txt = document.getElementById('bpiAudit_note');
            if (txt) {
                txt.focus();
                // move cursor to end of text
                var val = txt.value;
                txt.value = '';
                txt.value = val;
            }
        }
    });
}

function _bpiCloseAuditModal() {
    var m = document.getElementById('_bpiAuditModal');
    if (m) { m.classList.remove('show'); setTimeout(function() { m.remove(); }, 300); }
}

async function _bpiSubmitAudit(id, cancel) {
    var note = '';
    if (!cancel) {
        var noteEl = document.getElementById('bpiAudit_note');
        note = noteEl ? noteEl.value.trim() : '';
        if (!note) {
            showToast('Vui lòng nhập ghi chú kiểm tra', 'error');
            return;
        }
    }
    
    var btnSave = document.getElementById('_bpiSaveAuditBtn');
    var btnCancel = document.getElementById('_bpiCancelAuditBtn');
    if (btnSave) btnSave.disabled = true;
    if (btnCancel) btnCancel.disabled = true;
    
    try {
        await apiCall('/api/printing/records/' + id + '/audit', 'POST', {
            audit_note: note,
            cancel: !!cancel
        });
        showToast(cancel ? '↩️ Đã hủy trạng thái kiểm tra' : '✅ Đã lưu kết quả kiểm tra');
        _bpiCloseAuditModal();
        await _bpiLoadAll();
    } catch(e) {
        showToast(e.message || 'Lỗi', 'error');
        if (btnSave) btnSave.disabled = false;
        if (btnCancel) btnCancel.disabled = false;
    }
}
function _bpiErr(id) { _bpiReportError(id); }

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
        ov.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(15,23,42,0.6);backdrop-filter:blur(4px);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding-top:40px;overflow-y:auto;animation:qlxFadeIn .2s;transition:opacity .25s ease';
        ov.id = '_bpiConOverlay';
        ov.innerHTML = '<div style="background:#fff;border-radius:16px;width:650px;max-width:95vw;max-height:85vh;overflow-y:auto;box-shadow:0 25px 50px rgba(0,0,0,0.25);animation:qlxSlideUp .3s;margin-bottom:40px">' + html + '</div>';
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

// ========== MANAGE PRINT FIELDS & STAFF ==========
var _bpFields = [];
var _bpSelFieldId = null;

async function _bpiManageFields() {
    try {
        var res = await apiCall('/api/printing/fields');
        _bpFields = res.fields || [];
        if (_bpFields.length && !_bpSelFieldId) {
            _bpSelFieldId = _bpFields[0].id;
        }
        _bpiRenderFieldsModal();
    } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
}

async function _bpiRenderFieldsModal() {
    var html = '<div style="padding:20px;font-family:\'Inter\',sans-serif">';
    html += '<h3 style="margin:0 0 16px;color:#0f172a;display:flex;align-items:center;gap:8px">⚙️ Quản Lý Lĩnh Vực In & Nhân Sự</h3>';
    
    html += '<div style="display:flex;gap:20px;min-height:450px">';
    
    // LEFT PANEL: Fields List
    html += '<div style="width:250px;border-right:1px solid #e2e8f0;padding-right:16px;display:flex;flex-direction:column">';
    html += '<div style="font-weight:800;font-size:12px;color:#475569;margin-bottom:8px">LĨNH VỰC IN</div>';
    
    // Add new field input
    html += '<div style="display:flex;gap:4px;margin-bottom:12px">';
    html += '<input id="_bpNewFieldName" placeholder="Tên lĩnh vực..." style="flex:1;padding:6px 10px;border:1.5px solid #e2e8f0;border-radius:6px;font-size:11px">';
    html += '<button onclick="_bpiFieldAdd()" style="padding:6px 12px;background:#0ea5e9;color:#fff;border:none;border-radius:6px;font-weight:700;font-size:11px;cursor:pointer">Thêm</button>';
    html += '</div>';
    
    html += '<div style="flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:6px">';
    if (_bpFields.length) {
        _bpFields.forEach(function(f) {
            var activeStyle = f.id === _bpSelFieldId 
                ? 'background:#e0f2fe;color:#0369a1;border-color:#bae6fd;font-weight:700' 
                : 'background:#f8fafc;color:#334155;border-color:#e2e8f0';
            html += '<div onclick="_bpiSelectField(' + f.id + ')" style="padding:8px 12px;border:1px solid;border-radius:8px;font-size:12px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;transition:all .15s;' + activeStyle + '">';
            html += '<span>🎨 ' + f.name + '</span>';
            html += '<button onclick="event.stopPropagation();_bpiFieldDel(' + f.id + ')" style="padding:2px 6px;background:none;border:none;color:#ef4444;cursor:pointer;font-size:10px" title="Xóa">🗑️</button>';
            html += '</div>';
        });
    } else {
        html += '<div style="text-align:center;padding:20px;color:#94a3b8;font-size:11px">Chưa có lĩnh vực nào</div>';
    }
    html += '</div>';
    html += '</div>';
    
    // RIGHT PANEL: Operator Config
    html += '<div style="flex:1;display:flex;flex-direction:column" id="_bpFieldOpsContainer">';
    html += '<div style="text-align:center;padding:60px 20px;color:#94a3b8;font-size:12px">Đang tải cấu hình nhân sự...</div>';
    html += '</div>';
    
    html += '</div>'; // close display flex
    
    html += '<div style="padding:16px 0 0;text-align:right;border-top:1px solid #e2e8f0;margin-top:16px"><button onclick="document.getElementById(\'_bpFieldsOverlay\').remove()" style="padding:8px 20px;background:#f1f5f9;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;color:#475569">Đóng</button></div>';
    html += '</div>';

    var old = document.getElementById('_bpFieldsOverlay'); if (old) old.remove();
    var ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(15,23,42,0.6);backdrop-filter:blur(4px);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding-top:40px;overflow-y:auto;animation:qlxFadeIn .2s;transition:opacity .25s ease';
    ov.id = '_bpFieldsOverlay';
    ov.innerHTML = '<div style="background:#fff;border-radius:16px;width:750px;max-width:95vw;max-height:90vh;overflow-y:auto;box-shadow:0 25px 50px rgba(0,0,0,0.25);animation:qlxSlideUp .3s;margin-bottom:40px">' + html + '</div>';
    document.body.appendChild(ov);
    
    if (_bpSelFieldId) {
        _bpiLoadFieldOperators(_bpSelFieldId);
    }
}

function _bpiSelectField(id) {
    _bpSelFieldId = id;
    _bpiRenderFieldsModal();
}

async function _bpiFieldAdd() {
    var name = (document.getElementById('_bpNewFieldName') || {}).value || '';
    if (!name.trim()) return showToast('Nhập tên lĩnh vực', 'error');
    try {
        var displayOrder = _bpFields.length;
        await apiCall('/api/printing/fields', 'POST', { name: name.trim(), display_order: displayOrder });
        showToast('✅ Đã thêm Lĩnh Vực In');
        _bpiManageFields();
    } catch(e) { showToast(e.message, 'error'); }
}

async function _bpiFieldDel(id) {
    if (!confirm('Xóa Lĩnh Vực In này? Tất cả phân công liên quan sẽ bị ảnh hưởng.')) return;
    try {
        await apiCall('/api/printing/fields/' + id, 'DELETE');
        showToast('✅ Đã xóa');
        if (_bpSelFieldId === id) _bpSelFieldId = null;
        _bpiManageFields();
    } catch(e) { showToast(e.message, 'error'); }
}

async function _bpiLoadFieldOperators(fieldId) {
    var container = document.getElementById('_bpFieldOpsContainer');
    if (!container) return;
    try {
        var res = await apiCall('/api/printing/fields/' + fieldId + '/operators');
        var staff = res.staff || [];
        var contractors = res.contractors || [];
        var assigned = res.assigned || [];
        
        var isAssigned = function(type, id) {
            return assigned.some(function(a) { return a.operator_type === type && a.operator_id === id; });
        };
        
        var selectedField = _bpFields.find(function(f) { return f.id === fieldId; });
        var fieldName = selectedField ? selectedField.name : '';
        
        var h = '<div style="font-weight:800;font-size:12px;color:#475569;margin-bottom:12px">CẤU HÌNH NHÂN SỰ CHO: <span style="color:#0ea5e9">' + fieldName + '</span></div>';
        
        h += '<div style="flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:16px;padding-right:8px;max-height:350px">';
        
        // Staff Section
        h += '<div>';
        h += '<div style="font-weight:700;font-size:11px;color:#64748b;margin-bottom:8px;background:#f8fafc;padding:4px 8px;border-radius:4px">👤 NHÂN VIÊN PHÒNG IN</div>';
        if (staff.length) {
            h += '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px">';
            staff.forEach(function(s) {
                var ch = isAssigned('user', s.id) ? 'checked' : '';
                h += '<label style="display:flex;align-items:center;gap:8px;font-size:12px;cursor:pointer;padding:4px;border-radius:4px;transition:background .15s" onmouseover="this.style.background=\'#f1f5f9\'" onmouseout="this.style.background=\'transparent\'">';
                h += '<input type="checkbox" class="_bpOpCheck" data-type="user" data-id="' + s.id + '" ' + ch + ' style="cursor:pointer">';
                h += '<span>' + s.full_name + '</span>';
                h += '</label>';
            });
            h += '</div>';
        } else {
            h += '<div style="color:#94a3b8;font-size:11px;padding-left:8px">Không có nhân viên trong Phòng In</div>';
        }
        h += '</div>';
        
        // Contractors Section
        h += '<div>';
        h += '<div style="font-weight:700;font-size:11px;color:#64748b;margin-bottom:8px;background:#f8fafc;padding:4px 8px;border-radius:4px">🏭 BÊN GIA CÔNG IN</div>';
        if (contractors.length) {
            h += '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px">';
            contractors.forEach(function(c) {
                var ch = isAssigned('contractor', c.id) ? 'checked' : '';
                h += '<label style="display:flex;align-items:center;gap:8px;font-size:12px;cursor:pointer;padding:4px;border-radius:4px;transition:background .15s" onmouseover="this.style.background=\'#f1f5f9\'" onmouseout="this.style.background=\'transparent\'">';
                h += '<input type="checkbox" class="_bpOpCheck" data-type="contractor" data-id="' + c.id + '" ' + ch + ' style="cursor:pointer">';
                h += '<span>🏭 ' + c.name + '</span>';
                h += '</label>';
            });
            h += '</div>';
        } else {
            h += '<div style="color:#94a3b8;font-size:11px;padding-left:8px">Không có nhà gia công in nào. Hãy tạo ở "Quản Lý Gia Công In"</div>';
        }
        h += '</div>';
        
        h += '</div>'; // close scroll container
        
        // Save button
        h += '<div style="margin-top:auto;padding-top:12px;border-top:1px solid #f1f5f9;text-align:right">';
        h += '<button onclick="_bpiSaveFieldOperators(' + fieldId + ')" style="padding:8px 24px;background:linear-gradient(135deg,#059669,#10b981);color:#fff;border:none;border-radius:8px;font-weight:700;font-size:12px;cursor:pointer;box-shadow:0 2px 6px rgba(16,185,129,0.2)">💾 Lưu Cấu Hình</button>';
        h += '</div>';
        
        container.innerHTML = h;
    } catch(e) { container.innerHTML = '<div style="color:#ef4444;text-align:center;padding:40px;font-size:12px">Lỗi: ' + e.message + '</div>'; }
}

async function _bpiSaveFieldOperators(fieldId) {
    var checks = document.querySelectorAll('._bpOpCheck');
    var operators = [];
    checks.forEach(function(ch) {
        if (ch.checked) {
            operators.push({
                operator_type: ch.getAttribute('data-type'),
                operator_id: Number(ch.getAttribute('data-id'))
            });
        }
    });
    
    try {
        await apiCall('/api/printing/fields/' + fieldId + '/operators', 'POST', { operators: operators });
        showToast('✅ Đã lưu cấu hình nhân sự');
        _bpiLoadFieldOperators(fieldId);
    } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
}

// ========== REPORT ERROR MODAL ==========
async function _bpiReportError(recordId) {
    if (window._bpiBusy) return;
    window._bpiBusy = true;

    try {
        var r = _bpi.records.find(function(x) { return x.id == recordId; });
        if (!r) { showToast('Không tìm thấy đơn in', 'error'); window._bpiBusy = false; return; }

        var ce = await apiCall('/api/common-errors-tpl');
        var commonErrors = ce.items || [];

        var old = document.getElementById('_bpiErrorModal'); if (old) old.remove();

        var printerName = window._currentUser ? (window._currentUser.username || window._currentUser.full_name) : 'Nhân viên in';
        var reporterName = 'Người Báo Lỗi: Bộ Phận In - ' + printerName;
        var saleName = r.cskh_name || '—';

        window._bpiErrorImages = [];

        var h = '<div class="bpi-modal-overlay" id="_bpiErrorModal">';
        h += '<div class="bpi-modal" style="width:520px;max-height:95vh;overflow-y:auto;display:flex;flex-direction:column">';
        h += '<div class="bpi-modal-header" style="background:linear-gradient(135deg,#7c3aed,#9333ea)"><div class="m-icon">🚨</div><div><div class="m-title">BÁO ĐƠN LỖI</div><div class="m-sub">' + (r.order_code || '') + '</div></div></div>';
        h += '<div class="bpi-modal-body" style="overflow-y:auto;flex:1;padding:16px 20px">';

        h += '<div class="bpi-modal-row"><span class="bpi-modal-lbl">📋 Mã Đơn</span><span class="bpi-modal-val" style="font-weight:700">' + (r.order_code || '—') + '</span></div>';
        h += '<div class="bpi-modal-row"><span class="bpi-modal-lbl">👤 Khách Hàng</span><span class="bpi-modal-val" style="font-weight:700">' + (r.customer_name || '—') + '</span></div>';
        h += '<div class="bpi-modal-row"><span class="bpi-modal-lbl">💼 CSKH</span><span class="bpi-modal-val" style="font-weight:700">' + saleName + '</span></div>';
        h += '<div class="bpi-modal-row"><span class="bpi-modal-lbl">📦 SL Sản Xuất</span><span class="bpi-modal-val" style="font-weight:700;color:#059669">' + (r.order_quantity || 0) + '</span></div>';
        h += '<div class="bpi-modal-row"><span class="bpi-modal-lbl">✍️ Người Báo Lỗi</span><span class="bpi-modal-val" style="font-weight:700;color:#7c3aed">' + reporterName + '</span></div>';

        h += '<div style="display:none"><label style="display:block;font-size:11px;font-weight:800;color:#475569;text-transform:uppercase;margin-bottom:6px">Lỗi Thường Gặp</label>';
        h += '<select id="bpiE_common" style="width:100%;padding:8px 12px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:13px;background:#f8fafc">';
        h += '<option value="">-- Chọn loại lỗi (nếu có) --</option>';
        commonErrors.forEach(function(ce){
            h += '<option value="' + ce.error_name + '">' + ce.error_name + '</option>';
        });
        h += '</select></div>';

        h += '<div style="margin-top:12px"><label style="display:block;font-size:11px;font-weight:800;color:#475569;text-transform:uppercase;margin-bottom:6px">Số Lượng Lỗi <span style="color:#ef4444">*</span></label>';
        h += '<input type="number" id="bpiE_qty" min="1" max="' + (r.order_quantity || 9999) + '" value="" style="width:100%;padding:8px 12px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:13px;font-weight:800;color:#dc2626" placeholder="Nhập số lượng lỗi...">';
        h += '</div>';

        h += '<div style="margin-top:12px"><label style="display:block;font-size:11px;font-weight:800;color:#475569;text-transform:uppercase;margin-bottom:6px">Nội Dung Chi Tiết <span style="color:#ef4444">*</span></label>';
        h += '<textarea id="bpiE_content" rows="3" style="width:100%;padding:8px 12px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:12px;font-family:inherit" placeholder="Mô tả chi tiết lỗi..."></textarea>';
        h += '</div>';

        h += '<div style="margin-top:12px"><label style="display:block;font-size:11px;font-weight:800;color:#475569;text-transform:uppercase;margin-bottom:6px">📷 Hình Ảnh Minh Họa <span style="color:#ef4444">*</span></label>';
        h += '<div style="border:1.5px dashed #7c3aed;border-radius:10px;padding:16px 20px;text-align:center;background:rgba(124,58,237,0.03);color:#7c3aed;font-size:13px;font-weight:700;">';
        h += '    Bấm <span style="background:#7c3aed;color:#fff;padding:2px 8px;border-radius:4px;font-family:monospace;font-size:12px;font-weight:800">Ctrl + V</span> tại bất kỳ đâu trên trang này để dán ảnh';
        h += '</div>';
        h += '<div id="bpiE_previews" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px"></div>';
        h += '</div>';

        h += '<div style="margin-top:12px"><label style="display:block;font-size:11px;font-weight:800;color:#475569;text-transform:uppercase;margin-bottom:6px">🎥 Video Minh Họa (Không bắt buộc)</label>';
        h += '<input type="file" id="bpiE_video" accept="video/*" style="font-size:11px;width:100%">';
        h += '</div>';

        h += '</div>';

        h += '<div class="bpi-modal-actions" style="margin-top:0">';
        h += '<button class="bpi-modal-btn cancel" onclick="_bpiCloseErrorModal()">Hủy</button>';
        h += '<button class="bpi-modal-btn confirm" id="_bpiErrorSubmitBtn" style="background:linear-gradient(135deg,#7c3aed,#9333ea)" onclick="_bpiSubmitError(\'' + recordId + '\')">🚨 BÁO LỖI</button>';
        h += '</div>';

        h += '</div></div>';
        document.body.insertAdjacentHTML('beforeend', h);
        requestAnimationFrame(function() { document.getElementById('_bpiErrorModal').classList.add('show'); });

        _bpiSetupPasteListener();
        window._bpiBusy = false;
    } catch(e) {
        showToast('Lỗi: ' + e.message, 'error');
        window._bpiBusy = false;
    }
}

function _bpiCloseErrorModal() {
    var m = document.getElementById('_bpiErrorModal');
    if (m) { m.classList.remove('show'); setTimeout(function() { m.remove(); }, 300); }
    if (window._bpiPasteHandler) {
        window.removeEventListener('paste', window._bpiPasteHandler);
        window._bpiPasteHandler = null;
    }
}

function _bpiAddErrorImage(file) {
    _bpiCompressImage(file, function(compressed) {
        if (!compressed) return;
        window._bpiErrorImages.push(compressed);
        _bpiRenderErrorImagePreviews();
    });
}

function _bpiRenderErrorImagePreviews() {
    var area = document.getElementById('bpiE_previews');
    if (!area) return;
    var h = '';
    window._bpiErrorImages.forEach(function(imgData, index) {
        h += '<div style="position:relative;display:inline-block">';
        h += '<img src="' + imgData + '" style="width:70px;height:70px;object-fit:cover;border-radius:6px;border:1px solid #cbd5e1">';
        h += '<span onclick="_bpiRemoveErrorImage(' + index + ')" style="position:absolute;top:-4px;right:-4px;background:#ef4444;color:#fff;border-radius:50%;width:16px;height:16px;font-size:10px;font-weight:900;text-align:center;line-height:16px;cursor:pointer;box-shadow:0 1px 4px rgba(0,0,0,0.2)">×</span>';
        h += '</div>';
    });
    area.innerHTML = h;
}

function _bpiRemoveErrorImage(index) {
    window._bpiErrorImages.splice(index, 1);
    _bpiRenderErrorImagePreviews();
}

function _bpiSetupPasteListener() {
    if (window._bpiPasteHandler) {
        window.removeEventListener('paste', window._bpiPasteHandler);
    }
    window._bpiPasteHandler = function(e) {
        if (!document.getElementById('_bpiErrorModal')) return;
        var items = (e.clipboardData || e.originalEvent.clipboardData).items;
        for (var i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') === 0) {
                var blob = items[i].getAsFile();
                _bpiAddErrorImage(blob);
            }
        }
    };
    window.addEventListener('paste', window._bpiPasteHandler);
}

function _bpiDataURLtoBlob(dataurl) {
    var arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
        bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], {type:mime});
}

function _bpiCompressImage(file, callback) {
    if (!file) return callback(null);
    var reader = new FileReader();
    reader.onload = function(e) {
        var img = new Image();
        img.onload = function() {
            var canvas = document.createElement('canvas');
            var maxWidth = 1000;
            var maxHeight = 1000;
            var width = img.width;
            var height = img.height;

            if (width > height) {
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width = Math.round((width * maxHeight) / height);
                    height = maxHeight;
                }
            }

            canvas.width = width;
            canvas.height = height;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            var compressed = canvas.toDataURL('image/jpeg', 0.7);
            callback(compressed);
        };
        img.onerror = function() {
            callback(e.target.result);
        };
        img.src = e.target.result;
    };
    reader.onerror = function() {
        callback(null);
    };
    reader.readAsDataURL(file);
}

async function _bpiSubmitError(recordId) {
    if (window._bpiSubmitBusy) return;

    var qtyEl = document.getElementById('bpiE_qty');
    var qty = Number(qtyEl.value) || 0;
    if (qty <= 0) { showToast('Vui lòng nhập số lượng lỗi hợp lệ!', 'error'); return; }

    var contentEl = document.getElementById('bpiE_content');
    var content = contentEl.value.trim();
    if (!content) { showToast('Vui lòng nhập chi tiết nội dung lỗi!', 'error'); return; }

    if (!window._bpiErrorImages || window._bpiErrorImages.length === 0) {
        showToast('Vui lòng dán hoặc chọn ít nhất 1 hình ảnh minh họa bắt buộc!', 'error');
        return;
    }

    window._bpiSubmitBusy = true;
    var btn = document.getElementById('_bpiErrorSubmitBtn');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Đang gửi...'; }

    try {
        var r = _bpi.records.find(function(x) { return x.id == recordId; });
        if (!r) { throw new Error('Không tìm thấy record gốc'); }

        var today = new Date().toISOString().split('T')[0];
        if (typeof vnNow === 'function') {
            var n = vnNow();
            today = n.getFullYear() + '-' + String(n.getMonth()+1).padStart(2,'0') + '-' + String(n.getDate()).padStart(2,'0');
        }

        var printerName = window._currentUser ? (window._currentUser.username || window._currentUser.full_name) : 'Nhân viên in';
        var reporterName = 'Người Báo Lỗi: Bộ Phận In - ' + printerName;

        var body = {
            report_date: today,
            common_error_type: document.getElementById('bpiE_common') ? document.getElementById('bpiE_common').value : '',
            order_code: r.order_code,
            cskh_name: reporterName,
            error_quantity: qty,
            error_content: content,
            dht_order_id: r.dht_order_id,
            customer_name: r.customer_name,
            production_quantity: r.order_quantity,
            linh_vuc: r.print_field,
            error_department: 'In',
            error_type: 'Nội Bộ'
        };

        var result = await apiCall('/api/customer-errors', 'POST', body);
        if (result.error) { throw new Error(result.error); }

        if (window._bpiErrorImages && window._bpiErrorImages.length > 0 && result.id) {
            var fd = new FormData();
            window._bpiErrorImages.forEach(function(imgData, index) {
                var blob = _bpiDataURLtoBlob(imgData);
                fd.append('file_' + index, blob, 'image_' + index + '.jpeg');
            });
            await fetch('/api/customer-errors/' + result.id + '/images', { method: 'POST', body: fd });
        }

        var videoInput = document.getElementById('bpiE_video');
        if (videoInput && videoInput.files.length > 0 && result.id) {
            var fdv = new FormData();
            fdv.append('video', videoInput.files[0]);
            await fetch('/api/customer-errors/' + result.id + '/video', { method: 'POST', body: fdv });
        }

        await apiCall('/api/printing/toggle/' + recordId, 'POST', { action: 'report_error', error_order_id: result.id });

        showToast('✅ Đã báo đơn lỗi thành công!');
        _bpiCloseErrorModal();
        await _bpiLoadAll();
    } catch(e) {
        showToast('Lỗi: ' + e.message, 'error');
        if (btn) { btn.disabled = false; btn.textContent = '🚨 BÁO LỖI'; }
    } finally {
        window._bpiSubmitBusy = false;
    }
}

window._bpiEditCell = function(cell, id, field, val, type) {
    if (cell.querySelector('input')) return; // already editing
    var input = document.createElement('input');
    input.type = type || 'text';
    input.value = val || '';
    input.style.width = '70px';
    input.style.fontSize = '11px';
    input.style.padding = '2px';
    input.style.textAlign = 'center';
    
    var originalHTML = cell.innerHTML;
    cell.innerHTML = '';
    cell.appendChild(input);
    input.focus();
    
    var save = async function() {
        var newVal = input.value.trim();
        if (newVal === String(val)) {
            cell.innerHTML = originalHTML;
            return;
        }
        try {
            await apiCall('/api/printing/records/' + id + '/field', 'PATCH', { field: field, value: newVal });
            showToast('✅ Đã lưu');
            await _bpiLoadAll();
        } catch(e) {
            showToast(e.message || 'Lỗi', 'error');
            cell.innerHTML = originalHTML;
        }
    };
    
    input.onblur = save;
    input.onkeydown = function(e) {
        if (e.key === 'Enter') save();
        if (e.key === 'Escape') cell.innerHTML = originalHTML;
    };
};

window._bpiEditRollCell = async function(cell, id, printField, selectedRollId) {
    if (cell.querySelector('select')) return; // already editing
    
    var rollType = 'PET';
    var fieldUpper = (printField || '').toUpperCase();
    if (fieldUpper.includes('TEM')) {
        rollType = 'TEM';
    } else if (fieldUpper.includes('DECAL')) {
        rollType = 'DECAL';
    }
    
    try {
        var res = await apiCall('/api/pettem/active-rolls?roll_type=' + rollType);
        var rolls = res.rolls || [];
        
        var select = document.createElement('select');
        select.style.fontSize = '11px';
        select.style.width = '140px';
        
        var optNone = document.createElement('option');
        optNone.value = '';
        optNone.textContent = '— Chọn cây vật liệu —';
        select.appendChild(optNone);
        
        rolls.forEach(function(r) {
            var opt = document.createElement('option');
            opt.value = r.id;
            var typeLabel = r.roll_type ? r.roll_type.toUpperCase() : 'PET';
            opt.textContent = 'Cây ' + typeLabel + ' #' + r.id + ' (Còn ' + Number(r.qty_remaining).toFixed(2) + 'm)' + (r.confirmed_by ? ' [ĐÃ CHỐT]' : '');
            if (String(r.id) === String(selectedRollId)) {
                opt.selected = true;
            }
            select.appendChild(opt);
        });
        
        var originalHTML = cell.innerHTML;
        cell.innerHTML = '';
        cell.appendChild(select);
        select.focus();
        
        var save = async function() {
            var newVal = select.value;
            if (newVal === String(selectedRollId)) {
                cell.innerHTML = originalHTML;
                return;
            }
            try {
                await apiCall('/api/printing/records/' + id + '/field', 'PATCH', { field: 'pettem_roll_id', value: newVal || null });
                showToast('✅ Đã chọn cây vật liệu');
                await _bpiLoadAll();
            } catch(e) {
                showToast(e.message || 'Lỗi', 'error');
                cell.innerHTML = originalHTML;
            }
        };
        
        select.onblur = save;
        select.onchange = save;
        select.onkeydown = function(e) {
            if (e.key === 'Escape') cell.innerHTML = originalHTML;
        };
    } catch(e) {
        showToast('Lỗi tải danh sách cây vật liệu: ' + e.message, 'error');
    }
};
