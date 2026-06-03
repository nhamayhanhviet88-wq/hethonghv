// ========== BỘ PHẬN CẮT — Desktop SPA Page ==========
var _bpc = { records: [], tree: null, unassignedOrders: [], filter: { year: null, month: null, cutter_id: null, status: null, view: 'records' }, search: '', page: 1, pageSize: 100 };
var _bpcOpen = {};

function _bpcFmtKg(val) {
    if (val === null || val === undefined || val === '' || val === '—') return '—';
    var str = String(val).replace(',', '.');
    var num = Number(str);
    if (isNaN(num)) return val;
    var parts = str.split('.');
    if (parts.length > 1 && parts[1].length > 0) {
        return parts[0] + '.' + parts[1].substring(0, 1);
    }
    return parts[0];
}


function renderBophancatPage(content) {
    if (!document.getElementById('_bpcFontLink')) {
        var fl = document.createElement('link'); fl.id = '_bpcFontLink'; fl.rel = 'stylesheet';
        fl.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@500;600;700;800;900&display=swap';
        document.head.appendChild(fl);
    }
    if (!document.getElementById('_bpcStyles')) {
        var st = document.createElement('style'); st.id = '_bpcStyles';
        st.textContent = '.bpc-wrap{display:flex;height:calc(100vh - 60px);overflow:hidden}'
+'.bpc-sidebar{width:270px;min-width:270px;background:#fff;border-right:1px solid var(--gray-200);overflow-y:auto;position:relative}'
+'.bpc-main{flex:1;min-width:0;display:flex;flex-direction:column;overflow-y:auto;padding:16px}.bpc-main>*{flex-shrink:0}.bpc-main .card{overflow:visible}'
+'.bpc-sb-title{font-size:13px;font-weight:800;padding:16px;border-bottom:1px solid var(--gray-200);text-align:center;position:relative;overflow:hidden}'
+'.bpc-sb-title::before{content:"";position:absolute;top:-50%;left:-50%;width:200%;height:200%;background:linear-gradient(45deg,transparent 30%,rgba(239,68,68,0.08) 50%,transparent 70%);animation:bpcShimmer 3s infinite}'
+'@keyframes bpcShimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}'
+'.bpc-sb-total{background:linear-gradient(135deg,#dc2626,#ef4444,#f87171);color:#fff;padding:12px 16px;font-size:13px;font-weight:800;display:flex;justify-content:space-between;cursor:pointer;position:relative;overflow:hidden}'
+'.bpc-sb-total::after{content:"";position:absolute;top:0;left:-100%;width:60%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent);animation:bpcGlow 2.5s infinite}'
+'@keyframes bpcGlow{0%{left:-100%}100%{left:150%}}'
+'.bpc-sb-uncut{background:linear-gradient(135deg,#f97316,#fb923c);color:#fff;padding:10px 16px;font-size:12px;font-weight:800;display:flex;justify-content:space-between;align-items:center;cursor:pointer;border-bottom:1px solid rgba(0,0,0,0.1);animation:bpcPulse 2.5s infinite}'
+'@keyframes bpcPulse{0%,100%{box-shadow:inset 0 0 0 0 rgba(255,255,255,0)}50%{box-shadow:inset 0 0 20px 0 rgba(255,255,255,0.15)}}'
+'.bpc-sb-uncut.active{background:linear-gradient(135deg,#ea580c,#c2410c)}'
+'.bpc-sb-year{padding:8px 16px;font-weight:800;font-size:12px;color:var(--navy);cursor:pointer;display:flex;justify-content:space-between;align-items:center;background:#f8fafc;border-bottom:1px solid var(--gray-200);transition:all 0.15s}'
+'.bpc-sb-year:hover{background:#f1f5f9}.bpc-sb-year.active{background:#fee2e2;color:#dc2626}'
+'.bpc-sb-cutter{padding:6px 16px 6px 28px;font-size:11px;font-weight:700;cursor:pointer;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #f0f0f0;color:#dc2626}'
+'.bpc-sb-cutter:hover{background:#fef2f2}.bpc-sb-cutter.active{background:#fee2e2;font-weight:800}'
+'.bpc-sb-sub{padding:5px 16px 5px 42px;font-size:10px;font-weight:600;cursor:pointer;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #fafafa;color:#64748b}'
+'.bpc-sb-sub:hover{background:#fef2f2}.bpc-sb-sub.active{background:#fee2e2;color:#dc2626;font-weight:800}'
+'.bpc-sb-sub.incomplete{color:#f59e0b;font-weight:700}'
+'.bpc-icon-btn{width:26px;height:26px;border-radius:6px;border:1.5px solid #e2e8f0;background:#fff;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;font-size:12px;transition:all .15s;margin:0 1px}'
+'.bpc-icon-btn:hover{transform:scale(1.15);box-shadow:0 2px 8px rgba(0,0,0,0.12)}'
+'.bpc-icon-btn.on-cut{background:#dcfce7;border-color:#22c55e}'
+'.bpc-icon-btn.on-done{background:#dbeafe;border-color:#3b82f6}'
+'.bpc-icon-btn.on-sal{background:#fef3c7;border-color:#f59e0b}'
+'.bpc-icon-btn.on-wash{background:#e0e7ff;border-color:#6366f1}'
+'.bpc-icon-btn.on-err{background:#fee2e2;border-color:#ef4444}'
+'.bpc-claim-btn{padding:7px 16px;border:none;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;transition:all .2s;white-space:nowrap;font-family:"Inter",system-ui,sans-serif;letter-spacing:0.3px}'
+'.bpc-claim-btn.ready{background:linear-gradient(135deg,#059669,#10b981);color:#fff;box-shadow:0 3px 10px rgba(16,185,129,0.3)}'
+'.bpc-claim-btn.ready:hover{transform:translateY(-1px);box-shadow:0 5px 15px rgba(16,185,129,0.4)}'
+'.bpc-claim-btn.disabled{background:#f8fafc;color:#64748b;cursor:not-allowed;border:1.5px solid #e2e8f0;font-weight:600}'
+'.bpc-modal-overlay{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(15,23,42,0.6);backdrop-filter:blur(6px);z-index:9999;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .25s ease}'
+'.bpc-modal-overlay.show{opacity:1}'
+'.bpc-modal{background:#fff;border-radius:16px;width:460px;max-width:92vw;box-shadow:0 25px 60px rgba(0,0,0,0.25);transform:scale(0.85);transition:transform .3s cubic-bezier(0.34,1.56,0.64,1);overflow:hidden}'
+'.bpc-modal-overlay.show .bpc-modal{transform:scale(1)}'
+'.bpc-modal-header{background:linear-gradient(135deg,#059669,#10b981);color:#fff;padding:18px 24px;display:flex;align-items:center;gap:12px}'
+'.bpc-modal-header .m-icon{font-size:28px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.2))}'
+'.bpc-modal-header .m-title{font-size:16px;font-weight:800;letter-spacing:0.3px;font-family:Inter,system-ui,sans-serif}'
+'.bpc-modal-header .m-sub{font-size:11px;opacity:0.85;margin-top:2px}'
+'.bpc-modal-body{padding:20px 24px}'
+'.bpc-modal-row{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f1f5f9;font-family:Inter,system-ui,sans-serif}'
+'.bpc-modal-row:last-child{border-bottom:none}'
+'.bpc-modal-lbl{font-size:12px;color:#64748b;font-weight:600}'
+'.bpc-modal-val{font-size:13px;color:#1e293b;font-weight:700;text-align:right;max-width:60%}'
+'.bpc-modal-phoi{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:10px 14px;margin-top:10px}'
+'.bpc-modal-phoi-title{font-size:10px;font-weight:700;color:#059669;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px}'
+'.bpc-modal-phoi-item{display:flex;justify-content:space-between;align-items:center;padding:4px 0;font-size:12px}'
+'.bpc-modal-phoi-item .p-name{color:#1e293b;font-weight:600;flex:1}'
+'.bpc-modal-phoi-item .p-mat{color:#64748b;font-size:11px}'
+'.bpc-modal-actions{display:flex;gap:10px;padding:16px 24px;border-top:1px solid #f1f5f9}'
+'.bpc-modal-btn{flex:1;padding:12px;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;font-family:Inter,system-ui,sans-serif;transition:all .15s}'
+'.bpc-modal-btn.confirm{background:linear-gradient(135deg,#059669,#10b981);color:#fff;box-shadow:0 4px 15px rgba(16,185,129,0.3)}'
+'.bpc-modal-btn.confirm:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(16,185,129,0.4)}'
+'.bpc-modal-btn.cancel{background:#f1f5f9;color:#475569}'
+'.bpc-modal-btn.cancel:hover{background:#e2e8f0}'
+'@media(max-width:768px){.bpc-sidebar{display:none}}';
        document.head.appendChild(st);
    }
    content.innerHTML = '<div class="bpc-wrap"><div class="bpc-sidebar" id="bpcSidebar"><div style="padding:20px;text-align:center;color:var(--gray-400);font-size:12px">Đang tải...</div></div><div class="bpc-main">'
        +'<div style="display:flex;gap:10px;margin-bottom:8px;flex-wrap:wrap;align-items:center">'
        +'<div id="bpcFilterInfo" style="font-size:12px"></div>'
        +'<div id="bpcStatCards" style="display:flex;gap:10px;flex:1;justify-content:center"></div>'
        +'<button onclick="_bpcOpenMultiCut()" style="padding:8px 16px;background:linear-gradient(135deg,#ea580c,#f97316);color:#fff;border:none;border-radius:10px;font-size:12px;font-weight:800;cursor:pointer;white-space:nowrap;box-shadow:0 3px 12px rgba(234,88,12,0.35);font-family:Inter,system-ui,sans-serif;letter-spacing:0.3px" onmouseover="this.style.transform=\'translateY(-1px)\'" onmouseout="this.style.transform=\'\'">✂️+ CẮT NHIỀU ĐƠN</button>'
        +((window._currentUser && window._currentUser.role === 'giam_doc') ? '<button onclick="_bpcOpenTargetRatioModal()" style="padding:8px 16px;background:linear-gradient(135deg,#059669,#10b981);color:#fff;border:none;border-radius:10px;font-size:12px;font-weight:800;cursor:pointer;white-space:nowrap;margin-left:8px;box-shadow:0 3px 12px rgba(16,185,129,0.35);font-family:Inter,system-ui,sans-serif;letter-spacing:0.3px" onmouseover="this.style.transform=\'translateY(-1px)\'" onmouseout="this.style.transform=\'\'">⚖️ ĐỊNH LƯỢNG TỈ LỆ CẮT</button>' : '')
        +'<input id="bpcSearch" placeholder="🔍 Tìm sản phẩm, chất liệu..." style="padding:6px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:12px;width:200px;outline:none">'
        +'</div>'
        +'<div id="bpcPaginationTop" style="margin:8px 0"></div>'
        +'<div class="card"><div class="card-body" style="overflow-x:auto;padding:8px" id="bpcTableWrap"></div></div>'
        +'<div id="bpcPaginationBottom" style="margin:8px 0"></div>'
        +'</div></div>';
    var _st; document.getElementById('bpcSearch').addEventListener('input', function() {
        clearTimeout(_st); _st = setTimeout(function() { _bpc.search = document.getElementById('bpcSearch').value || ''; _bpc.page = 1; if (_bpc.filter.view==='unassigned') _bpcRenderUnassigned(); else _bpcRenderTable(); }, 300);
    });
    _bpcLoadAll();
}

async function _bpcLoadAll() {
    try {
        var res = await apiCall('/api/cutting/tree');
        _bpc.tree = res;
        if (res && res.yearTree) {
            res.yearTree.forEach(function(yr) {
                var yKey = 'y' + yr.year;
                if (_bpcOpen[yKey] === undefined) {
                    _bpcOpen[yKey] = true;
                }
            });
        }
        _bpcRenderSidebar();
        if (_bpc.filter.view === 'unassigned') await _bpcLoadUnassigned();
        else await _bpcLoadRecords();
    } catch(e) { console.error('[BPC]', e); }
}

function _bpcRenderSidebar() {
    var sb = document.getElementById('bpcSidebar'); if (!sb || !_bpc.tree) return;
    var t = _bpc.tree, f = _bpc.filter;
    var ua = t.unassigned || { total: 0, ready: 0, pending: 0 };

    var h = '<div class="bpc-sb-title"><span style="color:var(--navy)">───</span> <span style="color:#dc2626;font-weight:900">✂️ Bộ Phận Cắt</span> <span style="color:var(--navy)">───</span></div>';
    h += '<div class="bpc-sb-total" onclick="_bpcFilter()"><span>📦 Tổng đơn cắt</span><span style="font-size:16px">' + (t.total || 0) + '</span></div>';

    // Mục 1: Các Đơn Chưa Cắt
    var uaActive = f.view === 'unassigned';
    h += '<div class="bpc-sb-uncut'+(uaActive?' active':'')+'" onclick="_bpcShowUnassigned()">';
    h += '<span>🔴 CÁC ĐƠN CHƯA CẮT</span>';
    h += '<span style="background:rgba(255,255,255,0.3);padding:2px 10px;border-radius:10px;font-size:12px;font-weight:900">' + ua.total + '</span>';
    h += '</div>';
    if (ua.total > 0) {
        h += '<div style="padding:4px 16px;font-size:9px;color:#6b7280;border-bottom:1px solid #f0f0f0;display:flex;gap:8px">';
        h += '<span style="color:#059669;font-weight:700">🟢 Sẵn sàng: ' + ua.ready + '</span>';
        if (ua.pending > 0) h += '<span style="color:#f59e0b;font-weight:700">🟡 Thiếu ĐK: ' + ua.pending + '</span>';
        h += '</div>';
    }

    // Mục 2+3: Năm → NV → {Chưa HT, Tháng}
    if (t.yearTree) {
        t.yearTree.forEach(function(yr) {
            var yOpen = !!_bpcOpen['y'+yr.year];
            var yAct = f.view === 'records' && f.year == yr.year && !f.cutter_id && !f.month && !f.status;
            h += '<div class="bpc-sb-year' + (yAct ? ' active' : '') + '" onclick="_bpcSelectYear(' + yr.year + ')"><span>' + (yOpen?'▼':'▶') + ' 📅 Năm ' + yr.year + '</span><span style="background:linear-gradient(135deg,#dc2626,#ef4444);color:#fff;padding:2px 10px;border-radius:10px;font-size:10px">' + yr.count + '</span></div>';
            if (yOpen && yr.cutters) {
                yr.cutters.forEach(function(c) {
                    var cKey = 'c'+yr.year+'_'+c.id;
                    var cOpen = !!_bpcOpen[cKey];
                    var cAct = f.view==='records' && f.year==yr.year && f.cutter_id==c.id && !f.status;
                    h += '<div class="bpc-sb-cutter'+(cAct?' active':'')+'" onclick="event.stopPropagation();_bpcToggle(\''+cKey+'\');_bpcFilter('+yr.year+',null,'+c.id+')"><span>'+(cOpen?'▼':'▶')+' 👤 '+(c.name||'Chưa PC')+'</span><span style="font-weight:800">'+c.total+'</span></div>';
                    if (cOpen) {
                        // Đơn Chưa Hoàn Thành
                        if (c.incomplete_count > 0) {
                            var incAct = f.view==='records' && f.year==yr.year && f.cutter_id==c.id && f.status==='incomplete';
                            h += '<div class="bpc-sb-sub incomplete'+(incAct?' active':'')+'" onclick="event.stopPropagation();_bpcFilterCutterStatus('+yr.year+','+c.id+',\'incomplete\')"><span>⏳ Chưa Hoàn Thành</span><span style="background:#fef3c7;color:#92400e;padding:1px 8px;border-radius:8px;font-size:9px;font-weight:800">'+c.incomplete_count+'</span></div>';
                        }
                        // Tháng đã hoàn thành
                        if (c.months) {
                            c.months.forEach(function(m) {
                                var mAct = f.view==='records' && f.year==yr.year && f.cutter_id==c.id && f.month==m.month && f.status==='done';
                                h += '<div class="bpc-sb-sub'+(mAct?' active':'')+'" onclick="event.stopPropagation();_bpcFilterCutterMonth('+yr.year+','+c.id+','+m.month+')"><span>📅 T'+String(m.month).padStart(2,'0')+'</span><span>'+m.count+'</span></div>';
                            });
                        }
                    }
                });
            }
        });
    }
    sb.innerHTML = h;
}

function _bpcToggle(key) { _bpcOpen[key] = !_bpcOpen[key]; _bpcRenderSidebar(); }

function _bpcSelectYear(year) {
    _bpcOpen['y' + year] = !_bpcOpen['y' + year];
    _bpcFilter(year);
}

function _bpcShowUnassigned() {
    _bpc.filter = { view: 'unassigned', year: null, month: null, cutter_id: null, status: null };
    _bpc.page = 1;
    _bpcRenderSidebar();
    _bpcLoadUnassigned();
}

function _bpcFilter(year, month, cutterId) {
    _bpc.filter = { view: 'records', year: year||null, month: month||null, cutter_id: cutterId||null, status: null };
    _bpc.page = 1;
    _bpcRenderSidebar();
    _bpcLoadRecords();
}

function _bpcFilterCutterStatus(year, cutterId, status) {
    _bpc.filter = { view: 'records', year: year, month: null, cutter_id: cutterId, status: status };
    _bpc.page = 1;
    _bpcRenderSidebar();
    _bpcLoadRecords();
}

function _bpcFilterCutterMonth(year, cutterId, month) {
    _bpc.filter = { view: 'records', year: year, month: month, cutter_id: cutterId, status: 'done' };
    _bpc.page = 1;
    _bpcRenderSidebar();
    _bpcLoadRecords();
}

async function _bpcLoadRecords() {
    var f = _bpc.filter;
    var qs = '?_=1';
    if (f.year) qs += '&year=' + f.year;
    if (f.month) qs += '&month=' + f.month;
    if (f.cutter_id) qs += '&cutter_id=' + f.cutter_id;
    if (f.status === 'done') qs += '&status=done';
    try {
        var res = await apiCall('/api/cutting/records' + qs);
        _bpc.records = res.records || [];
        // Group by order_code to keep them together, ordering the groups by max id of items DESC, and items within each group by product_name ASC
        var groups = {};
        _bpc.records.forEach(function(r) {
            var key = r.order_code || 'Chưa rõ';
            if (!groups[key]) groups[key] = { maxId: 0, items: [] };
            if (r.id > groups[key].maxId) groups[key].maxId = r.id;
            groups[key].items.push(r);
        });
        
        // Sort each group's items by product_name ASC
        Object.keys(groups).forEach(function(key) {
            groups[key].items.sort(function(a, b) {
                return (a.product_name || '').localeCompare(b.product_name || '');
            });
        });
        
        // Sort groups by maxId DESC
        var sortedGroups = Object.keys(groups).sort(function(a, b) {
            return groups[b].maxId - groups[a].maxId;
        });
        
        // Flatten back to _bpc.records
        var newRecs = [];
        sortedGroups.forEach(function(key) {
            newRecs = newRecs.concat(groups[key].items);
        });
        _bpc.records = newRecs;

        // Filter incomplete on client if needed
        if (f.status === 'incomplete') {
            _bpc.records = _bpc.records.filter(function(r) { return !r.is_cut_done; });
        }
        _bpc.page = 1;
        // Render table into wrap
        var wrap = document.getElementById('bpcTableWrap');
        if (wrap) {
            wrap.innerHTML = '<table class="table" style="font-size:11px;white-space:nowrap" id="bpcTable"><thead><tr style="background:var(--gray-800)">'
                +'<th>STT</th><th>✂️</th><th>✅</th><th>💰</th><th>🫧</th><th>⚠️</th>'
                +'<th>Ngày Cắt</th><th>NV Cắt</th><th>Tên SP</th><th>Chất Liệu</th><th>Màu Vải</th>'
                +'<th>SL Đơn</th><th>SL Cắt</th><th>Kg Cắt</th><th>Tỉ Lệ</th><th>Lý Do Sai TL</th>'
                +'<th>Kg Đầu</th><th>Kg Cuối</th><th>Cảnh Báo</th><th>Cắt Chung</th><th>Cập Nhật</th>'
                +'</tr></thead><tbody id="bpcTbody"></tbody></table>';
        }
        _bpcRenderTable();
    } catch(e) { console.error('[BPC] records:', e); }
}

function _bpcFmtDate(d) { if (!d) return '—'; try { var p = d.split('T')[0].split('-'); return p[2]+'/'+p[1]+'/'+p[0]; } catch(e) { return d; } }

function _bpcRenderTable() {
    var all = _bpc.records.slice();
    if (_bpc.search) {
        var q = _bpc.search.toLowerCase();
        all = all.filter(function(r) { return (r.product_name||'').toLowerCase().indexOf(q)>=0 || (r.material_name||'').toLowerCase().indexOf(q)>=0 || (r.order_code||'').toLowerCase().indexOf(q)>=0 || (r.cutting_category||'').toLowerCase().indexOf(q)>=0; });
    }
    var total = all.length, totalPages = Math.ceil(total / _bpc.pageSize) || 1;
    if (_bpc.page > totalPages) _bpc.page = totalPages;
    if (_bpc.page < 1) _bpc.page = 1;
    var start = (_bpc.page - 1) * _bpc.pageSize;
    var paged = all.slice(start, start + _bpc.pageSize);
    _bpcRenderRows(paged);
    _bpcRenderPagination(total, totalPages);
    _bpcRenderStats(total, all);
}

function _bpcRenderRows(paged) {
    var tbody = document.getElementById('bpcTbody'); if (!tbody) return;
    if (!paged.length) { tbody.innerHTML = '<tr><td colspan="21"><div class="empty-state"><div class="icon">✂️</div><h3>Chưa có đơn cắt nào</h3><p>Chọn mục ở sidebar</p></div></td></tr>'; return; }
    tbody.innerHTML = paged.map(function(r, i) {
        // === CUT/DONE button visibility logic ===
        // Not cutting yet: show ✂️, hide ✅
        // Cutting (not done): hide ✂️, show ✅
        // Cut done: hide ✂️, show ✅ (green)
        var showCutBtn = !r.is_cutting;
        var showDoneBtn = r.is_cutting;
        var cutIcon = r.is_cutting ? '✂️' : '⬜', cutCls = r.is_cutting ? ' on-cut' : '';
        var doneIcon = r.is_cut_done ? '✅' : '🏁', doneCls = r.is_cut_done ? ' on-done' : '';
        var salIcon = r.salary_approved ? '💰' : '⬜', salCls = r.salary_approved ? ' on-sal' : '';
        var washIcon = r.wash_reported ? '🫧' : '⬜', washCls = r.wash_reported ? ' on-wash' : '';
        var errIcon = r.error_reported ? '⚠️' : '⬜', errCls = r.error_reported ? ' on-err' : '';
        var salAct = r.salary_approved ? 'undo_approve_salary' : 'approve_salary';
        var washAct = r.wash_reported ? 'undo_wash' : 'report_wash';
        var ratioColor = '#3b82f6';
        var tr = Number(r.target_cut_ratio) || 0;
        if (tr > 0 && r.cut_ratio) {
            ratioColor = Number(r.cut_ratio) >= tr ? '#059669' : '#dc2626';
        }
        var warnHtml = r.cut_warning ? '<span style="color:#dc2626;font-weight:700">'+r.cut_warning+'</span>' : '—';
        var updateStr = '';
        if (r.last_update_at) { updateStr = _bpcFmtDate(r.last_update_at); if (r.last_update_by) updateStr += '<br><span style="color:#dc2626;font-size:9px">'+r.last_update_by+'</span>'; }
        var ccBadge = r.cutting_category ? '<span style="background:#dbeafe;color:#1d4ed8;padding:1px 5px;border-radius:3px;font-size:9px;font-weight:700;margin-right:4px">' + r.cutting_category + '</span>' : '';
        var sharedBadge = '';
        if (r.multi_cut_group_id) {
            var label = 'CẮT CHUNG';
            if (r.cut_shared) {
                var m = r.cut_shared.match(/Cắt chung (\d+) đơn/i);
                if (m) label = 'CẮT CHUNG ' + m[1] + ' ĐƠN';
            }
            sharedBadge = '<span style="background:#ea580c;color:#fff;padding:1px 5px;border-radius:3px;font-size:9px;font-weight:800;margin-right:4px;display:inline-block;vertical-align:middle;text-transform:uppercase">' + label + '</span>';
        }
        // Cut button: show modal instead of direct toggle or checkmark when done
        var cutBtnHtml = '';
        if (r.is_cut_done) {
            cutBtnHtml = '<button class="bpc-icon-btn on-cut" disabled title="Đã hoàn thành cắt" style="opacity:0.8;cursor:default">✅</button>';
        } else if (showCutBtn) {
            cutBtnHtml = '<button class="bpc-icon-btn'+cutCls+'" onclick="_bpcOpenCutModal('+r.id+')" title="Bắt đầu cắt">'+cutIcon+'</button>';
        } else {
            cutBtnHtml = '<button class="bpc-icon-btn on-cut" disabled title="Đang cắt" style="opacity:0.4;cursor:default">✂️</button>';
        }
        var isGiamDoc = window._currentUser && window._currentUser.role === 'giam_doc';
        var doneBtnHtml = showDoneBtn
            ? (r.is_cut_done
                ? (isGiamDoc
                    ? '<button class="bpc-icon-btn on-done" onclick="_bpcToggleAction('+r.id+',\'undo_cut_done\')" title="Hoàn tác cắt xong (chỉ dành cho Giám đốc)">'+doneIcon+'</button>'
                    : '<button class="bpc-icon-btn on-done" disabled title="Đã hoàn thành (chỉ Giám đốc mới được hoàn tác)" style="opacity:0.6;cursor:default">'+doneIcon+'</button>')
                : '<button class="bpc-icon-btn" onclick="_bpcOpenDoneModal('+r.id+')" title="Cắt xong" style="background:#eff6ff;border-color:#3b82f6">'+doneIcon+'</button>')
            : '<span style="width:26px;display:inline-block"></span>';
        var sharedCol = '—';
        if (r.cut_shared) {
            var firstLine = r.cut_shared.split('\n')[0].replace(':', '');
            sharedCol = '<span title="' + r.cut_shared.replace(/"/g, '&quot;') + '" style="cursor:help;border-bottom:1px dashed #ea580c;font-weight:700;color:#ea580c">' + firstLine + '</span>';
        }
        return '<tr>'
            +'<td style="text-align:center;font-weight:700;color:#94a3b8">'+(i+1+(_bpc.page-1)*_bpc.pageSize)+'</td>'
            +'<td style="text-align:center">'+cutBtnHtml+'</td>'
            +'<td style="text-align:center">'+doneBtnHtml+'</td>'
            +'<td style="text-align:center"><button class="bpc-icon-btn'+salCls+'" onclick="_bpcToggleAction('+r.id+',\''+salAct+'\')" title="Duyệt lương">'+salIcon+'</button></td>'
            +'<td style="text-align:center"><button class="bpc-icon-btn'+washCls+'" onclick="_bpcToggleAction('+r.id+',\''+washAct+'\')" title="Giặt vải">'+washIcon+'</button></td>'
            +'<td style="text-align:center"><button class="bpc-icon-btn'+errCls+'" onclick="_bpcReportError('+r.id+')" title="Báo lỗi">'+errIcon+'</button></td>'
            +'<td style="font-size:10px">'+_bpcFmtDate(r.cut_date)+'</td>'
            +'<td style="font-size:10px;color:#059669;font-weight:600">'+(r.cutter_name||'—')+'</td>'
            +'<td style="font-weight:600;color:#1e293b;font-size:11px;cursor:pointer" onclick="_bpcOpenDetail('+r.id+')" title="Xem chi tiết">' + ccBadge + sharedBadge + '<span style="border-bottom:1px dashed #94a3b8">' + (r.product_name||r.order_code||'—') + '</span></td>'
            +'<td style="font-size:10px;color:#475569">'+(r.material_name||'—')+'</td>'
            +'<td style="font-size:10px">'+(r.fabric_color||'—')+'</td>'
            +'<td style="text-align:center;font-weight:700;color:#0369a1">'+(r.order_quantity||'—')+'</td>'
            +'<td style="text-align:center;font-weight:700;color:#7c3aed">'+(r.cut_quantity||'—')+'</td>'
            +'<td style="text-align:center;font-weight:700;color:#dc2626">'+_bpcFmtKg(r.kg_cut)+'</td>'
            +'<td style="text-align:center;font-weight:800;color:'+ratioColor+'">'+(r.cut_ratio ? r.cut_ratio + ' sp/' + (r.fabric_unit || 'kg') : '—')+'</td>'
            +'<td style="font-size:9px;color:#6b7280;max-width:80px;overflow:hidden;text-overflow:ellipsis">'+(r.ratio_reason||'—')+'</td>'
            +'<td style="text-align:center;font-weight:600">'+_bpcFmtKg(r.kg_start)+'</td>'
            +'<td style="text-align:center;font-weight:600">'+_bpcFmtKg(r.kg_end)+'</td>'
            +'<td>'+warnHtml+'</td>'
            +'<td style="font-size:10px;text-align:center">'+sharedCol+'</td>'
            +'<td style="font-size:9px;color:#6b7280">'+updateStr+'</td>'
            +'</tr>';
    }).join('');
}

function _bpcRenderPagination(totalItems, totalPages) {
    var html = '';
    if (totalPages <= 1) {
        html = '<div style="text-align:center;font-size:11px;color:#64748b;padding:4px"><span style="font-weight:700">'+totalItems+' đơn</span></div>';
    } else {
        html = '<div style="display:flex;align-items:center;justify-content:center;gap:4px;flex-wrap:wrap;padding:6px 0">';
        html += '<button onclick="_bpcGoPage('+(_bpc.page-1)+')" '+(_bpc.page<=1?'disabled':'')+' style="padding:4px 10px;border-radius:6px;border:1px solid #cbd5e1;background:'+(_bpc.page<=1?'#f1f5f9':'#fff')+';color:'+(_bpc.page<=1?'#94a3b8':'#dc2626')+';font-size:11px;font-weight:700;cursor:'+(_bpc.page<=1?'not-allowed':'pointer')+'">◀ Trước</button>';
        for (var p = 1; p <= totalPages; p++) {
            if (totalPages > 7 && p > 2 && p < totalPages - 1 && Math.abs(p - _bpc.page) > 1) { if (p === 3 || p === totalPages - 2) html += '<span style="padding:4px 6px;color:#94a3b8;font-size:11px">...</span>'; continue; }
            var isA = p === _bpc.page;
            html += '<button onclick="_bpcGoPage('+p+')" style="min-width:30px;padding:4px 8px;border-radius:6px;border:1px solid '+(isA?'#dc2626':'#cbd5e1')+';background:'+(isA?'#dc2626':'#fff')+';color:'+(isA?'#fff':'#334155')+';font-size:11px;font-weight:'+(isA?'800':'600')+';cursor:pointer">'+p+'</button>';
        }
        html += '<button onclick="_bpcGoPage('+(_bpc.page+1)+')" '+(_bpc.page>=totalPages?'disabled':'')+' style="padding:4px 10px;border-radius:6px;border:1px solid #cbd5e1;background:'+(_bpc.page>=totalPages?'#f1f5f9':'#fff')+';color:'+(_bpc.page>=totalPages?'#94a3b8':'#dc2626')+';font-size:11px;font-weight:700;cursor:'+(_bpc.page>=totalPages?'not-allowed':'pointer')+'">Sau ▶</button>';
        html += ' <span style="font-size:11px;color:#64748b;font-weight:600;margin-left:8px">Trang '+_bpc.page+'/'+totalPages+' — '+totalItems+' đơn</span></div>';
    }
    var top = document.getElementById('bpcPaginationTop'), bot = document.getElementById('bpcPaginationBottom');
    if (top) top.innerHTML = html;
    if (bot) bot.innerHTML = html;
}

function _bpcGoPage(p) {
    var tp = Math.ceil((_bpc.records||[]).length / _bpc.pageSize) || 1;
    if (p < 1 || p > tp) return;
    _bpc.page = p; _bpcRenderTable();
    var tbl = document.getElementById('bpcTable');
    if (tbl) tbl.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function _bpcRenderStats(count, arr) {
    var el = document.getElementById('bpcFilterInfo'); if (!el) return;
    var f = _bpc.filter, parts = ['✂️ Bộ Phận Cắt'];
    if (f.year) parts.push('📆 ' + f.year);
    if (f.month) parts.push('🗓️ T' + f.month);
    var label = parts.join(' <span style="opacity:0.5;margin:0 6px">•</span> ');
    el.innerHTML = '<div style="display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,#7f1d1d,#991b1b);color:#fff;padding:6px 18px;border-radius:8px;font-size:13px;font-weight:700;letter-spacing:0.3px">'
        + label + ' <span style="opacity:0.5;margin:0 4px">—</span> <span style="color:#fca5a5;font-weight:900">' + count + '</span> đơn</div>';

    var sc = document.getElementById('bpcStatCards'); if (!sc) return;
    var cutting = arr.filter(function(r){return r.is_cutting && !r.is_cut_done;}).length;
    var done = arr.filter(function(r){return r.is_cut_done;}).length;
    var approved = arr.filter(function(r){return r.salary_approved;}).length;
    sc.innerHTML = ''
        +'<div style="background:linear-gradient(135deg,#dc2626,#ef4444);color:#fff;padding:8px 18px;border-radius:10px;min-width:90px;text-align:center;box-shadow:0 4px 15px #dc262630;position:relative;overflow:hidden"><div style="position:absolute;top:0;left:-50%;width:200%;height:100%;background:linear-gradient(90deg,transparent 40%,rgba(255,255,255,0.15) 50%,transparent 60%);animation:bpcShimmer 2.5s infinite"></div><div style="font-size:9px;font-weight:600;opacity:0.85;letter-spacing:1px;margin-bottom:2px">📦 TỔNG</div><div style="font-size:15px;font-weight:900">'+count+'</div></div>'
        +'<div style="background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;padding:8px 18px;border-radius:10px;min-width:90px;text-align:center;box-shadow:0 4px 15px #f59e0b30;position:relative;overflow:hidden"><div style="position:absolute;top:0;left:-50%;width:200%;height:100%;background:linear-gradient(90deg,transparent 40%,rgba(255,255,255,0.15) 50%,transparent 60%);animation:bpcShimmer 2.5s infinite .3s"></div><div style="font-size:9px;font-weight:600;opacity:0.85;letter-spacing:1px;margin-bottom:2px">✂️ ĐANG CẮT</div><div style="font-size:15px;font-weight:900">'+cutting+'</div></div>'
        +'<div style="background:linear-gradient(135deg,#059669,#10b981);color:#fff;padding:8px 18px;border-radius:10px;min-width:90px;text-align:center;box-shadow:0 4px 15px #05966930;position:relative;overflow:hidden"><div style="position:absolute;top:0;left:-50%;width:200%;height:100%;background:linear-gradient(90deg,transparent 40%,rgba(255,255,255,0.15) 50%,transparent 60%);animation:bpcShimmer 2.5s infinite .6s"></div><div style="font-size:9px;font-weight:600;opacity:0.85;letter-spacing:1px;margin-bottom:2px">✅ XONG</div><div style="font-size:15px;font-weight:900">'+done+'</div></div>'
        +'<div style="background:linear-gradient(135deg,#7c3aed,#8b5cf6);color:#fff;padding:8px 18px;border-radius:10px;min-width:90px;text-align:center;box-shadow:0 4px 15px #7c3aed30;position:relative;overflow:hidden"><div style="position:absolute;top:0;left:-50%;width:200%;height:100%;background:linear-gradient(90deg,transparent 40%,rgba(255,255,255,0.15) 50%,transparent 60%);animation:bpcShimmer 2.5s infinite .9s"></div><div style="font-size:9px;font-weight:600;opacity:0.85;letter-spacing:1px;margin-bottom:2px">💰 DUYỆT</div><div style="font-size:15px;font-weight:900">'+approved+'</div></div>';
}

async function _bpcToggleAction(id, action) {
    if (window._bpcBusy) return;
    var msg = '';
    if (action === 'undo_cut_done') {
        msg = '⚠️ CẢNH BÁO: Hoàn tác cắt xong sẽ mở khóa các cây vải và khôi phục số lượng vải về trạng thái chưa cắt. Bạn có chắc chắn muốn thực hiện?';
    } else if (action === 'undo_cutting') {
        msg = 'Hoàn tác bắt đầu cắt? Sẽ mở khóa tất cả cây vải đã chọn.';
    } else if (action === 'undo_approve_salary') {
        msg = 'Bạn có chắc chắn muốn hoàn tác duyệt lương cho đơn này?';
    } else if (action === 'undo_wash') {
        msg = 'Bạn có chắc chắn muốn hoàn tác báo giặt cho đơn này?';
    }

    if (msg && !confirm(msg)) return;

    window._bpcBusy = true;
    try {
        await apiCall('/api/cutting/toggle/' + id, 'POST', { action: action });
        showToast('✅ Cập nhật');
        await _bpcLoadAll();
    } catch(e) {
        showToast(e.message || 'Lỗi', 'error');
    } finally {
        window._bpcBusy = false;
    }
}

function _bpcReportError(id) {
    if (typeof navigate === 'function') {
        navigate('don-loi-khach-hang');
        showToast('📋 Đã chuyển sang Đơn Lỗi — tạo báo cáo lỗi nội bộ');
    }
}

// ========== UNASSIGNED POOL ==========
async function _bpcLoadUnassigned() {
    try {
        var res = await apiCall('/api/cutting/unassigned');
        _bpc.unassignedOrders = res.orders || [];
        _bpc.page = 1;
        _bpcRenderUnassigned();
    } catch(e) { console.error('[BPC] unassigned:', e); }
}

function _bpcRenderUnassigned() {
    var wrap = document.getElementById('bpcTableWrap'); if (!wrap) return;
    var all = _bpc.unassignedOrders.slice();
    if (_bpc.search) {
        var q = _bpc.search.toLowerCase();
        all = all.filter(function(r) { return (r.order_code||'').toLowerCase().indexOf(q)>=0 || (r.customer_name||'').toLowerCase().indexOf(q)>=0 || (r.material_name||'').toLowerCase().indexOf(q)>=0; });
    }
    // Group by phiếu (item) — each phiếu = independent claim unit
    var lastGroupKey = null, stt = 0;
    var seenItems = {};
    all.forEach(function(r) { var k = r.id + '_' + (r.item_id || 0); if (!seenItems[k]) seenItems[k] = r; });
    var itemList = Object.values(seenItems);
    var readyCnt = itemList.filter(function(r){ return r.fabric_arrived && r.has_pc_in; }).length;
    var pendCnt = itemList.length - readyCnt;

    // Stats
    var el = document.getElementById('bpcFilterInfo'); if (el) {
        el.innerHTML = '<div style="display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,#ea580c,#f97316);color:#fff;padding:6px 18px;border-radius:8px;font-size:13px;font-weight:700">'
            +'🔴 Đơn Chưa Cắt <span style="opacity:0.5;margin:0 4px">—</span> <span style="font-weight:900">' + itemList.length + '</span> phiếu</div>';
    }
    var sc = document.getElementById('bpcStatCards'); if (sc) {
        sc.innerHTML = '<div style="background:linear-gradient(135deg,#059669,#10b981);color:#fff;padding:8px 18px;border-radius:10px;min-width:90px;text-align:center;box-shadow:0 4px 15px #05966930"><div style="font-size:9px;font-weight:600;opacity:0.85;letter-spacing:1px;margin-bottom:2px">🟢 SẴN SÀNG</div><div style="font-size:15px;font-weight:900">' + readyCnt + '</div></div>'
            +'<div style="background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;padding:8px 18px;border-radius:10px;min-width:90px;text-align:center;box-shadow:0 4px 15px #f59e0b30"><div style="font-size:9px;font-weight:600;opacity:0.85;letter-spacing:1px;margin-bottom:2px">🟡 THIẾU ĐK</div><div style="font-size:15px;font-weight:900">' + pendCnt + '</div></div>';
    }

    // Table
    var th = '<table class="table" style="font-size:11px;white-space:nowrap" id="bpcTable"><thead><tr style="background:var(--gray-800)">'
        +'<th>STT</th><th style="min-width:130px;text-align:center">Nhận Đơn</th><th style="text-align:center">Ưu Tiên</th><th>Mã Đơn</th><th>Tên KH</th><th>CSKH</th><th>Tên SP / Phối</th>'
        +'<th>Chất Liệu</th><th>Màu</th><th>SL</th><th>Ngày Ship</th>'
        +'<th>Trạng Thái</th></tr></thead><tbody>';
    if (!all.length) {
        th += '<tr><td colspan="12"><div class="empty-state"><div class="icon">✅</div><h3>Không có đơn chờ cắt</h3><p>Tất cả đơn đã được nhận</p></div></td></tr>';
    } else {
        // Count rows per phiếu (item) for rowspan
        var groupRowCount = {};
        all.forEach(function(r) { var k = r.id + '_' + (r.item_id || 0); groupRowCount[k] = (groupRowCount[k] || 0) + 1; });

        all.forEach(function(r, i) {
            var groupKey = r.id + '_' + (r.item_id || 0);
            var isNew = groupKey !== lastGroupKey; if (isNew) { stt++; lastGroupKey = groupKey; }
            var bg = isNew ? '' : 'background:#f0f9ff;';
            var ready = r.fabric_arrived && r.has_pc_in;
            var priColor = r.shipping_priority === 'GẤP' ? 'background:linear-gradient(135deg,#dc2626,#ef4444);color:#fff;box-shadow:0 2px 8px rgba(220,38,38,0.35)' : r.shipping_priority === 'GỬI' ? 'background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;box-shadow:0 2px 8px rgba(245,158,11,0.35)' : 'background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;box-shadow:0 2px 8px rgba(79,70,229,0.4)';
            var spName = (r.total_phoi > 1) ? (r.order_code + ' — Phiếu ' + r.item_index + ' — P' + r.phoi_in_item + (r.item_desc ? ' — ' + r.item_desc : '')) : (r.order_code + (r.item_desc ? ' — ' + r.item_desc : ''));
            // Status badges
            var statusHtml = '<div style="display:flex;gap:4px;flex-wrap:wrap">'
                + (r.fabric_arrived ? '<span style="background:#dcfce7;color:#059669;padding:1px 6px;border-radius:4px;font-size:8px;font-weight:700">✅ Vải</span>' : '<span style="background:#fee2e2;color:#dc2626;padding:1px 6px;border-radius:4px;font-size:8px;font-weight:700">❌ Vải</span>')
                + (r.has_pc_in ? '<span style="background:#dcfce7;color:#059669;padding:1px 6px;border-radius:4px;font-size:8px;font-weight:700">✅ PC In</span>' : '<span style="background:#fee2e2;color:#dc2626;padding:1px 6px;border-radius:4px;font-size:8px;font-weight:700">❌ PC In</span>')
                + '</div>';
            // Claim button with rowspan
            var claimTd = '';
            var priTd = '';
            if (isNew) {
                var rs = groupRowCount[groupKey] || 1;
                var claimHtml;
                if (ready) {
                    claimHtml = '<button class="bpc-claim-btn ready" onclick="_bpcClaimOrder('+r.id+','+(r.item_id||'null')+',\''+r.order_code+'\')" title="Nhận đơn cắt">✂️ NHẬN ĐƠN</button>';
                } else {
                    var missing = [];
                    if (!r.fabric_arrived) missing.push('Vải');
                    if (!r.has_pc_in) missing.push('PC In');
                    claimHtml = '<button class="bpc-claim-btn disabled" disabled title="Thiếu: '+missing.join(', ')+'">🔒 Thiếu '+missing.join('+')+'</button>';
                }
                claimTd = '<td rowspan="'+rs+'" style="text-align:center;vertical-align:middle;border-left:2px solid #e2e8f0">'+claimHtml+'</td>';
                priTd = '<td rowspan="'+rs+'" style="text-align:center;vertical-align:middle"><span style="padding:3px 10px;border-radius:6px;font-size:10px;font-weight:800;display:inline-block;letter-spacing:0.5px;font-family:Inter,system-ui,sans-serif;'+priColor+'">'+(r.shipping_priority||'CHUẨN')+'</span></td>';
            }
            // SL: P1 (phối chính mỗi phiếu) = xanh đậm, P2+ = xanh nhạt
            var qtyStyle = (r.phoi_in_item === 1 || isNew) ? 'text-align:center;font-weight:700;color:#0369a1' : 'text-align:center;font-weight:600;color:#93c5fd';
            var qtyVal = r.item_qty || r.total_quantity || '';
            var showTitle = (r.total_items_in_order > 1) ? r.order_code + ' — Phiếu ' + r.item_index : r.order_code;

            th += '<tr style="'+bg+'">'
                +'<td style="text-align:center;font-weight:700;color:#94a3b8">'+(isNew?stt:'')+'</td>'
                +claimTd
                +priTd
                +'<td style="font-weight:700;color:#1e293b">'+(isNew?showTitle:'')+'</td>'
                +'<td style="font-size:10px">'+(isNew?(r.customer_name||''):'')+'</td>'
                +'<td style="font-size:10px;color:#6b7280">'+(isNew?(r.cskh_name||r.created_by_name||''):'')+'</td>'
                +'<td style="font-weight:600;font-size:11px;color:#1e293b">'+spName+'</td>'
                +'<td style="font-size:10px;color:#475569">'+(r.material_name||'—')+'</td>'
                +'<td style="font-size:10px">'+(r.color_name||'—')+'</td>'
                +'<td style="'+qtyStyle+'">'+qtyVal+'</td>'
                +'<td style="font-size:10px;color:#475569">'+(isNew?_bpcFmtDate(r.expected_ship_date):'')+'</td>'
                +'<td>'+(isNew?statusHtml:'')+'</td>'
                +'</tr>';
        });
    }
    th += '</tbody></table>';
    wrap.innerHTML = th;
    // Clear pagination for unassigned view
    var top = document.getElementById('bpcPaginationTop'), bot = document.getElementById('bpcPaginationBottom');
    if (top) top.innerHTML = '<div style="text-align:center;font-size:11px;color:#64748b;padding:4px"><span style="font-weight:700">'+all.length+' phối chờ cắt</span></div>';
    if (bot) bot.innerHTML = '';
}

async function _bpcClaimOrder(orderId, itemId, orderCode) {
    if (window._bpcBusy) return;
    // Find all rows for this phiếu from unassigned data
    var groupKey = orderId + '_' + (itemId || 0);
    var rows = _bpc.unassignedOrders.filter(function(r) { return (r.id + '_' + (r.item_id || 0)) === groupKey; });
    var o = rows[0] || {};
    var title = (o.total_items_in_order > 1) ? o.order_code + ' — Phiếu ' + o.item_index : o.order_code;
    var priMap = { 'GẤP': ['🔴 GẤP','background:linear-gradient(135deg,#dc2626,#ef4444);color:#fff'], 'GỬI': ['🟡 GỬI','background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff'] };
    var pri = priMap[o.shipping_priority] || ['🟣 CHUẨN','background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff'];

    var h = '<div class="bpc-modal-overlay" id="_bpcClaimModal" onclick="if(event.target===this)_bpcCloseModal()">';
    h += '<div class="bpc-modal">';
    h += '<div class="bpc-modal-header"><div class="m-icon">✂️</div><div><div class="m-title">Nhận Đơn Cắt</div><div class="m-sub">Xác nhận nhận phiếu cắt này</div></div></div>';
    h += '<div class="bpc-modal-body">';
    h += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">📋 Mã đơn</span><span class="bpc-modal-val" style="color:#059669;font-size:15px">' + title + '</span></div>';
    h += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">👤 Khách hàng</span><span class="bpc-modal-val">' + (o.customer_name || '—') + '</span></div>';
    h += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">💼 NV Sale</span><span class="bpc-modal-val" style="color:#60a5fa">' + (o.cskh_name || o.created_by_name || '—') + '</span></div>';
    h += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">📅 Ngày ship</span><span class="bpc-modal-val">' + _bpcFmtDate(o.expected_ship_date) + '</span></div>';
    h += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">⚡ Ưu tiên</span><span class="bpc-modal-val"><span style="padding:3px 12px;border-radius:6px;font-size:11px;font-weight:800;' + pri[1] + '">' + pri[0] + '</span></span></div>';
    // Phối list
    if (rows.length > 0) {
        h += '<div class="bpc-modal-phoi"><div class="bpc-modal-phoi-title">📦 Danh sách phối (' + rows.length + ')</div>';
        rows.forEach(function(p) {
            var pName = (p.total_phoi > 1) ? ('P' + p.phoi_in_item + (p.item_desc ? ' — ' + p.item_desc : '')) : (p.item_desc || o.order_code);
            h += '<div class="bpc-modal-phoi-item"><span class="p-name">' + pName + '</span>';
            h += '<span class="p-mat">🧵 ' + (p.material_name || '—') + ' · 🎨 ' + (p.color_name || '—') + '</span></div>';
        });
        h += '</div>';
    }
    h += '</div>';
    h += '<div class="bpc-modal-actions">';
    h += '<button class="bpc-modal-btn cancel" onclick="_bpcCloseModal()">Hủy</button>';
    h += '<button class="bpc-modal-btn confirm" id="_bpcConfirmBtn" onclick="_bpcDoClaimOrder(' + orderId + ',' + (itemId || 'null') + ',\'' + orderCode + '\')">✂️ XÁC NHẬN NHẬN ĐƠN</button>';
    h += '</div></div></div>';

    document.body.insertAdjacentHTML('beforeend', h);
    requestAnimationFrame(function() { document.getElementById('_bpcClaimModal').classList.add('show'); });
}

function _bpcCloseModal() {
    var m = document.getElementById('_bpcClaimModal');
    if (m) { m.classList.remove('show'); setTimeout(function() { m.remove(); }, 300); }
}

async function _bpcDoClaimOrder(orderId, itemId, orderCode) {
    if (window._bpcBusy) return;
    window._bpcBusy = true;
    var btn = document.getElementById('_bpcConfirmBtn');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Đang xử lý...'; }
    try {
        var body = { dht_order_id: orderId };
        if (itemId) body.order_item_id = itemId;
        var res = await apiCall('/api/cutting/claim', 'POST', body);
        _bpcCloseModal();
        showToast('✅ Đã nhận đơn ' + orderCode + ' — tạo ' + res.created + ' phối cắt');
        await _bpcLoadAll();
    } catch(e) {
        showToast(e.message || 'Lỗi nhận đơn', 'error');
        if (btn) { btn.disabled = false; btn.textContent = '✂️ XÁC NHẬN NHẬN ĐƠN'; }
    } finally { window._bpcBusy = false; }
}

async function _bpcUnclaimOrder(orderId, orderCode) {
    if (!confirm('Trả lại đơn ' + orderCode + '? Tất cả record cắt sẽ bị xóa.')) return;
    try {
        await apiCall('/api/cutting/unclaim', 'POST', { dht_order_id: orderId });
        showToast('✅ Đã trả đơn ' + orderCode);
        await _bpcLoadAll();
    } catch(e) { showToast(e.message || 'Lỗi', 'error'); }
}

// ========== CUT MODAL: Form chọn cây vải khi ấn ✂️ ==========
async function _bpcOpenCutModal(recordId) {
    if (window._bpcBusy) return;
    window._bpcBusy = true;
    var rec = _bpc.records.find(function(r) { return r.id === recordId; });
    if (!rec) { showToast('Không tìm thấy record', 'error'); window._bpcBusy = false; return; }
    // If already cutting, allow undo
    if (rec.is_cutting) {
        if (confirm('Hoàn tác bắt đầu cắt? Sẽ unlock tất cả cây vải đã chọn.')) {
            try {
                await _bpcToggleAction(recordId, 'undo_cutting');
            } catch(e) {}
        }
        window._bpcBusy = false;
        return;
    }
    // Show loading modal
    var h = '<div class="bpc-modal-overlay" id="_bpcCutModal" onclick="if(event.target===this)_bpcCloseCutModal()">';
    h += '<div class="bpc-modal" style="width:520px">';
    h += '<div class="bpc-modal-header" style="background:linear-gradient(135deg,#dc2626,#ef4444)"><div class="m-icon">✂️</div><div><div class="m-title">BẮT ĐẦU CẮT</div><div class="m-sub">Chọn cây vải để cắt</div></div></div>';
    h += '<div class="bpc-modal-body" id="_bpcCutBody" style="max-height:60vh;overflow-y:auto"><div style="text-align:center;padding:30px;color:#94a3b8">⏳ Đang tải cây vải...</div></div>';
    h += '<div class="bpc-modal-actions" id="_bpcCutActions" style="display:none"><button class="bpc-modal-btn cancel" onclick="_bpcCloseCutModal()">Hủy</button><button class="bpc-modal-btn confirm" id="_bpcCutConfirmBtn" onclick="_bpcDoCut('+recordId+')">✂️ XÁC NHẬN CẮT</button></div>';
    h += '</div></div>';
    document.body.insertAdjacentHTML('beforeend', h);
    requestAnimationFrame(function() { document.getElementById('_bpcCutModal').classList.add('show'); });
    // Fetch rolls
    try {
        var res = await apiCall('/api/cutting/available-rolls?material_name=' + encodeURIComponent(rec.material_name || '') + '&color_name=' + encodeURIComponent(rec.fabric_color || ''));
        var rolls = res.rolls || [];
        var body = document.getElementById('_bpcCutBody');
        var bh = '';
        // Readonly fields
        bh += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">📋 TÊN SP</span><span class="bpc-modal-val" style="color:#1e293b;font-size:12px">' + (rec.product_name || rec.order_code || '—') + '</span></div>';
        bh += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">🧵 CHẤT LIỆU</span><span class="bpc-modal-val"><span style="background:#fef3c7;color:#92400e;padding:2px 10px;border-radius:6px;font-size:12px;font-weight:700">' + (rec.material_name || '—') + '</span></span></div>';
        bh += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">🎨 MÀU</span><span class="bpc-modal-val"><span style="background:#1e293b;color:#fff;padding:2px 10px;border-radius:6px;font-size:12px;font-weight:700">' + (rec.fabric_color || '—') + '</span></span></div>';
        bh += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">🏷️ SẢN PHẨM CẮT</span><span class="bpc-modal-val"><span style="background:#dbeafe;color:#1d4ed8;padding:2px 10px;border-radius:6px;font-size:12px;font-weight:700">' + (rec.cutting_category || '—') + '</span></span></div>';
        bh += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">👤 NV CẮT</span><span class="bpc-modal-val" style="color:#059669">' + (rec.cutter_name || 'Bạn') + '</span></div>';
        bh += '<div style="border-top:2px solid #e2e8f0;margin:12px 0;padding-top:12px"><div style="font-size:11px;font-weight:800;color:#dc2626;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">📦 CHỌN CÂY CẮT <span style="color:#ef4444">*</span> (bắt buộc)</div>';
        if (!rolls.length) {
            bh += '<div style="text-align:center;padding:20px;color:#f59e0b;font-weight:600;background:#fef3c7;border-radius:8px">⚠️ Không tìm thấy cây vải "' + (rec.material_name||'') + ' - ' + (rec.fabric_color||'') + '" trong kho</div>';
        } else {
            rolls.forEach(function(roll) {
                var disabled = roll.locked ? ' disabled' : '';
                var lockInfo = roll.locked ? '<span style="color:#ef4444;font-size:10px;margin-left:6px">🔒 ' + (roll.locked_by || 'Đang cắt') + '</span>' : '';
                var opacity = roll.locked ? 'opacity:0.5;' : '';
                bh += '<label style="display:flex;align-items:center;gap:10px;padding:8px 12px;border:1.5px solid #e2e8f0;border-radius:10px;margin-bottom:6px;cursor:'+(roll.locked?'not-allowed':'pointer')+';'+opacity+'transition:all .15s" onmouseover="if(!this.querySelector(\'input\').disabled)this.style.borderColor=\'#dc2626\'" onmouseout="this.style.borderColor=\'#e2e8f0\'">';
                bh += '<input type="checkbox" class="_bpcRollCb" value="'+roll.id+'" data-weight="'+roll.weight+'"'+disabled+' onchange="_bpcRecalcKg()" style="width:18px;height:18px;accent-color:#dc2626">';
                bh += '<span style="flex:1;font-size:13px;font-weight:600;color:#1e293b">' + roll.label + (roll.is_original_tree ? ' <span style="background:#ea580c;color:#fff;font-size:8px;padding:1px 5px;border-radius:3px;font-weight:800;margin-left:4px;display:inline-block;vertical-align:middle">CÂY NGUYÊN</span>' : '') + '</span>';
                bh += lockInfo;
                bh += '</label>';
            });
        }
        bh += '</div>';
        // Kg summary
        bh += '<div style="border-top:2px solid #e2e8f0;margin-top:12px;padding-top:12px;display:flex;justify-content:space-between;align-items:center">';
        bh += '<span style="font-size:13px;font-weight:800;color:#1e293b">⚖️ SỐ KG ĐẦU</span>';
        bh += '<span id="_bpcKgDisplay" style="font-size:20px;font-weight:900;color:#dc2626">0.00 kg</span>';
        bh += '</div>';
        body.innerHTML = bh;
        document.getElementById('_bpcCutActions').style.display = 'flex';
    } catch(e) {
        var body2 = document.getElementById('_bpcCutBody');
        if (body2) body2.innerHTML = '<div style="text-align:center;padding:30px;color:#ef4444">❌ Lỗi: ' + (e.message||'Không thể tải') + '</div>';
        window._bpcBusy = false;
    }
}

function _bpcRecalcKg() {
    var cbs = document.querySelectorAll('._bpcRollCb:checked');
    var total = 0;
    cbs.forEach(function(cb) { total += parseFloat(cb.dataset.weight) || 0; });
    var el = document.getElementById('_bpcKgDisplay');
    if (el) el.textContent = _bpcFmtKg(total) + ' kg';
}

function _bpcCloseCutModal() {
    window._bpcBusy = false;
    var m = document.getElementById('_bpcCutModal');
    if (m) { m.classList.remove('show'); setTimeout(function() { m.remove(); }, 300); }
}

async function _bpcDoCut(recordId) {
    if (window._bpcSubmitBusy) return;
    window._bpcSubmitBusy = true;
    var cbs = document.querySelectorAll('._bpcRollCb:checked');
    if (!cbs.length) { showToast('Vui lòng chọn ít nhất 1 cây vải', 'error'); window._bpcSubmitBusy = false; return; }
    var rollIds = [];
    cbs.forEach(function(cb) { rollIds.push(Number(cb.value)); });
    var btn = document.getElementById('_bpcCutConfirmBtn');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Đang xử lý...'; }
    try {
        await apiCall('/api/cutting/toggle/' + recordId, 'POST', { action: 'start_cutting', selected_roll_ids: rollIds });
        _bpcCloseCutModal();
        showToast('✅ Đã bắt đầu cắt — ' + rollIds.length + ' cây');
        await _bpcLoadAll();
    } catch(e) {
        showToast(e.message || 'Lỗi', 'error');
        if (btn) { btn.disabled = false; btn.textContent = '✂️ XÁC NHẬN CẮT'; }
    } finally {
        window._bpcSubmitBusy = false;
        window._bpcBusy = false;
    }
}

// ========== DETAIL MODAL: Xem chi tiết đơn cắt ==========
// ========== DETAIL MODAL: Xem chi tiết đơn cắt ==========
async function _bpcOpenDetail(recordId) {
    if (window._bpcDetailBusy) return;
    window._bpcDetailBusy = true;
    try {
        var res = await apiCall('/api/cutting/records/' + recordId);
        var r = res.record;
        if (!r) return;
        var rolls = [];
        try { rolls = typeof r.selected_roll_ids === 'string' ? JSON.parse(r.selected_roll_ids) : (r.selected_roll_ids || []); } catch(e) {}
        var statusTxt = r.is_cut_done ? '✅ Đã cắt xong' : r.is_cutting ? '✂️ Đang cắt' : '📋 Chờ cắt';
        var statusBg = r.is_cut_done ? '#059669' : r.is_cutting ? '#dc2626' : '#6366f1';
        var h = '<div class="bpc-modal-overlay" id="_bpcDetailModal" onclick="if(event.target===this)this.classList.remove(\'show\'),setTimeout(function(){document.getElementById(\'_bpcDetailModal\').remove()},300)">';
        h += '<div class="bpc-modal" style="width:540px">';
        h += '<div class="bpc-modal-header" style="background:linear-gradient(135deg,'+statusBg+','+statusBg+'cc)"><div class="m-icon">📋</div><div><div class="m-title">CHI TIẾT ĐƠN CẮT</div><div class="m-sub">' + statusTxt + '</div></div></div>';
        h += '<div class="bpc-modal-body" style="max-height:65vh;overflow-y:auto">';
        // Order info
        h += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">📋 Tên SP</span><span class="bpc-modal-val" style="font-size:12px">' + (r.product_name||r.order_code||'—') + '</span></div>';
        h += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">🧵 Chất liệu</span><span class="bpc-modal-val"><span style="background:#fef3c7;color:#92400e;padding:2px 10px;border-radius:6px;font-size:12px;font-weight:700">' + (r.material_name||'—') + '</span></span></div>';
        h += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">🎨 Màu</span><span class="bpc-modal-val"><span style="background:#1e293b;color:#fff;padding:2px 10px;border-radius:6px;font-size:12px;font-weight:700">' + (r.fabric_color||'—') + '</span></span></div>';
        h += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">🏷️ Sản Phẩm Cắt</span><span class="bpc-modal-val"><span style="background:#dbeafe;color:#1d4ed8;padding:2px 10px;border-radius:6px;font-size:12px;font-weight:700">' + (r.cutting_category||'—') + '</span></span></div>';
        h += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">👤 NV Cắt</span><span class="bpc-modal-val" style="color:#059669">' + (r.cutter_name||'—') + '</span></div>';
        h += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">📅 Ngày cắt</span><span class="bpc-modal-val">' + _bpcFmtDate(r.cut_date) + '</span></div>';
        h += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">📦 SL Đơn</span><span class="bpc-modal-val" style="color:#0369a1;font-size:15px">' + (r.order_quantity||'—') + '</span></div>';
        // Selected rolls
        h += '<div style="border-top:2px solid #e2e8f0;margin:12px 0;padding-top:12px"><div style="font-size:11px;font-weight:800;color:#059669;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">📦 CÂY VẢI ĐÃ CHỌN (' + rolls.length + ')</div>';
        if (rolls.length) {
            rolls.forEach(function(rl, idx) {
                h += '<div style="padding:8px 14px;border:1.5px solid #f1f5f9;border-radius:10px;margin-bottom:6px;font-size:13px;font-weight:600;color:#1e293b">' + (rl.label || rl.roll_code || 'Cây '+(idx+1)) + '</div>';
            });
        } else {
            h += '<div style="text-align:center;padding:12px;color:#94a3b8;font-size:12px">Chưa có dữ liệu cây vải</div>';
        }
        h += '</div>';
        // Kg stats
        h += '<div style="border-top:2px solid #e2e8f0;margin:12px 0;padding-top:12px">';
        h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">';
        h += '<div style="background:#fef3c7;padding:10px;border-radius:10px;text-align:center"><div style="font-size:9px;font-weight:700;color:#92400e">⚖️ KG ĐẦU</div><div style="font-size:18px;font-weight:900;color:#b45309">' + _bpcFmtKg(r.kg_start) + '</div></div>';
        h += '<div style="background:#fee2e2;padding:10px;border-radius:10px;text-align:center"><div style="font-size:9px;font-weight:700;color:#991b1b">⚖️ KG CUỐI</div><div style="font-size:18px;font-weight:900;color:#dc2626">' + _bpcFmtKg(r.kg_end) + '</div></div>';
        h += '<div style="background:#dcfce7;padding:10px;border-radius:10px;text-align:center"><div style="font-size:9px;font-weight:700;color:#166534">✂️ KG CẮT</div><div style="font-size:18px;font-weight:900;color:#059669">' + _bpcFmtKg(r.kg_cut) + '</div></div>';
        h += '<div style="background:#dbeafe;padding:10px;border-radius:10px;text-align:center"><div style="font-size:9px;font-weight:700;color:#1e40af">📦 SL CẮT</div><div style="font-size:18px;font-weight:900;color:#2563eb">' + (r.cut_quantity||'—') + '</div></div>';
        h += '</div></div>';
        // Ratio
        if (r.cut_ratio) {
            var rc = '#3b82f6';
            var tr = Number(r.target_cut_ratio) || 0;
            if (tr > 0) {
                rc = Number(r.cut_ratio) >= tr ? '#059669' : '#dc2626';
            }
            h += '<div style="border-top:2px solid #e2e8f0;margin:12px 0;padding-top:12px">';
            h += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">📊 Định Lượng Thực Tế</span><span class="bpc-modal-val" style="color:'+rc+';font-size:18px">' + r.cut_ratio + ' sp/' + (r.fabric_unit || 'kg') + '</span></div>';
            if (tr > 0) {
                h += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">⚖️ Định Lượng Cắt Yêu Cầu</span><span class="bpc-modal-val" style="color:#059669;font-weight:700">' + tr + ' sp/' + (r.fabric_unit || 'kg') + '</span></div>';
            }
            if (r.ratio_reason) h += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">📝 Lý do sai định lượng :</span><span class="bpc-modal-val" style="font-size:11px;color:#64748b;white-space:pre-wrap">' + r.ratio_reason + '</span></div>';
            if (r.has_ratio_image) {
                h += '<div id="_bpcRatioImgContainer" style="margin-top: 10px; border-top: 1px dashed #e2e8f0; padding-top: 10px;">';
                h += '<div style="font-size:11px;font-weight:800;color:#94a3b8;margin-bottom:6px">🖼️ HÌNH ẢNH CHỨNG MINH SAI:</div>';
                h += '<div style="text-align:center;color:#94a3b8;font-size:12px;padding:20px" class="bpc-img-placeholder">⏳ Đang tải ảnh chứng minh sai...</div>';
                h += '</div>';
            }
            h += '</div>';
        }
        // Warning + shared
        if (r.cut_warning) h += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">⚠️ Cảnh Báo</span><span class="bpc-modal-val" style="color:#dc2626">' + r.cut_warning + '</span></div>';
        if (r.cut_shared) h += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">🔄 Cắt Chung</span><span class="bpc-modal-val" style="color:#6366f1;white-space:pre-line;line-height:1.5;font-size:10px">' + r.cut_shared + '</span></div>';
        h += '</div>';
        // Close button
        h += '<div style="padding:12px 24px;border-top:1px solid #f1f5f9;text-align:center"><button class="bpc-modal-btn cancel" style="width:100%" onclick="var m=document.getElementById(\'_bpcDetailModal\');if(m){m.classList.remove(\'show\');setTimeout(function(){m.remove()},300)}">Đóng</button></div>';
        h += '</div></div>';
        document.body.insertAdjacentHTML('beforeend', h);
        requestAnimationFrame(function() { document.getElementById('_bpcDetailModal').classList.add('show'); });

        // Background fetch image
        if (r.has_ratio_image) {
            apiCall('/api/cutting/records/' + recordId + '/image').then(function(imgRes) {
                var imgContainer = document.getElementById('_bpcRatioImgContainer');
                if (imgContainer && imgRes && imgRes.ratio_image) {
                    var placeholder = imgContainer.querySelector('.bpc-img-placeholder');
                    if (placeholder) placeholder.remove();
                    var imgHtml = '<div style="text-align:center"><img src="' + imgRes.ratio_image + '" style="max-width:100%;max-height:250px;border-radius:8px;border:1px solid #e2e8f0"></div>';
                    imgContainer.insertAdjacentHTML('beforeend', imgHtml);
                }
            }).catch(function(err) {
                console.error('[BPC] Lazy load image error:', err);
                var placeholder = document.querySelector('#_bpcRatioImgContainer .bpc-img-placeholder');
                if (placeholder) placeholder.textContent = '❌ Lỗi tải ảnh';
            });
        }
    } catch(e) {
        console.error('[BPC] Load detail error:', e);
        alert('Không thể tải chi tiết đơn cắt. Lỗi: ' + e.message);
    } finally {
        window._bpcDetailBusy = false;
    }
}

// ========== CẮT XONG MODAL ==========
function _bpcOpenDoneModal(recordId) {
    var r = _bpc.records.find(function(x) { return x.id === recordId; });
    if (!r) return;
    // Multi-cut group → open group done modal
    if (r.multi_cut_group_id) { return _bpcOpenGroupDoneModal(r.multi_cut_group_id); }
    var rolls = [];
    try { rolls = typeof r.selected_roll_ids === 'string' ? JSON.parse(r.selected_roll_ids) : (r.selected_roll_ids || []); } catch(e) {}
    window._bpcDoneData = { recordId: recordId, rolls: rolls, kgStart: Number(r.kg_start) || 0, orderQty: Number(r.order_quantity) || 0, imgData: null, targetRatio: Number(r.target_cut_ratio) || 0, unit: r.fabric_unit || 'kg', _allCut: false };
    var h = '<div class="bpc-modal-overlay" id="_bpcDoneModal" onclick="if(event.target===this)_bpcCloseDoneModal()">';
    h += '<div class="bpc-modal" style="width:560px;max-height:90vh;overflow:hidden;display:flex;flex-direction:column">';
    h += '<div class="bpc-modal-header" style="background:linear-gradient(135deg,#1e40af,#3b82f6)"><div class="m-icon">🏁</div><div><div class="m-title">CẮT XONG</div><div class="m-sub">' + (r.product_name||r.order_code||'') + '</div></div></div>';
    h += '<div class="bpc-modal-body" style="overflow-y:auto;flex:1">';
    // Read-only info
    h += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">📋 Tên SP</span><span class="bpc-modal-val" style="font-size:11px">' + (r.product_name||'—') + '</span></div>';
    h += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">🧵 Chất liệu</span><span class="bpc-modal-val"><span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700">' + (r.material_name||'—') + '</span></span></div>';
    h += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">🎨 Màu</span><span class="bpc-modal-val"><span style="background:#1e293b;color:#fff;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700">' + (r.fabric_color||'—') + '</span></span></div>';
    h += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">👤 NV Cắt</span><span class="bpc-modal-val" style="color:#059669">' + (r.cutter_name||'—') + '</span></div>';
    h += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">🏷️ SP Cắt</span><span class="bpc-modal-val"><span style="background:#dbeafe;color:#1d4ed8;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700">' + (r.cutting_category||'—') + '</span></span></div>';
    h += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">📦 SL Đơn</span><span class="bpc-modal-val" style="color:#0369a1;font-size:15px;font-weight:900">' + (r.order_quantity||'—') + '</span></div>';
    // SL Cắt input
    h += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">✏️ SL Cắt <span style="color:#dc2626">*</span></span><span class="bpc-modal-val"><input id="_bpcDoneQty" type="number" min="1" max="' + (r.order_quantity||9999) + '" value="' + (r.order_quantity||'') + '" oninput="_bpcDoneRecalc()" style="width:80px;padding:6px 10px;border:2px solid #3b82f6;border-radius:8px;font-size:14px;font-weight:800;text-align:center;color:#1e40af"></span></div>';
    // Rolls section
    h += '<div style="border-top:2px solid #e2e8f0;margin:10px 0;padding-top:10px">';
    h += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><span style="font-size:11px;font-weight:800;color:#1e40af;text-transform:uppercase;letter-spacing:1px">📦 CÂY CÒN LẠI</span>';
    h += '<button id="_bpcDoneAllCutBtn" onclick="_bpcDoneAllCut()" style="padding:4px 12px;background:#dc2626;color:#fff;border:none;border-radius:6px;font-size:10px;font-weight:700;cursor:pointer">🔴 Cắt hết tất cả</button></div>';
    h += '<div id="_bpcDoneRollsList">';
    if (rolls.length) {
        rolls.forEach(function(rl, idx) {
            var w = Number(rl.weight) || 0;
            h += '<div style="border:1.5px solid #e2e8f0;border-radius:10px;padding:10px 12px;margin-bottom:6px">';
            h += '<label style="display:flex;align-items:center;gap:10px;cursor:pointer">';
            h += '<input type="checkbox" class="_bpcDoneRollCb" data-idx="' + idx + '" data-rollid="' + rl.roll_id + '" data-weight="' + w + '" onchange="_bpcDoneToggleRoll(' + idx + ')" style="width:18px;height:18px;accent-color:#3b82f6">';
            h += '<span style="flex:1;font-size:12px;font-weight:700;color:#1e293b">' + (rl.label || 'Cây '+(idx+1)) + '</span>';
            h += '<span style="font-size:11px;font-weight:700;color:#64748b">' + w + 'kg</span></label>';
            h += '<div id="_bpcDoneRollInput_' + idx + '" style="display:none;margin-top:8px;padding-left:28px">';
            h += '<div style="display:flex;align-items:center;gap:6px"><span style="font-size:10px;color:#475569;font-weight:600">Còn lại:</span>';
            h += '<input id="_bpcDoneRollKg_' + idx + '" type="number" step="0.1" min="0.1" max="' + w + '" placeholder="0" oninput="_bpcDoneRecalc()" style="width:70px;padding:4px 8px;border:1.5px solid #3b82f6;border-radius:6px;font-size:12px;font-weight:700;text-align:center">';
            h += '<span style="font-size:10px;color:#64748b">kg (tối đa ' + w + ')</span></div></div>';
            h += '</div>';
        });
    } else {
        h += '<div style="text-align:center;padding:12px;color:#94a3b8;font-size:11px">Chưa có dữ liệu cây</div>';
    }
    h += '</div>';
    // Auto-calc stats
    h += '<div style="border-top:2px solid #e2e8f0;margin:10px 0;padding-top:10px;display:grid;grid-template-columns:1fr 1fr;gap:8px">';
    h += '<div style="background:#fef3c7;padding:8px;border-radius:8px;text-align:center"><div style="font-size:9px;font-weight:700;color:#92400e">⚖️ KG ĐẦU</div><div style="font-size:16px;font-weight:900;color:#b45309">' + _bpcFmtKg(r.kg_start || 0) + '</div></div>';
    h += '<div style="background:#fee2e2;padding:8px;border-radius:8px;text-align:center"><div style="font-size:9px;font-weight:700;color:#991b1b">✂️ TỔNG KG CẮT</div><div id="_bpcDoneKgCut" style="font-size:16px;font-weight:900;color:#dc2626">' + _bpcFmtKg(r.kg_start || 0) + '</div></div>';
    h += '</div>';
    h += '<div class="bpc-modal-row" style="margin-top:6px"><span class="bpc-modal-lbl">📊 Định Lượng Thực Tế</span><span class="bpc-modal-val" id="_bpcDoneRatio" style="font-size:16px;font-weight:900;color:#059669">—</span></div>';
    h += '<div class="bpc-modal-row" style="margin-top:6px"><span class="bpc-modal-lbl">⚖️ Định Lượng Cắt Yêu Cầu</span><span class="bpc-modal-val" style="font-size:14px;font-weight:700;color:#f59e0b">' + (r.target_cut_ratio || 0) + ' sp/' + (r.fabric_unit || 'kg') + '</span></div>';
    // Conditional: ratio reason + image
    h += '<div id="_bpcDoneRatioWarn" style="display:none;border-top:2px solid #fca5a5;margin:10px 0;padding-top:10px">';
    h += '<div style="background:#fef2f2;border:1.5px solid #fca5a5;border-radius:10px;padding:12px">';
    h += '<div style="font-size:11px;font-weight:800;color:#dc2626;margin-bottom:8px">⚠️ TỈ LỆ THẤP — BẮT BUỘC GHI LÝ DO (Định lượng tối thiểu: ' + (r.target_cut_ratio || 0) + ' sp/' + (r.fabric_unit || 'kg') + ')</div>';
    h += '<textarea id="_bpcDoneReason" placeholder="Nhập lý do cắt sai tỉ lệ..." rows="2" style="width:100%;padding:8px;border:1.5px solid #fca5a5;border-radius:6px;font-size:12px;resize:none;font-family:Inter,sans-serif"></textarea>';
    h += '<div style="margin-top:8px"><div style="font-size:10px;font-weight:700;color:#dc2626;margin-bottom:4px">📷 Hình ảnh (Ctrl+V hoặc chọn file) <span style="color:#dc2626">*</span></div>';
    h += '<div id="_bpcDoneImgArea" style="border:2px dashed #fca5a5;border-radius:8px;padding:16px;text-align:center;cursor:pointer;min-height:60px;position:relative" onclick="document.getElementById(\'_bpcDoneImgInput\').click()">';
    h += '<div id="_bpcDoneImgPreview" style="font-size:11px;color:#94a3b8">Ctrl+V paste ảnh hoặc click chọn file</div>';
    h += '<input type="file" id="_bpcDoneImgInput" accept="image/*" style="display:none" onchange="_bpcDoneImgFile(event)"></div></div>';
    h += '</div></div>';
    h += '</div>';
    // Actions
    h += '<div class="bpc-modal-actions"><button class="bpc-modal-btn cancel" onclick="_bpcCloseDoneModal()">Hủy</button>';
    h += '<button class="bpc-modal-btn confirm" id="_bpcDoneSubmitBtn" style="background:linear-gradient(135deg,#1e40af,#3b82f6)" onclick="_bpcSubmitDone(' + recordId + ')">🏁 XÁC NHẬN CẮT XONG</button></div>';
    h += '</div></div>';
    document.body.insertAdjacentHTML('beforeend', h);
    requestAnimationFrame(function() { document.getElementById('_bpcDoneModal').classList.add('show'); });
    // Paste handler
    document.addEventListener('paste', _bpcDonePasteHandler);
    _bpcDoneRecalc();
}

function _bpcDonePasteHandler(e) {
    if (!document.getElementById('_bpcDoneModal')) { document.removeEventListener('paste', _bpcDonePasteHandler); return; }
    var items = (e.clipboardData || e.originalEvent.clipboardData).items;
    for (var i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
            var blob = items[i].getAsFile();
            _bpcCompressImage(blob, function(compressed) {
                if (!compressed) return;
                window._bpcDoneData.imgData = compressed;
                var prev = document.getElementById('_bpcDoneImgPreview');
                if (prev) prev.innerHTML = '<img src="' + compressed + '" style="max-width:100%;max-height:120px;border-radius:6px">';
            });
            e.preventDefault();
            break;
        }
    }
}

function _bpcDoneImgFile(e) {
    var f = e.target.files[0]; if (!f) return;
    _bpcCompressImage(f, function(compressed) {
        if (!compressed) return;
        window._bpcDoneData.imgData = compressed;
        var prev = document.getElementById('_bpcDoneImgPreview');
        if (prev) prev.innerHTML = '<img src="' + compressed + '" style="max-width:100%;max-height:120px;border-radius:6px">';
    });
}

function _bpcDoneToggleRoll(idx) {
    if (window._bpcDoneData) window._bpcDoneData._allCut = false;
    var btn = document.getElementById('_bpcDoneAllCutBtn');
    if (btn) { btn.style.background = '#dc2626'; btn.textContent = '🔴 Cắt hết tất cả'; }
    var rl = document.getElementById('_bpcDoneRollsList'); if (rl) rl.style.display = '';
    var cb = document.querySelector('._bpcDoneRollCb[data-idx="' + idx + '"]');
    var inp = document.getElementById('_bpcDoneRollInput_' + idx);
    if (cb && inp) {
        inp.style.display = cb.checked ? 'block' : 'none';
        if (!cb.checked) { var kg = document.getElementById('_bpcDoneRollKg_' + idx); if (kg) kg.value = ''; }
    }
    _bpcDoneRecalc();
}

function _bpcDoneAllCut() {
    var d = window._bpcDoneData; if (!d) return;
    if (d._allCut) {
        d._allCut = false;
        var btn2 = document.getElementById('_bpcDoneAllCutBtn');
        if (btn2) { btn2.style.background = '#dc2626'; btn2.textContent = '🔴 Cắt hết tất cả'; }
        var rl2 = document.getElementById('_bpcDoneRollsList');
        if (rl2) rl2.style.display = '';
        _bpcDoneRecalc();
        return;
    }
    d._allCut = true;
    document.querySelectorAll('._bpcDoneRollCb').forEach(function(cb) {
        cb.checked = false;
        var idx = cb.dataset.idx;
        var inp = document.getElementById('_bpcDoneRollInput_' + idx);
        if (inp) inp.style.display = 'none';
        var kg = document.getElementById('_bpcDoneRollKg_' + idx);
        if (kg) kg.value = '';
    });
    var btn = document.getElementById('_bpcDoneAllCutBtn');
    if (btn) { btn.style.background = '#059669'; btn.textContent = 'Đã Cắt Hết Tất Cả'; }
    var rl = document.getElementById('_bpcDoneRollsList');
    if (rl) rl.style.display = 'none';
    _bpcDoneRecalc();
}

function _bpcDoneRecalc() {
    var d = window._bpcDoneData; if (!d) return;
    var kgRemain = 0;
    var cbs = document.querySelectorAll('._bpcDoneRollCb:checked');
    cbs.forEach(function(cb) {
        var idx = cb.dataset.idx;
        var kg = document.getElementById('_bpcDoneRollKg_' + idx);
        kgRemain += kg ? (parseFloat(kg.value) || 0) : 0;
    });
    var kgCut = d.kgStart - kgRemain;
    var el = document.getElementById('_bpcDoneKgCut');
    if (el) el.textContent = _bpcFmtKg(kgCut);
    var qty = parseFloat(document.getElementById('_bpcDoneQty').value) || 0;
    var ratio = kgCut > 0 ? Math.round((qty / kgCut) * 100) / 100 : 0;
    var ratioEl = document.getElementById('_bpcDoneRatio');
    if (ratioEl) {
        ratioEl.textContent = ratio ? ratio.toFixed(2) + ' sp/' + d.unit : '—';
        if (d.targetRatio > 0) {
            ratioEl.style.color = ratio >= d.targetRatio ? '#059669' : '#dc2626';
        } else {
            ratioEl.style.color = '#3b82f6';
        }
    }
    
    // Show/hide ratio warning based on target ratio setup
    var warn = document.getElementById('_bpcDoneRatioWarn');
    if (warn) {
        if (d.targetRatio > 0 && ratio < d.targetRatio) {
            warn.style.display = 'block';
        } else {
            warn.style.display = 'none';
        }
    }
}

function _bpcCloseDoneModal() {
    document.removeEventListener('paste', _bpcDonePasteHandler);
    var m = document.getElementById('_bpcDoneModal');
    if (m) { m.classList.remove('show'); setTimeout(function() { m.remove(); }, 300); }
}

async function _bpcSubmitDone(recordId) {
    if (window._bpcBusy) return;
    window._bpcBusy = true;
    var d = window._bpcDoneData; if (!d) { window._bpcBusy = false; return; }
    var qty = parseInt(document.getElementById('_bpcDoneQty').value);
    if (!qty || qty <= 0) { showToast('⚠️ Vui lòng nhập SL Cắt', 'error'); window._bpcBusy = false; return; }
    if (d.orderQty && qty > d.orderQty) { showToast('⚠️ SL Cắt không được lớn hơn SL Đơn (' + d.orderQty + ')', 'error'); window._bpcBusy = false; return; }
    // Validate: must select rolls or click "Cắt hết tất cả"
    var hasCheckedRoll = document.querySelectorAll('._bpcDoneRollCb:checked').length > 0;
    if (!hasCheckedRoll && !d._allCut) {
        showToast('⚠️ Vui lòng chọn cây còn lại hoặc ấn "Cắt hết tất cả"', 'error');
        window._bpcBusy = false;
        return;
    }
    // Collect roll remains
    var rollRemains = [];
    var cbs = document.querySelectorAll('._bpcDoneRollCb');
    var hasError = false;
    cbs.forEach(function(cb) {
        if (cb.checked) {
            var idx = cb.dataset.idx;
            var kg = document.getElementById('_bpcDoneRollKg_' + idx);
            var val = kg ? parseFloat(kg.value) : 0;
            var maxW = parseFloat(cb.dataset.weight) || 0;
            if (!val || val <= 0) { hasError = true; if (kg) { kg.style.border = '2px solid #dc2626'; kg.focus(); } }
            if (val > maxW) { hasError = true; if (kg) { kg.style.border = '2px solid #dc2626'; kg.focus(); } showToast('⚠️ Kg còn lại không thể > ' + maxW, 'error'); }
            rollRemains.push({ roll_id: Number(cb.dataset.rollid), remaining_weight: val });
        }
    });
    if (hasError) { showToast('⚠️ Kiểm tra lại kg còn lại các cây đã chọn', 'error'); window._bpcBusy = false; return; }
    // Confirm if all rolls cut
    var unchecked = d.rolls.length - rollRemains.length;
    if (unchecked > 0 && !confirm('Có ' + unchecked + ' cây vải sẽ cắt hết (0kg). Xác nhận?')) { window._bpcBusy = false; return; }

    var kgRemain = 0;
    rollRemains.forEach(function(r) { kgRemain += r.remaining_weight || 0; });
    var kgCut = d.kgStart - kgRemain;
    var ratio = kgCut > 0 ? Math.round((qty / kgCut) * 100) / 100 : 0;

    var body = { action: 'cut_done', cut_quantity: qty, roll_remains: rollRemains };
    
    if (d.targetRatio > 0 && ratio < d.targetRatio) {
        var reason = document.getElementById('_bpcDoneReason');
        if (!reason || !reason.value.trim() || reason.value.trim().length < 2) {
            showToast('⚠️ Tỉ lệ cắt thấp hơn định lượng (' + d.targetRatio + '). Vui lòng nhập lý do!', 'error');
            window._bpcBusy = false;
            return;
        }
        if (!d.imgData) {
            showToast('⚠️ Tỉ lệ cắt thấp hơn định lượng (' + d.targetRatio + '). Vui lòng chụp/chọn ảnh minh chứng!', 'error');
            window._bpcBusy = false;
            return;
        }
        body.ratio_reason = reason.value.trim();
        body.ratio_image = d.imgData;
    }

    var btn = document.getElementById('_bpcDoneSubmitBtn');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Đang xử lý...'; }
    try {
        await apiCall('/api/cutting/toggle/' + recordId, 'POST', body);
        _bpcCloseDoneModal();
        showToast('✅ Cắt xong!');
        await _bpcLoadAll();
    } catch(e) {
        showToast(e.message || 'Lỗi', 'error');
        if (btn) { btn.disabled = false; btn.textContent = '🏁 XÁC NHẬN CẮT XONG'; }
    } finally {
        window._bpcBusy = false;
    }
}

// ========== GROUP DONE MODAL (Multi-cut Desktop) ==========
function _bpcOpenGroupDoneModal(groupId) {
    if (window._bpcBusy) return;
    window._bpcBusy = true;
    var groupRecs = _bpc.records.filter(function(x) { return x.multi_cut_group_id === groupId; });
    if (groupRecs.length < 2) { showToast('Nhóm không đủ đơn', 'error'); window._bpcBusy = false; return; }
    var ref = groupRecs[0];
    var rolls = []; try { rolls = typeof ref.selected_roll_ids === 'string' ? JSON.parse(ref.selected_roll_ids) : (ref.selected_roll_ids || []); } catch(e) {}
    var kgStart = Number(ref.kg_start) || 0;
    window._bpcGDone = { groupId: groupId, records: groupRecs, rolls: rolls, kgStart: kgStart, _allCut: false, targetRatio: Number(ref.target_cut_ratio) || 0, imgData: null, unit: ref.fabric_unit || 'kg' };
    var h = '<div class="bpc-modal-overlay" id="_bpcGDoneModal" onclick="if(event.target===this)_bpcCloseGDone()">';
    h += '<div class="bpc-modal" style="width:580px;max-height:90vh;overflow:hidden;display:flex;flex-direction:column">';
    h += '<div class="bpc-modal-header" style="background:linear-gradient(135deg,#7c3aed,#a855f7)"><div class="m-icon">🏁</div><div><div class="m-title">CẮT XONG NHÓM</div>';
    h += '<div class="m-sub">' + groupRecs.length + ' đơn · ' + rolls.length + ' cây · ' + kgStart + 'kg</div></div></div>';
    h += '<div class="bpc-modal-body" style="overflow-y:auto;flex:1">';
    h += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">🧵 Chất liệu</span><span class="bpc-modal-val"><span style="background:#fef3c7;color:#92400e;padding:2px 10px;border-radius:6px;font-weight:700">' + (ref.material_name||'—') + '</span></span></div>';
    h += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">🎨 Màu</span><span class="bpc-modal-val"><span style="background:#1e293b;color:#fff;padding:2px 10px;border-radius:6px;font-weight:700">' + (ref.fabric_color||'—') + '</span></span></div>';
    // Orders with SL input
    h += '<div style="border-top:2px solid #e2e8f0;margin:12px 0;padding-top:12px"><div style="font-size:11px;font-weight:800;color:#7c3aed;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px">📋 SỐ LƯỢNG CẮT TỪNG ĐƠN</div>';
    groupRecs.forEach(function(gr, i) {
        h += '<div style="border:1.5px solid #e9d5ff;border-radius:10px;padding:12px;margin-bottom:8px;background:#faf5ff">';
        h += '<div style="font-size:12px;font-weight:700;color:#1e293b;margin-bottom:6px">' + (gr.product_name||gr.order_code||'Đơn '+(i+1)) + '</div>';
        h += '<div style="display:flex;align-items:center;justify-content:space-between">';
        h += '<span style="font-size:11px;color:#7c3aed">SL Đơn: <b>' + gr.order_quantity + '</b></span>';
        h += '<div style="display:flex;align-items:center;gap:6px"><span style="font-size:11px;color:#64748b;font-weight:600">SL Cắt:</span>';
        const defaultQty = gr.cut_quantity || gr.order_quantity || '';
        h += '<input id="_bpcGQ_' + gr.id + '" type="number" min="1" max="' + (gr.order_quantity||9999) + '" value="' + defaultQty + '" oninput="_bpcGDoneValidQty(this,' + gr.order_quantity + ')" style="width:80px;padding:6px 10px;border:2px solid #8b5cf6;border-radius:8px;font-size:14px;font-weight:800;text-align:center;color:#7c3aed"></div></div></div>';
    });
    h += '</div>';
    // Rolls
    h += '<div style="border-top:2px solid #e2e8f0;margin:12px 0;padding-top:12px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><span style="font-size:11px;font-weight:800;color:#7c3aed;text-transform:uppercase;letter-spacing:1px">📦 CÂY CÒN LẠI</span>';
    h += '<button id="_bpcGCutAllBtn" onclick="_bpcGDoneAllCut()" style="padding:4px 14px;background:#dc2626;color:#fff;border:none;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;min-height:32px">🔴 Cắt hết tất cả</button></div>';
    h += '<div id="_bpcGRollsList">';
    rolls.forEach(function(rl, idx) {
        var w = Number(rl.weight) || 0;
        h += '<div style="border:1.5px solid #e2e8f0;border-radius:10px;padding:10px 12px;margin-bottom:6px">';
        h += '<label style="display:flex;align-items:center;gap:10px;cursor:pointer">';
        h += '<input type="checkbox" class="_bpcGRollCb" data-idx="' + idx + '" data-rollid="' + rl.roll_id + '" data-weight="' + w + '" onchange="_bpcGDoneToggleRoll(' + idx + ')" style="width:18px;height:18px;accent-color:#8b5cf6">';
        h += '<span style="flex:1;font-size:13px;font-weight:600;color:#1e293b">' + (rl.label||'Cây '+(idx+1)) + '</span>';
        h += '<span style="font-size:11px;font-weight:700;color:#64748b">' + w + 'kg</span></label>';
        h += '<div id="_bpcGRollInp_' + idx + '" style="display:none;margin-top:8px;padding-left:28px"><div style="display:flex;align-items:center;gap:6px"><span style="font-size:10px;color:#475569;font-weight:600">Còn:</span>';
        h += '<input id="_bpcGRollKg_' + idx + '" type="number" step="0.1" min="0.1" max="' + w + '" oninput="_bpcGDoneValidKg(this,' + w + ')" style="width:70px;padding:4px 8px;border:1.5px solid #8b5cf6;border-radius:6px;font-size:12px;font-weight:700;text-align:center">';
        h += '<span style="font-size:10px;color:#64748b">kg</span></div></div></div>';
    });
    h += '</div></div>';
    // Stats
    h += '<div style="border-top:2px solid #e2e8f0;margin:12px 0;padding-top:12px;display:grid;grid-template-columns:1fr 1fr;gap:8px">';
    h += '<div style="background:#fef3c7;padding:8px;border-radius:8px;text-align:center"><div style="font-size:9px;font-weight:700;color:#92400e">⚖️ KG ĐẦU</div><div style="font-size:16px;font-weight:900;color:#b45309">' + _bpcFmtKg(kgStart) + '</div></div>';
    h += '<div style="background:#fee2e2;padding:8px;border-radius:8px;text-align:center"><div style="font-size:9px;font-weight:700;color:#991b1b">✂️ TỔNG KG CẮT</div><div id="_bpcGKgCut" style="font-size:16px;font-weight:900;color:#dc2626">' + _bpcFmtKg(kgStart) + '</div></div></div>';
    h += '<div id="_bpcGDistrib" style="margin-top:8px"></div>';
    // Warning Ratio Reason Container
    h += '<div id="_bpcGDoneRatioWarn" style="display:none;border-top:2px solid #fca5a5;margin:10px 0;padding-top:10px">';
    h += '<div style="background:#fef2f2;border:1.5px solid #fca5a5;border-radius:10px;padding:12px">';
    h += '<div style="font-size:11px;font-weight:800;color:#dc2626;margin-bottom:8px">⚠️ TỈ LỆ THẤP — BẮT BUỘC GHI LÝ DO (Định lượng tối thiểu: ' + (ref.target_cut_ratio || 0) + ' sp/' + (ref.fabric_unit || 'kg') + ')</div>';
    h += '<textarea id="_bpcGDoneReason" placeholder="Nhập lý do cắt sai tỉ lệ..." rows="2" style="width:100%;padding:8px;border:1.5px solid #fca5a5;border-radius:6px;font-size:12px;resize:none;font-family:Inter,sans-serif"></textarea>';
    h += '<div style="margin-top:8px"><div style="font-size:10px;font-weight:700;color:#dc2626;margin-bottom:4px">📷 Hình ảnh (Ctrl+V hoặc chọn file) <span style="color:#dc2626">*</span></div>';
    h += '<div id="_bpcGDoneImgArea" style="border:2px dashed #fca5a5;border-radius:8px;padding:16px;text-align:center;cursor:pointer;min-height:60px;position:relative" onclick="document.getElementById(\'_bpcGDoneImgInput\').click()">';
    h += '<div id="_bpcGDoneImgPreview" style="font-size:11px;color:#94a3b8">Ctrl+V paste ảnh hoặc click chọn file</div>';
    h += '<input type="file" id="_bpcGDoneImgInput" accept="image/*" style="display:none" onchange="_bpcGDoneImgFile(event)"></div></div>';
    h += '</div></div>';
    h += '</div>';
    h += '<div class="bpc-modal-actions"><button class="bpc-modal-btn cancel" onclick="_bpcCloseGDone()">Hủy</button>';
    h += '<button class="bpc-modal-btn confirm" id="_bpcGDoneOk" style="background:linear-gradient(135deg,#7c3aed,#a855f7)" onclick="_bpcSubmitGDone()">🏁 XÁC NHẬN CẮT XONG NHÓM</button></div>';
    h += '</div></div>';
    document.body.insertAdjacentHTML('beforeend', h);
    requestAnimationFrame(function() { document.getElementById('_bpcGDoneModal').classList.add('show'); });
    document.addEventListener('paste', _bpcGDonePasteHandler);
    _bpcGDoneRecalc();
}
function _bpcCloseGDone() {
    window._bpcBusy = false;
    document.removeEventListener('paste', _bpcGDonePasteHandler);
    var m = document.getElementById('_bpcGDoneModal');
    if (m) { m.classList.remove('show'); setTimeout(function() { m.remove(); }, 300); }
}

function _bpcGDonePasteHandler(e) {
    if (!document.getElementById('_bpcGDoneModal')) { document.removeEventListener('paste', _bpcGDonePasteHandler); return; }
    var items = (e.clipboardData || e.originalEvent.clipboardData).items;
    for (var i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
            var blob = items[i].getAsFile();
            _bpcCompressImage(blob, function(compressed) {
                if (!compressed) return;
                window._bpcGDone.imgData = compressed;
                var prev = document.getElementById('_bpcGDoneImgPreview');
                if (prev) prev.innerHTML = '<img src="' + compressed + '" style="max-width:100%;max-height:120px;border-radius:6px">';
            });
            e.preventDefault();
            break;
        }
    }
}

function _bpcGDoneImgFile(e) {
    var f = e.target.files[0]; if (!f) return;
    _bpcCompressImage(f, function(compressed) {
        if (!compressed) return;
        window._bpcGDone.imgData = compressed;
        var prev = document.getElementById('_bpcGDoneImgPreview');
        if (prev) prev.innerHTML = '<img src="' + compressed + '" style="max-width:100%;max-height:120px;border-radius:6px">';
    });
}
function _bpcGDoneToggleRoll(idx) {
    window._bpcGDone._allCut = false;
    var btn = document.getElementById('_bpcGCutAllBtn');
    if (btn) { btn.style.background = '#dc2626'; btn.textContent = '🔴 Cắt hết tất cả'; }
    var rl = document.getElementById('_bpcGRollsList'); if (rl) rl.style.display = '';
    var cb = document.querySelector('._bpcGRollCb[data-idx="' + idx + '"]');
    var inp = document.getElementById('_bpcGRollInp_' + idx);
    if (cb && inp) { inp.style.display = cb.checked ? 'block' : 'none'; if (!cb.checked) { var k = document.getElementById('_bpcGRollKg_' + idx); if (k) k.value = ''; } }
    _bpcGDoneRecalc();
}
function _bpcGDoneAllCut() {
    if (window._bpcGDone._allCut) { window._bpcGDone._allCut = false; var btn2 = document.getElementById('_bpcGCutAllBtn'); if (btn2) { btn2.style.background = '#dc2626'; btn2.textContent = '🔴 Cắt hết tất cả'; } var rl2 = document.getElementById('_bpcGRollsList'); if (rl2) rl2.style.display = ''; _bpcGDoneRecalc(); return; }
    window._bpcGDone._allCut = true;
    document.querySelectorAll('._bpcGRollCb').forEach(function(cb) { cb.checked = false; var i = cb.dataset.idx; var inp = document.getElementById('_bpcGRollInp_' + i); if (inp) inp.style.display = 'none'; var k = document.getElementById('_bpcGRollKg_' + i); if (k) k.value = ''; });
    var btn = document.getElementById('_bpcGCutAllBtn');
    if (btn) { btn.style.background = '#059669'; btn.textContent = 'Đã Cắt Hết Tất Cả'; }
    var rl = document.getElementById('_bpcGRollsList'); if (rl) rl.style.display = 'none';
    _bpcGDoneRecalc();
}
function _bpcGDoneValidQty(el, max) {
    var v = parseInt(el.value) || 0;
    if (v > max) { el.style.border = '2px solid #ef4444'; el.style.color = '#ef4444'; }
    else { el.style.border = '2px solid #8b5cf6'; el.style.color = '#7c3aed'; }
    _bpcGDoneRecalc();
}
function _bpcGDoneValidKg(el, max) {
    var v = parseFloat(el.value) || 0;
    if (v > max) { el.style.border = '2px solid #ef4444'; el.style.color = '#ef4444'; }
    else { el.style.border = '1.5px solid #8b5cf6'; el.style.color = '#7c3aed'; }
    _bpcGDoneRecalc();
}
function _bpcGDoneRecalc() {
    var d = window._bpcGDone; if (!d) return;
    var kgR = 0; document.querySelectorAll('._bpcGRollCb:checked').forEach(function(cb) { var k = document.getElementById('_bpcGRollKg_' + cb.dataset.idx); kgR += k ? (parseFloat(k.value) || 0) : 0; });
    var totalKgCut = d.kgStart - kgR;
    var el = document.getElementById('_bpcGKgCut'); if (el) el.textContent = _bpcFmtKg(totalKgCut);
    var totalQty = 0; var qtys = [];
    d.records.forEach(function(r) { var inp = document.getElementById('_bpcGQ_' + r.id); var q = inp ? parseInt(inp.value) || 0 : 0; qtys.push({ id: r.id, qty: q, name: r.product_name || r.order_code }); totalQty += q; });
    var dh = '';
    var combinedRatio = 0;
    if (totalKgCut > 0) {
        combinedRatio = Math.round((totalQty / totalKgCut) * 100) / 100;
        var rc = '#3b82f6';
        if (d.targetRatio > 0) {
            rc = combinedRatio >= d.targetRatio ? '#059669' : '#dc2626';
        }
        dh += '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:8px">';
        dh += '<span style="font-size:12px;font-weight:800;color:#1e293b">📊 TỈ LỆ CHUNG</span>';
        dh += '<span style="font-size:11px;color:#64748b">' + totalQty + ' sp / ' + _bpcFmtKg(totalKgCut) + ' ' + d.unit + '</span>';
        dh += '<span style="font-size:18px;font-weight:900;color:' + rc + '">' + combinedRatio.toFixed(2) + ' sp/' + d.unit + '</span></div>';
        dh += '<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 12px;margin-top:6px;"><span style="font-size:12px;font-weight:800;color:#1e293b">⚖️ Định Lượng Cắt Yêu Cầu</span><span style="font-size:14px;font-weight:700;color:#f59e0b">' + (d.targetRatio || 0) + ' sp/' + d.unit + '</span></div>';
    }
    var dp = document.getElementById('_bpcGDistrib'); if (dp) dp.innerHTML = dh;
    
    // Show/hide ratio warning container for group cutting
    var warn = document.getElementById('_bpcGDoneRatioWarn');
    if (warn) {
        if (d.targetRatio > 0 && combinedRatio < d.targetRatio) {
            warn.style.display = 'block';
        } else {
            warn.style.display = 'none';
        }
    }
}
async function _bpcSubmitGDone() {
    if (window._bpcBusy) return;
    window._bpcBusy = true;
    var d = window._bpcGDone; if (!d) { window._bpcBusy = false; return; }
    var items = [];
    var totalQty = 0;
    for (var i = 0; i < d.records.length; i++) {
        var r = d.records[i]; var inp = document.getElementById('_bpcGQ_' + r.id);
        var qty = inp ? parseInt(inp.value) : 0;
        if (!qty || qty <= 0) { showToast('Nhập SL Cắt cho tất cả đơn', 'error'); window._bpcBusy = false; return; }
        items.push({ record_id: r.id, cut_quantity: qty });
        totalQty += qty;
    }
    var hasChecked = document.querySelectorAll('._bpcGRollCb:checked').length > 0;
    if (!hasChecked && !d._allCut) { showToast('Chọn cây còn lại hoặc ấn "Cắt hết"', 'error'); window._bpcBusy = false; return; }
    var rollRemains = []; var err = false;
    document.querySelectorAll('._bpcGRollCb').forEach(function(cb) {
        if (cb.checked) { var k = document.getElementById('_bpcGRollKg_' + cb.dataset.idx); var v = k ? parseFloat(k.value) : 0; var mx = parseFloat(cb.dataset.weight) || 0;
        if (!v || v <= 0) { err = true; if (k) k.style.border = '2px solid #ef4444'; }
        if (v > mx) { err = true; showToast('Kg > ' + mx, 'error'); }
        rollRemains.push({ roll_id: Number(cb.dataset.rollid), remaining_weight: v }); }
    });
    if (err) { showToast('Kiểm tra kg còn lại', 'error'); window._bpcBusy = false; return; }
    var uc = d.rolls.length - rollRemains.length;
    if (uc > 0 && !confirm(uc + ' cây sẽ cắt hết (0kg). OK?')) { window._bpcBusy = false; return; }

    var kgR = 0;
    rollRemains.forEach(function(r) { kgR += r.remaining_weight || 0; });
    var totalKgCut = d.kgStart - kgR;
    var combinedRatio = totalKgCut > 0 ? Math.round((totalQty / totalKgCut) * 100) / 100 : 0;

    var body = { group_id: d.groupId, items: items, roll_remains: rollRemains };

    if (d.targetRatio > 0 && combinedRatio < d.targetRatio) {
        var reason = document.getElementById('_bpcGDoneReason');
        if (!reason || !reason.value.trim() || reason.value.trim().length < 2) {
            showToast('⚠️ Tỉ lệ cắt thấp hơn định lượng (' + d.targetRatio + '). Vui lòng nhập lý do!', 'error');
            window._bpcBusy = false;
            return;
        }
        if (!d.imgData) {
            showToast('⚠️ Tỉ lệ cắt thấp hơn định lượng (' + d.targetRatio + '). Vui lòng chụp/chọn ảnh minh chứng!', 'error');
            window._bpcBusy = false;
            return;
        }
        body.ratio_reason = reason.value.trim();
        body.ratio_image = d.imgData;
    }

    var btn = document.getElementById('_bpcGDoneOk'); if (btn) { btn.disabled = true; btn.textContent = '⏳ Đang xử lý...'; }
    try {
        await apiCall('/api/cutting/multi-cut/done', 'POST', body);
        _bpcCloseGDone(); showToast('✅ Cắt xong nhóm ' + items.length + ' đơn!'); await _bpcLoadAll();
    } catch(e) {
        showToast(e.message || 'Lỗi', 'error');
        if (btn) { btn.disabled = false; btn.textContent = '🏁 XÁC NHẬN CẮT XONG NHÓM'; }
    } finally {
        window._bpcBusy = false;
    }
}

// ========== MULTI-CUT WIZARD (Desktop) ==========
var _mcData = { step: 1, materials: [], rolls: [], candidates: [], selMat: '', selColor: '', selRolls: [], selOrders: [] };

async function _bpcOpenMultiCut() {
    _mcData = { step: 1, materials: [], rolls: [], candidates: [], selMat: '', selColor: '', selRolls: [], selOrders: [] };
    var h = '<div class="bpc-modal-overlay" id="_mcModal" onclick="if(event.target===this)_mcClose()">';
    h += '<div class="bpc-modal" style="width:580px;max-height:90vh;overflow:hidden;display:flex;flex-direction:column">';
    h += '<div class="bpc-modal-header" style="background:linear-gradient(135deg,#ea580c,#f97316)"><div class="m-icon">✂️</div><div><div class="m-title">CẮT NHIỀU ĐƠN</div><div class="m-sub">Gộp các đơn cùng chất liệu & màu</div></div></div>';
    h += '<div class="bpc-modal-body" id="_mcBody" style="overflow-y:auto;flex:1;max-height:65vh"><div style="text-align:center;padding:30px;color:#94a3b8">⏳ Đang tải...</div></div>';
    h += '<div class="bpc-modal-actions" id="_mcActions" style="display:none"><button class="bpc-modal-btn cancel" onclick="_mcClose()">Hủy</button><button class="bpc-modal-btn cancel" id="_mcBackBtn" onclick="_mcBack()" style="display:none">◀ Quay lại</button><button class="bpc-modal-btn confirm" id="_mcNextBtn" onclick="_mcNext()" style="background:linear-gradient(135deg,#ea580c,#f97316)">Tiếp theo ▶</button></div>';
    h += '</div></div>';
    document.body.insertAdjacentHTML('beforeend', h);
    requestAnimationFrame(function() { document.getElementById('_mcModal').classList.add('show'); });
    try {
        var res = await apiCall('/api/cutting/available-materials');
        _mcData.materials = res.materials || [];
        document.getElementById('_mcActions').style.display = 'flex';
        _mcRenderStep();
    } catch(e) { document.getElementById('_mcBody').innerHTML = '<div style="text-align:center;padding:30px;color:#ef4444">❌ ' + (e.message||'Lỗi') + '</div>'; }
}

function _mcClose() { var m = document.getElementById('_mcModal'); if (m) { m.classList.remove('show'); setTimeout(function() { m.remove(); }, 300); } }

function _mcRenderStep() {
    var body = document.getElementById('_mcBody'); if (!body) return;
    var backBtn = document.getElementById('_mcBackBtn');
    var nextBtn = document.getElementById('_mcNextBtn');
    if (backBtn) backBtn.style.display = _mcData.step > 1 ? '' : 'none';

    if (_mcData.step === 1) {
        // Step 1: Select material + color
        var mats = _mcData.materials;
        var matNames = []; var matMap = {};
        mats.forEach(function(m) { if (!matMap[m.material_name]) { matMap[m.material_name] = []; matNames.push(m.material_name); } matMap[m.material_name].push(m); });
        var h = '<div style="font-size:11px;font-weight:800;color:#ea580c;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px">BƯỚC 1/4: CHỌN CHẤT LIỆU & MÀU</div>';
        h += '<div style="margin-bottom:12px"><label style="font-size:12px;font-weight:700;color:#475569;display:block;margin-bottom:4px">🧵 CHẤT LIỆU <span style="color:#dc2626">*</span></label>';
        h += '<select id="_mcMatSel" onchange="_mcMatChanged()" style="width:100%;padding:10px;border:2px solid #e2e8f0;border-radius:10px;font-size:14px;font-weight:700;font-family:Inter,sans-serif;color:#000;background:#fff"><option value="" style="color:#000;background:#fff">— Chọn chất liệu —</option>';
        matNames.forEach(function(n) { h += '<option value="' + n + '" style="color:#000;background:#fff"' + (_mcData.selMat === n ? ' selected' : '') + '>' + n + '</option>'; });
        h += '</select></div>';
        h += '<div style="margin-bottom:12px"><label style="font-size:12px;font-weight:700;color:#475569;display:block;margin-bottom:4px">🎨 MÀU SẮC <span style="color:#dc2626">*</span></label>';
        h += '<select id="_mcColorSel" onchange="_mcColorChanged()" style="width:100%;padding:10px;border:2px solid #e2e8f0;border-radius:10px;font-size:14px;font-weight:700;font-family:Inter,sans-serif;color:#000;background:#fff"><option value="" style="color:#000;background:#fff">— Chọn màu —</option>';
        if (_mcData.selMat && matMap[_mcData.selMat]) {
            matMap[_mcData.selMat].forEach(function(m) { h += '<option value="' + m.color_name + '" style="color:#000;background:#fff"' + (_mcData.selColor === m.color_name ? ' selected' : '') + '>' + m.color_name + ' (' + m.roll_count + ' cây tổng ' + _bpcFmtKg(m.total_weight) + 'kg)</option>'; });
        }
        h += '</select></div>';
        body.innerHTML = h;
        if (nextBtn) nextBtn.textContent = 'Tiếp theo ▶';
    } else if (_mcData.step === 2) {
        // Step 2: Select rolls
        var h = '<div style="font-size:11px;font-weight:800;color:#ea580c;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">BƯỚC 2/4: CHỌN CÂY VẢI</div>';
        h += '<div style="font-size:12px;color:#475569;margin-bottom:12px">🧵 ' + _mcData.selMat + ' · 🎨 ' + _mcData.selColor + '</div>';
        if (!_mcData.rolls.length) { h += '<div style="text-align:center;padding:20px;color:#f59e0b;background:#fef3c7;border-radius:8px">⚠️ Không tìm thấy cây vải khả dụng</div>'; }
        else {
            _mcData.rolls.forEach(function(r) {
                var dis = r.locked ? ' disabled' : '', op = r.locked ? 'opacity:0.4;' : '';
                var chk = _mcData.selRolls.indexOf(r.id) >= 0 ? ' checked' : '';
                h += '<label style="display:flex;align-items:center;gap:10px;padding:8px 12px;border:1.5px solid #e2e8f0;border-radius:10px;margin-bottom:6px;cursor:' + (r.locked?'not-allowed':'pointer') + ';' + op + '">';
                h += '<input type="checkbox" class="_mcRollCb" value="' + r.id + '" data-weight="' + r.weight + '"' + dis + chk + ' onchange="_mcRollChanged()" style="width:18px;height:18px;accent-color:#ea580c">';
                h += '<span style="flex:1;font-size:13px;font-weight:600;color:#1e293b">' + r.label + (r.is_original_tree ? ' <span style="background:#ea580c;color:#fff;font-size:8px;padding:1px 5px;border-radius:3px;font-weight:800;margin-left:4px;display:inline-block;vertical-align:middle">CÂY NGUYÊN</span>' : '') + '</span>';
                if (r.locked) h += '<span style="color:#ef4444;font-size:10px">🔒 ' + (r.locked_order ? r.locked_order + ' — ' : '') + (r.locked_by||'') + '</span>';
                h += '</label>';
            });
        }
        h += '<div style="border-top:2px solid #e2e8f0;margin-top:10px;padding-top:10px;display:flex;justify-content:space-between"><span style="font-size:13px;font-weight:800;color:#1e293b">⚖️ KG ĐẦU</span><span id="_mcKgDisp" style="font-size:20px;font-weight:900;color:#ea580c">0.00 kg</span></div>';
        body.innerHTML = h;
        _mcRollChanged();
        if (nextBtn) nextBtn.textContent = 'Tiếp theo ▶';
    } else if (_mcData.step === 3) {
        // Step 3: Select unclaimed orders
        var readyCount = 0; _mcData.candidates.forEach(function(c) { if (c.canSelect) readyCount++; });
        var h = '<div style="font-size:11px;font-weight:800;color:#ea580c;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">BƯỚC 3/4: CHỌN ĐƠN CẮT CHUNG</div>';
        h += '<div style="font-size:12px;color:#475569;margin-bottom:12px">🧵 ' + _mcData.selMat + ' · 🎨 ' + _mcData.selColor + ' · ' + _mcData.selRolls.length + ' cây</div>';
        if (!_mcData.candidates.length) { h += '<div style="text-align:center;padding:20px;color:#f59e0b;background:#fef3c7;border-radius:8px">⚠️ Không tìm thấy đơn chưa nhận phù hợp</div>'; }
        else if (readyCount < 2) { h += '<div style="text-align:center;padding:16px;color:#f59e0b;background:#fef3c7;border-radius:8px;margin-bottom:10px">⚠️ Chỉ có ' + readyCount + ' đơn sẵn sàng — cần ít nhất 2 đơn</div>'; }
        if (_mcData.candidates.length > 0) {
            _mcData.candidates.forEach(function(c) {
                var dis = c.canSelect ? '' : ' disabled';
                var op = c.canSelect ? '' : 'opacity:0.45;';
                var borderColor = c.canSelect ? '#e2e8f0' : '#fca5a5';
                var chk = _mcData.selOrders.indexOf(c.order_item_id) >= 0 ? ' checked' : '';
                h += '<label style="display:flex;align-items:center;gap:10px;padding:10px 12px;border:1.5px solid ' + borderColor + ';border-radius:10px;margin-bottom:6px;cursor:' + (c.canSelect ? 'pointer' : 'not-allowed') + ';' + op + '">';
                h += '<input type="checkbox" class="_mcOrderCb" value="' + c.order_item_id + '"' + dis + chk + ' onchange="_mcOrderChanged()" style="width:18px;height:18px;accent-color:#ea580c">';
                h += '<div style="flex:1"><div style="font-size:12px;font-weight:700;color:#1e293b">' + c.order_code + (c.description ? ' — ' + c.description : '') + '</div>';
                h += '<div style="font-size:10px;color:#64748b;margin-top:2px">SL: ' + (c.quantity||'—') + ' · ' + (c.customer_name||'') + '</div></div>';
                if (!c.canSelect) h += '<span style="font-size:9px;font-weight:700;color:#dc2626;background:#fee2e2;padding:2px 8px;border-radius:6px;white-space:nowrap">' + c.statusLabel + '</span>';
                else h += '<span style="font-size:9px;font-weight:700;color:#059669;background:#dcfce7;padding:2px 8px;border-radius:6px;white-space:nowrap">' + c.statusLabel + '</span>';
                h += '</label>';
            });
        }
        body.innerHTML = h;
        if (nextBtn) nextBtn.textContent = 'Tiếp theo ▶';
    } else if (_mcData.step === 4) {
        // Step 4: Confirm
        var selOrders = _mcData.candidates.filter(function(c) { return _mcData.selOrders.indexOf(c.order_item_id) >= 0; });
        var totalKg = 0; _mcData.rolls.forEach(function(r) { if (_mcData.selRolls.indexOf(r.id) >= 0) totalKg += r.weight; });
        var h = '<div style="font-size:11px;font-weight:800;color:#ea580c;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px">BƯỚC 4/4: XÁC NHẬN</div>';
        h += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">🧵 Chất liệu</span><span class="bpc-modal-val"><span style="background:#fef3c7;color:#92400e;padding:2px 10px;border-radius:6px;font-weight:700">' + _mcData.selMat + '</span></span></div>';
        h += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">🎨 Màu</span><span class="bpc-modal-val"><span style="background:#1e293b;color:#fff;padding:2px 10px;border-radius:6px;font-weight:700">' + _mcData.selColor + '</span></span></div>';
        h += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">📦 Cây vải</span><span class="bpc-modal-val" style="color:#ea580c">' + _mcData.selRolls.length + ' cây</span></div>';
        h += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">⚖️ Kg đầu</span><span class="bpc-modal-val" style="color:#ea580c;font-size:16px;font-weight:900">' + _bpcFmtKg(totalKg) + ' kg</span></div>';
        h += '<div style="border-top:2px solid #e2e8f0;margin:10px 0;padding-top:10px"><div style="font-size:11px;font-weight:800;color:#059669;margin-bottom:8px">📋 ĐƠN CẮT CHUNG (' + selOrders.length + ') — sẽ tự nhận + cắt</div>';
        selOrders.forEach(function(o) {
            h += '<div style="padding:6px 12px;border:1px solid #dcfce7;border-radius:8px;margin-bottom:4px;font-size:12px;font-weight:600;color:#1e293b">' + o.order_code + (o.description ? ' — ' + o.description : '') + ' <span style="color:#64748b;font-size:10px">SL: ' + (o.quantity||'—') + '</span></div>';
        });
        h += '</div>';
        body.innerHTML = h;
        if (nextBtn) { nextBtn.textContent = '✂️ XÁC NHẬN CẮT'; nextBtn.style.background = 'linear-gradient(135deg,#059669,#10b981)'; }
    }
}

function _mcMatChanged() { var sel = document.getElementById('_mcMatSel'); _mcData.selMat = sel ? sel.value : ''; _mcData.selColor = ''; _mcRenderStep(); }
function _mcColorChanged() { var sel = document.getElementById('_mcColorSel'); _mcData.selColor = sel ? sel.value : ''; }

function _mcRollChanged() {
    var cbs = document.querySelectorAll('._mcRollCb:checked'); var ids = []; var kg = 0;
    cbs.forEach(function(cb) { ids.push(Number(cb.value)); kg += parseFloat(cb.dataset.weight) || 0; });
    _mcData.selRolls = ids;
    var el = document.getElementById('_mcKgDisp'); if (el) el.textContent = _bpcFmtKg(kg) + ' kg';
}

function _mcOrderChanged() {
    var cbs = document.querySelectorAll('._mcOrderCb:checked'); var ids = [];
    cbs.forEach(function(cb) { ids.push(Number(cb.value)); });
    _mcData.selOrders = ids;
}

function _mcBack() { if (_mcData.step > 1) { _mcData.step--; _mcRenderStep(); } }

async function _mcNext() {
    if (_mcData.step === 1) {
        if (!_mcData.selMat || !_mcData.selColor) { showToast('Chọn chất liệu và màu', 'error'); return; }
        // Load rolls + candidates
        try {
            var r1 = await apiCall('/api/cutting/available-rolls?material_name=' + encodeURIComponent(_mcData.selMat) + '&color_name=' + encodeURIComponent(_mcData.selColor));
            _mcData.rolls = r1.rolls || [];
            var r2 = await apiCall('/api/cutting/multi-cut/candidates?material_name=' + encodeURIComponent(_mcData.selMat) + '&fabric_color=' + encodeURIComponent(_mcData.selColor));
            _mcData.candidates = r2.candidates || [];
        } catch(e) { showToast(e.message, 'error'); return; }
        _mcData.step = 2; _mcRenderStep();
    } else if (_mcData.step === 2) {
        if (!_mcData.selRolls.length) { showToast('Chọn ít nhất 1 cây vải', 'error'); return; }
        _mcData.step = 3; _mcRenderStep();
    } else if (_mcData.step === 3) {
        if (_mcData.selOrders.length < 2) { showToast('Chọn ít nhất 2 đơn để cắt chung', 'error'); return; }
        // Validate same cutting_category
        var selCands = _mcData.candidates.filter(function(c) { return _mcData.selOrders.indexOf(c.id) >= 0; });
        var cats = {}; selCands.forEach(function(c) { if (c.cutting_category) cats[c.cutting_category] = true; });
        if (Object.keys(cats).length > 1) { showToast('Các đơn phải cùng Sản Phẩm Cắt!', 'error'); return; }
        _mcData.step = 4; _mcRenderStep();
    } else if (_mcData.step === 4) {
        // Submit
        if (window._bpcBusy) return;
        window._bpcBusy = true;
        var btn = document.getElementById('_mcNextBtn');
        if (btn) { btn.disabled = true; btn.textContent = '⏳ Đang xử lý...'; }
        try {
            await apiCall('/api/cutting/multi-cut', 'POST', { selected_roll_ids: _mcData.selRolls, selected_order_item_ids: _mcData.selOrders, material_name: _mcData.selMat, fabric_color: _mcData.selColor });
            _mcClose();
            showToast('✅ Đã bắt đầu cắt chung ' + _mcData.selOrders.length + ' đơn!');
            await _bpcLoadAll();
        } catch(e) {
            showToast(e.message || 'Lỗi', 'error');
            if (btn) { btn.disabled = false; btn.textContent = '✂️ XÁC NHẬN CẮT'; }
        } finally {
            window._bpcBusy = false;
        }
    }
}

async function _bpcOpenTargetRatioModal() {
    if (window._bpcBusy) return;
    window._bpcBusy = true;
    try {
        const res = await apiCall('/api/cutting/target-ratios');
        const materials = res.materials || [];
        const categories = res.categories || [];
        const targets = res.targets || [];
        
        const targetMap = {};
        targets.forEach(t => {
            targetMap[t.material_id + '_' + t.cutting_category] = Number(t.target_ratio) || 0;
        });
        
        let h = '<div class="bpc-modal-overlay" id="_bpcTargetRatioModal" onclick="if(event.target===this)_bpcCloseTargetRatioModal()">';
        h += '<div class="bpc-modal" style="width:700px;max-height:85vh;overflow:hidden;display:flex;flex-direction:column">';
        h += '<div class="bpc-modal-header" style="background:linear-gradient(135deg,#059669,#10b981)"><div class="m-icon">⚖️</div><div><div class="m-title">ĐỊNH LƯỢNG TỈ LỆ CẮT</div><div class="m-sub">Giám đốc thiết lập số sản phẩm tối thiểu thu hồi được trên 1 Kg hoặc 1 Mét vải</div></div></div>';
        h += '<div class="bpc-modal-body" style="overflow-y:auto;flex:1;padding:20px;background:#f8fafc">';
        
        // Group materials by warehouse
        const groups = {};
        materials.forEach(m => {
            const whKey = m.warehouse_name + ' (Đơn vị: ' + m.unit + ')';
            if (!groups[whKey]) groups[whKey] = [];
            groups[whKey].push(m);
        });
        
        for (const [whName, list] of Object.entries(groups)) {
            h += '<div style="margin-bottom:20px">';
            h += '<div style="font-size:12px;font-weight:800;color:#059669;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;border-left:3px solid #059669;padding-left:8px">' + whName + '</div>';
            h += '<div style="display:grid;grid-template-columns:1fr;gap:10px">';
            list.forEach(m => {
                h += '<div class="material-acc-group" style="border:1.5px solid #e2e8f0;border-radius:12px;background:#fff;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.02)">';
                h += '  <div class="acc-header" onclick="var b=this.nextElementSibling; b.style.display=b.style.display===\'none\'?\'grid\':\'none\'; this.querySelector(\'.arrow\').textContent=b.style.display===\'none\'?\'▼\':\'▲\'" style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:#f9fafb;cursor:pointer;user-select:none;border-bottom:1.5px solid #f1f5f9">';
                h += '    <span style="font-size:13px;font-weight:800;color:#1e293b">🧶 ' + m.name + '</span>';
                h += '    <span style="font-size:11px;font-weight:700;color:#059669">Thiết lập định lượng (sp/' + m.unit + ') <span class="arrow" style="margin-left:4px">▼</span></span>';
                h += '  </div>';
                h += '  <div class="acc-body" style="display:none;grid-template-columns:repeat(2,1fr);gap:10px;padding:16px;background:#fff">';
                
                categories.forEach(cat => {
                    const key = m.id + '_' + cat.name;
                    const val = targetMap[key] || 0;
                    h += '    <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border:1px solid #f1f5f9;border-radius:8px;background:#f9fafb">';
                    h += '      <span style="font-size:12px;font-weight:700;color:#475569">🏷️ ' + cat.name + '</span>';
                    h += '      <div style="display:flex;align-items:center;gap:4px">';
                    h += '        <input class="_bpcTargetInput" data-mat-id="' + m.id + '" data-cat="' + cat.name + '" type="text" inputmode="decimal" value="' + val + '" style="width:75px;padding:5px 8px;border:1.5px solid #10b981;border-radius:6px;font-size:13px;font-weight:800;text-align:center;color:#059669;background:#fff">';
                    h += '        <span style="font-size:10px;color:#64748b;font-weight:600">sp/' + m.unit + '</span>';
                    h += '      </div>';
                    h += '    </div>';
                });
                
                h += '  </div>';
                h += '</div>';
            });
            h += '</div></div>';
        }
        
        h += '</div>';
        h += '<div class="bpc-modal-actions"><button class="bpc-modal-btn cancel" onclick="_bpcCloseTargetRatioModal()">Hủy</button>';
        h += '<button class="bpc-modal-btn confirm" style="background:linear-gradient(135deg,#059669,#10b981)" onclick="_bpcSaveTargetRatios()">💾 LƯU THAY ĐỔI</button></div>';
        h += '</div></div>';
        
        document.body.insertAdjacentHTML('beforeend', h);
        requestAnimationFrame(() => { document.getElementById('_bpcTargetRatioModal').classList.add('show'); });
    } catch (e) {
        showToast(e.message || 'Lỗi tải danh sách định lượng', 'error');
    } finally {
        window._bpcBusy = false;
    }
}

function _bpcCloseTargetRatioModal() {
    var m = document.getElementById('_bpcTargetRatioModal');
    if (m) { m.classList.remove('show'); setTimeout(function() { m.remove(); }, 300); }
}

async function _bpcSaveTargetRatios() {
    const inputs = document.querySelectorAll('._bpcTargetInput');
    const ratios = [];
    inputs.forEach(inp => {
        ratios.push({
            material_id: Number(inp.dataset.matId),
            cutting_category: inp.dataset.cat,
            target_ratio: parseFloat(inp.value.replace(/,/g, '.')) || 0
        });
    });
    
    const btn = document.querySelector('#_bpcTargetRatioModal .confirm');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Đang lưu...'; }
    try {
        await apiCall('/api/cutting/target-ratios', 'POST', { ratios });
        _bpcCloseTargetRatioModal();
        showToast('✅ Đã lưu tỉ lệ định lượng!');
        await _bpcLoadAll();
    } catch (e) {
        showToast(e.message || 'Lỗi khi lưu', 'error');
        if (btn) { btn.disabled = false; btn.textContent = '💾 LƯU THAY ĐỔI'; }
    }
}

function _bpcCompressImage(file, callback) {
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
