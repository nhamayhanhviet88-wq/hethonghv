// ========== BỘ PHẬN CẮT — Desktop SPA Page ==========
var _bpc = { records: [], tree: null, unassignedOrders: [], filter: { year: null, month: null, cutter_id: null, status: null, view: 'records' }, search: '', page: 1, pageSize: 100 };
var _bpcOpen = {};

function renderBophancatPage(content) {
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
+'.bpc-sb-year{padding:8px 16px;font-weight:800;font-size:12px;color:var(--navy);cursor:pointer;display:flex;justify-content:space-between;align-items:center;background:#f8fafc;border-bottom:1px solid var(--gray-200)}'
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
+'.bpc-claim-btn{padding:6px 14px;border:none;border-radius:8px;font-size:11px;font-weight:800;cursor:pointer;transition:all .2s;white-space:nowrap}'
+'.bpc-claim-btn.ready{background:linear-gradient(135deg,#059669,#10b981);color:#fff;box-shadow:0 3px 10px rgba(16,185,129,0.3)}'
+'.bpc-claim-btn.ready:hover{transform:translateY(-1px);box-shadow:0 5px 15px rgba(16,185,129,0.4)}'
+'.bpc-claim-btn.disabled{background:#f1f5f9;color:#94a3b8;cursor:not-allowed}'
+'@media(max-width:768px){.bpc-sidebar{display:none}}';
        document.head.appendChild(st);
    }
    content.innerHTML = '<div class="bpc-wrap"><div class="bpc-sidebar" id="bpcSidebar"><div style="padding:20px;text-align:center;color:var(--gray-400);font-size:12px">Đang tải...</div></div><div class="bpc-main">'
        +'<div style="display:flex;gap:10px;margin-bottom:8px;flex-wrap:wrap;align-items:center">'
        +'<div id="bpcFilterInfo" style="font-size:12px"></div>'
        +'<div id="bpcStatCards" style="display:flex;gap:10px;flex:1;justify-content:center"></div>'
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
            h += '<div class="bpc-sb-year" onclick="_bpcToggle(\'y'+yr.year+'\')"><span>' + (yOpen?'▼':'▶') + ' 📅 Năm ' + yr.year + '</span><span style="background:linear-gradient(135deg,#dc2626,#ef4444);color:#fff;padding:2px 10px;border-radius:10px;font-size:10px">' + yr.count + '</span></div>';
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
        all = all.filter(function(r) { return (r.product_name||'').toLowerCase().indexOf(q)>=0 || (r.material_name||'').toLowerCase().indexOf(q)>=0 || (r.order_code||'').toLowerCase().indexOf(q)>=0; });
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
        var cutIcon = r.is_cutting ? '✂️' : '⬜', cutCls = r.is_cutting ? ' on-cut' : '';
        var doneIcon = r.is_cut_done ? '✅' : '⬜', doneCls = r.is_cut_done ? ' on-done' : '';
        var salIcon = r.salary_approved ? '💰' : '⬜', salCls = r.salary_approved ? ' on-sal' : '';
        var washIcon = r.wash_reported ? '🫧' : '⬜', washCls = r.wash_reported ? ' on-wash' : '';
        var errIcon = r.error_reported ? '⚠️' : '⬜', errCls = r.error_reported ? ' on-err' : '';
        var cutAct = r.is_cutting ? 'undo_cutting' : 'start_cutting';
        var doneAct = r.is_cut_done ? 'undo_cut_done' : 'cut_done';
        var salAct = r.salary_approved ? 'undo_approve_salary' : 'approve_salary';
        var washAct = r.wash_reported ? 'undo_wash' : 'report_wash';
        var ratioColor = r.cut_ratio > 5 ? '#dc2626' : r.cut_ratio > 3 ? '#f59e0b' : '#059669';
        var warnHtml = r.cut_warning ? '<span style="color:#dc2626;font-weight:700">'+r.cut_warning+'</span>' : '—';
        var updateStr = '';
        if (r.last_update_at) { updateStr = _bpcFmtDate(r.last_update_at); if (r.last_update_by) updateStr += '<br><span style="color:#dc2626;font-size:9px">'+r.last_update_by+'</span>'; }
        return '<tr>'
            +'<td style="text-align:center;font-weight:700;color:#94a3b8">'+(i+1+(_bpc.page-1)*_bpc.pageSize)+'</td>'
            +'<td style="text-align:center"><button class="bpc-icon-btn'+cutCls+'" onclick="_bpcToggleAction('+r.id+',\''+cutAct+'\')" title="Cắt">'+cutIcon+'</button></td>'
            +'<td style="text-align:center"><button class="bpc-icon-btn'+doneCls+'" onclick="_bpcToggleAction('+r.id+',\''+doneAct+'\')" title="Xong">'+doneIcon+'</button></td>'
            +'<td style="text-align:center"><button class="bpc-icon-btn'+salCls+'" onclick="_bpcToggleAction('+r.id+',\''+salAct+'\')" title="Duyệt lương">'+salIcon+'</button></td>'
            +'<td style="text-align:center"><button class="bpc-icon-btn'+washCls+'" onclick="_bpcToggleAction('+r.id+',\''+washAct+'\')" title="Giặt vải">'+washIcon+'</button></td>'
            +'<td style="text-align:center"><button class="bpc-icon-btn'+errCls+'" onclick="_bpcReportError('+r.id+')" title="Báo lỗi">'+errIcon+'</button></td>'
            +'<td style="font-size:10px">'+_bpcFmtDate(r.cut_date)+'</td>'
            +'<td style="font-size:10px;color:#059669;font-weight:600">'+(r.cutter_name||'—')+'</td>'
            +'<td style="font-weight:600;color:#1e293b;font-size:11px">'+(r.product_name||r.order_code||'—')+'</td>'
            +'<td style="font-size:10px;color:#475569">'+(r.material_name||'—')+'</td>'
            +'<td style="font-size:10px">'+(r.fabric_color||'—')+'</td>'
            +'<td style="text-align:center;font-weight:700;color:#0369a1">'+(r.order_quantity||'—')+'</td>'
            +'<td style="text-align:center;font-weight:700;color:#7c3aed">'+(r.cut_quantity||'—')+'</td>'
            +'<td style="text-align:center;font-weight:700;color:#dc2626">'+(r.kg_cut||'—')+'</td>'
            +'<td style="text-align:center;font-weight:800;color:'+ratioColor+'">'+(r.cut_ratio||'—')+'</td>'
            +'<td style="font-size:9px;color:#6b7280;max-width:80px;overflow:hidden;text-overflow:ellipsis">'+(r.ratio_reason||'—')+'</td>'
            +'<td style="text-align:center;font-weight:600">'+(r.kg_start||'—')+'</td>'
            +'<td style="text-align:center;font-weight:600">'+(r.kg_end||'—')+'</td>'
            +'<td>'+warnHtml+'</td>'
            +'<td style="font-size:9px;color:#6b7280">'+(r.cut_shared||'—')+'</td>'
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
    try { await apiCall('/api/cutting/toggle/' + id, 'POST', { action: action }); showToast('✅ Cập nhật'); await _bpcLoadAll(); } catch(e) { showToast(e.message || 'Lỗi', 'error'); }
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
    // Group by order for display
    var lastId = null, stt = 0;
    var readyCnt = all.filter(function(r){ return r.fabric_arrived && r.has_pc_in; }).length;
    var pendCnt = all.length - readyCnt;

    // Stats
    var el = document.getElementById('bpcFilterInfo'); if (el) {
        el.innerHTML = '<div style="display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,#ea580c,#f97316);color:#fff;padding:6px 18px;border-radius:8px;font-size:13px;font-weight:700">'
            +'🔴 Đơn Chưa Cắt <span style="opacity:0.5;margin:0 4px">—</span> <span style="font-weight:900">' + all.length + '</span> phối</div>';
    }
    var sc = document.getElementById('bpcStatCards'); if (sc) {
        sc.innerHTML = '<div style="background:linear-gradient(135deg,#059669,#10b981);color:#fff;padding:8px 18px;border-radius:10px;min-width:90px;text-align:center;box-shadow:0 4px 15px #05966930"><div style="font-size:9px;font-weight:600;opacity:0.85;letter-spacing:1px;margin-bottom:2px">🟢 SẴN SÀNG</div><div style="font-size:15px;font-weight:900">' + readyCnt + '</div></div>'
            +'<div style="background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;padding:8px 18px;border-radius:10px;min-width:90px;text-align:center;box-shadow:0 4px 15px #f59e0b30"><div style="font-size:9px;font-weight:600;opacity:0.85;letter-spacing:1px;margin-bottom:2px">🟡 THIẾU ĐK</div><div style="font-size:15px;font-weight:900">' + pendCnt + '</div></div>';
    }

    // Table
    var th = '<table class="table" style="font-size:11px;white-space:nowrap" id="bpcTable"><thead><tr style="background:var(--gray-800)">'
        +'<th>STT</th><th style="min-width:120px">Nhận Đơn</th><th>Mã Đơn</th><th>Tên KH</th><th>CSKH</th><th>Tên SP / Phối</th>'
        +'<th>Chất Liệu</th><th>Màu</th><th>SL</th><th>Ngày Ship</th><th>Ưu Tiên</th>'
        +'<th>Trạng Thái</th></tr></thead><tbody>';
    if (!all.length) {
        th += '<tr><td colspan="12"><div class="empty-state"><div class="icon">✅</div><h3>Không có đơn chờ cắt</h3><p>Tất cả đơn đã được nhận</p></div></td></tr>';
    } else {
        // Count rows per order for rowspan
        var orderRowCount = {};
        all.forEach(function(r) { orderRowCount[r.id] = (orderRowCount[r.id] || 0) + 1; });

        all.forEach(function(r, i) {
            var isNew = r.id !== lastId; if (isNew) { stt++; lastId = r.id; }
            var bg = isNew ? '' : 'background:#f0f9ff;';
            var ready = r.fabric_arrived && r.has_pc_in;
            var priColor = r.shipping_priority === 'GẤP' ? 'background:#dc2626;color:#fff' : r.shipping_priority === 'GỬI' ? 'background:#f59e0b;color:#fff' : 'background:#e2e8f0;color:#334155';
            var spName = (r.total_phoi > 1) ? (r.order_code + ' — Phiếu ' + r.item_index + ' — P' + r.phoi_in_item + (r.item_desc ? ' — ' + r.item_desc : '')) : (r.order_code + (r.item_desc ? ' — ' + r.item_desc : ''));
            // Status badges
            var statusHtml = '<div style="display:flex;gap:4px;flex-wrap:wrap">'
                + (r.fabric_arrived ? '<span style="background:#dcfce7;color:#059669;padding:1px 6px;border-radius:4px;font-size:8px;font-weight:700">✅ Vải</span>' : '<span style="background:#fee2e2;color:#dc2626;padding:1px 6px;border-radius:4px;font-size:8px;font-weight:700">❌ Vải</span>')
                + (r.has_pc_in ? '<span style="background:#dcfce7;color:#059669;padding:1px 6px;border-radius:4px;font-size:8px;font-weight:700">✅ PC In</span>' : '<span style="background:#fee2e2;color:#dc2626;padding:1px 6px;border-radius:4px;font-size:8px;font-weight:700">❌ PC In</span>')
                + '</div>';
            // Claim button with rowspan
            var claimTd = '';
            if (isNew) {
                var rs = orderRowCount[r.id] || 1;
                var claimHtml;
                if (ready) {
                    claimHtml = '<button class="bpc-claim-btn ready" onclick="_bpcClaimOrder('+r.id+',\''+r.order_code+'\')" title="Nhận đơn cắt">✂️ NHẬN ĐƠN</button>';
                } else {
                    var missing = [];
                    if (!r.fabric_arrived) missing.push('Vải');
                    if (!r.has_pc_in) missing.push('PC In');
                    claimHtml = '<button class="bpc-claim-btn disabled" disabled title="Thiếu: '+missing.join(', ')+'">🔒 Thiếu '+missing.join('+')+'</button>';
                }
                claimTd = '<td rowspan="'+rs+'" style="text-align:center;vertical-align:middle;border-left:2px solid #e2e8f0">'+claimHtml+'</td>';
            }
            // SL: show for every phối, lighter color for non-first
            var qtyStyle = isNew ? 'text-align:center;font-weight:700;color:#0369a1' : 'text-align:center;font-weight:600;color:#93c5fd';
            var qtyVal = r.item_qty || r.total_quantity || '';

            th += '<tr style="'+bg+'">'
                +'<td style="text-align:center;font-weight:700;color:#94a3b8">'+(isNew?stt:'')+'</td>'
                +claimTd
                +'<td style="font-weight:700;color:#1e293b">'+(isNew?r.order_code:'')+'</td>'
                +'<td style="font-size:10px">'+(isNew?(r.customer_name||''):'')+'</td>'
                +'<td style="font-size:10px;color:#6b7280">'+(isNew?(r.cskh_name||r.created_by_name||''):'')+'</td>'
                +'<td style="font-weight:600;font-size:11px;color:#1e293b">'+spName+'</td>'
                +'<td style="font-size:10px;color:#475569">'+(r.material_name||'—')+'</td>'
                +'<td style="font-size:10px">'+(r.color_name||'—')+'</td>'
                +'<td style="'+qtyStyle+'">'+qtyVal+'</td>'
                +'<td style="font-size:10px;color:#475569">'+(isNew?_bpcFmtDate(r.expected_ship_date):'')+'</td>'
                +'<td style="text-align:center">'+(isNew?'<span style="padding:2px 8px;border-radius:4px;font-size:9px;font-weight:800;'+priColor+'">'+(r.shipping_priority||'CHUẨN')+'</span>':'')+'</td>'
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

async function _bpcClaimOrder(orderId, orderCode) {
    if (window._bpcBusy) return;
    if (!confirm('Bạn muốn nhận đơn cắt ' + orderCode + '?')) return;
    window._bpcBusy = true;
    try {
        var res = await apiCall('/api/cutting/claim', 'POST', { dht_order_id: orderId });
        showToast('✅ Đã nhận đơn ' + orderCode + ' — tạo ' + res.created + ' phối cắt');
        await _bpcLoadAll();
    } catch(e) {
        showToast(e.message || 'Lỗi nhận đơn', 'error');
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
