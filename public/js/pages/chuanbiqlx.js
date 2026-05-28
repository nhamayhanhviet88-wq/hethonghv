// ========== CHUẨN BỊ QLX — White Sidebar + Blue Theme ==========
var _qlx = { orders: [], tree: null, filter: { status: 'incomplete', year: null, month: null, category_id: null }, search: '', page: 1, pageSize: 100 };
var _qlxOpen = { inc: true };
function _qlxFmt(n) { return Number(n||0).toLocaleString('vi-VN'); }

function renderQuanlyxuongqlxPage(content) {
    if (!document.getElementById('_qlxStyles')) {
        var st = document.createElement('style'); st.id = '_qlxStyles';
        st.textContent = '.qlx-wrap{display:flex;height:calc(100vh - 60px);overflow:hidden}'
+'.qlx-sidebar{width:270px;min-width:270px;background:#fff;border-right:1px solid var(--gray-200);overflow-y:auto;position:relative}'
+'.qlx-main{flex:1;min-width:0;display:flex;flex-direction:column;overflow-y:auto;padding:16px}.qlx-main>*{flex-shrink:0}.qlx-main .card{overflow:visible}'
+'.qlx-sb-title{font-size:13px;font-weight:800;padding:16px;border-bottom:1px solid var(--gray-200);text-align:center;position:relative;overflow:hidden}'
+'.qlx-sb-title::before{content:"";position:absolute;top:-50%;left:-50%;width:200%;height:200%;background:linear-gradient(45deg,transparent 30%,rgba(14,165,233,0.08) 50%,transparent 70%);animation:qlxShimmer 3s infinite}'
+'@keyframes qlxShimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}'
+'.qlx-sb-total{background:linear-gradient(135deg,#0369a1,#0284c7,#0ea5e9);color:#fff;padding:12px 16px;font-size:13px;font-weight:800;display:flex;justify-content:space-between;cursor:pointer;position:relative;overflow:hidden}'
+'.qlx-sb-total::after{content:"";position:absolute;top:0;left:-100%;width:60%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent);animation:qlxGlow 2.5s infinite}'
+'@keyframes qlxGlow{0%{left:-100%}100%{left:150%}}'
+'.qlx-sb-grp{padding:8px 16px;font-weight:800;font-size:12px;color:var(--navy);cursor:pointer;display:flex;justify-content:space-between;align-items:center;background:#f8fafc;border-bottom:1px solid var(--gray-200)}'
+'.qlx-sb-cat{padding:6px 16px 6px 28px;font-size:11px;font-weight:700;cursor:pointer;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #f0f0f0;color:#0369a1}'
+'.qlx-sb-cat:hover{background:#f0f9ff}.qlx-sb-cat.active{background:#e0f2fe;font-weight:800}'
+'.qlx-sb-month{padding:5px 16px 5px 42px;font-size:10px;font-weight:600;cursor:pointer;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #fafafa;color:#64748b}'
+'.qlx-sb-month:hover{background:#f0f9ff}.qlx-sb-month.active{background:#e0f2fe;color:#0369a1;font-weight:800}'
+'.qlx-icon-btn{width:26px;height:26px;border-radius:6px;border:1.5px solid #e2e8f0;background:#fff;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;font-size:12px;transition:all .15s;margin:0 1px}'
+'.qlx-icon-btn:hover{transform:scale(1.15);box-shadow:0 2px 8px rgba(0,0,0,0.12)}'
+'.qlx-icon-btn.on-fab{background:#dcfce7;border-color:#22c55e}'
+'.qlx-icon-btn.on-mat{background:#dbeafe;border-color:#3b82f6}'
+'.qlx-icon-btn.on-pri{background:#fef3c7;border-color:#f59e0b}'
+'.qlx-icon-btn.on-sew{background:#ede9fe;border-color:#8b5cf6}'
+'.qlx-phoi-tag{display:inline-block;padding:1px 6px;border-radius:4px;font-size:9px;font-weight:700;margin-right:3px;background:#dbeafe;color:#1e40af}'
+'.qlx-priority{padding:2px 8px;border-radius:4px;font-size:9px;font-weight:800;display:inline-block}'
+'.qlx-status-bar{display:flex;gap:2px;align-items:center}'
+'.qlx-status-dot{width:8px;height:8px;border-radius:50%}'
+'@media(max-width:768px){.qlx-sidebar{display:none}}';
        document.head.appendChild(st);
    }
    content.innerHTML = '<div class="qlx-wrap"><div class="qlx-sidebar" id="qlxSidebar"><div style="padding:20px;text-align:center;color:var(--gray-400);font-size:12px">Đang tải...</div></div><div class="qlx-main">'
        +'<div style="display:flex;gap:10px;margin-bottom:8px;flex-wrap:wrap;align-items:center">'
        +'<div id="qlxFilterInfo" style="font-size:12px"></div>'
        +'<div id="qlxStatCards" style="display:flex;gap:10px;flex:1;justify-content:center"></div>'
        +'<input id="qlxSearch" placeholder="🔍 Tìm mã đơn, tên KH..." style="padding:6px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:12px;width:200px;outline:none">'
        +'</div>'
        +'<div id="qlxPaginationTop" style="margin:8px 0"></div>'
        +'<div class="card"><div class="card-body" style="overflow-x:auto;padding:8px"><table class="table" style="font-size:11px;white-space:nowrap" id="qlxTable"><thead><tr style="background:var(--gray-800)">'
        +'<th>STT</th><th>🧵</th><th>📦</th><th>🖨️</th><th>✂️</th>'
        +'<th>Tên KH</th><th>CSKH</th>'
        +'<th>Tên SP / Phối</th><th>Chất Liệu</th><th>Màu</th>'
        +'<th>SL</th><th>Ngày Ra Dự Kiến</th>'
        +'<th>Tiêu Chuẩn</th><th>Trạng Thái</th>'
        +'<th>NV Cắt</th><th>NV In</th><th>NV Ép</th><th>NV May</th>'
        +'<th>KTCL</th><th>Hoàn Thiện</th>'
        +'<th>Lĩnh Vực</th><th>Cập Nhật</th>'
        +'</tr></thead><tbody id="qlxTbody"><tr><td colspan="22" style="text-align:center;padding:40px">⏳</td></tr></tbody></table></div></div>'
        +'<div id="qlxPaginationBottom" style="margin:8px 0"></div>'
        +'</div></div>';
    var _st; document.getElementById('qlxSearch').addEventListener('input', function() {
        clearTimeout(_st); _st = setTimeout(function() { _qlx.search = document.getElementById('qlxSearch').value || ''; _qlx.page = 1; _qlxRenderTable(); }, 300);
    });
    _qlxLoadAll();
}

async function _qlxLoadAll() {
    try {
        var treeRes = await apiCall('/api/qlx/tree');
        _qlx.tree = treeRes;
        _qlxRenderSidebar();
        await _qlxLoadOrders();
    } catch(e) { console.error('[QLX]', e); }
}

function _qlxRenderSidebar() {
    var sb = document.getElementById('qlxSidebar'); if (!sb || !_qlx.tree) return;
    var t = _qlx.tree, f = _qlx.filter;
    var incTotal = (t.incomplete && t.incomplete.total) || 0;
    var compTotal = (t.complete && t.complete.total) || 0;
    var grandTotal = incTotal + compTotal;

    var h = '<div class="qlx-sb-title"><span style="color:var(--navy)">───</span> <span style="color:#0369a1;font-weight:900">🏭 Chuẩn Bị QLX</span> <span style="color:var(--navy)">───</span></div>';
    h += '<div class="qlx-sb-total" onclick="_qlxFilter(\'all\')"><span>📦 Tổng đơn</span><span style="font-size:16px">' + grandTotal + '</span></div>';

    // Pending KT badge
    var pendingKT = (t.pending_kt_count || 0);
    if (pendingKT > 0) {
        h += '<div style="background:linear-gradient(135deg,#fef3c7,#fde68a);padding:8px 16px;display:flex;justify-content:space-between;align-items:center;cursor:default;border-bottom:1px solid #fbbf24">';
        h += '<span style="font-size:11px;font-weight:800;color:#92400e">⚠️ Chờ KT In Phiếu</span>';
        h += '<span style="background:#f59e0b;color:#fff;padding:2px 10px;border-radius:10px;font-size:10px;font-weight:800">' + pendingKT + '</span>';
        h += '</div>';
    }

    // Chưa Hoàn Thành
    var incOpen = !!_qlxOpen.inc;
    h += '<div class="qlx-sb-grp" onclick="_qlxToggle(\'inc\')"><span>' + (incOpen ? '▼' : '▶') + ' ⏳ Chưa Hoàn Thành</span><span style="background:linear-gradient(135deg,#0ea5e9,#0284c7);color:#fff;padding:2px 10px;border-radius:10px;font-size:10px">' + incTotal + '</span></div>';
    if (incOpen && t.incomplete && t.incomplete.categories) {
        t.incomplete.categories.forEach(function(cat) {
            var catOpen = !!_qlxOpen['cat' + cat.id];
            var catAct = f.status === 'incomplete' && f.category_id == cat.id && !f.month;
            h += '<div class="qlx-sb-cat' + (catAct ? ' active' : '') + '" onclick="event.stopPropagation();_qlxToggle(\'cat' + cat.id + '\');_qlxFilter(\'incomplete\',' + cat.id + ')"><span>' + (catOpen ? '▼' : '▶') + ' 📁 ' + cat.name + '</span><span style="color:' + (cat.count > 0 ? '#0369a1' : '#999') + ';font-weight:' + (cat.count > 0 ? '800' : '400') + '">' + cat.count + '</span></div>';
            if (catOpen && cat.months) {
                cat.months.forEach(function(m) {
                    var mAct = f.status === 'incomplete' && f.category_id == cat.id && f.year == m.year && f.month == m.month;
                    h += '<div class="qlx-sb-month' + (mAct ? ' active' : '') + '" onclick="event.stopPropagation();_qlxFilter(\'incomplete\',' + cat.id + ',' + m.year + ',' + m.month + ')"><span>▸ T' + String(m.month).padStart(2, '0') + '/' + m.year + '</span><span>' + m.count + '</span></div>';
                });
            }
        });
    }

    // Đã Hoàn Thành
    var compOpen = !!_qlxOpen.comp;
    h += '<div class="qlx-sb-grp" onclick="_qlxToggle(\'comp\')"><span>' + (compOpen ? '▼' : '▶') + ' ✅ Đã Hoàn Thành</span><span style="background:linear-gradient(135deg,#059669,#10b981);color:#fff;padding:2px 10px;border-radius:10px;font-size:10px">' + compTotal + '</span></div>';
    if (compOpen && t.complete && t.complete.months) {
        t.complete.months.forEach(function(m) {
            var mAct = f.status === 'complete' && f.year == m.year && f.month == m.month;
            h += '<div class="qlx-sb-month' + (mAct ? ' active' : '') + '" onclick="event.stopPropagation();_qlxFilter(\'complete\',null,' + m.year + ',' + m.month + ')"><span>▸ T' + String(m.month).padStart(2, '0') + '/' + m.year + '</span><span>' + m.count + '</span></div>';
        });
    }
    sb.innerHTML = h;
}

function _qlxToggle(key) { _qlxOpen[key] = !_qlxOpen[key]; _qlxRenderSidebar(); }

function _qlxFilter(status, catId, year, month) {
    _qlx.filter = { status: status || 'all', category_id: catId || null, year: year || null, month: month || null };
    _qlx.page = 1;
    _qlxRenderSidebar();
    _qlxLoadOrders();
}

async function _qlxLoadOrders() {
    var f = _qlx.filter;
    var qs = '?status=' + (f.status || 'incomplete');
    if (f.year) qs += '&year=' + f.year;
    if (f.month) qs += '&month=' + f.month;
    if (f.category_id) qs += '&category_id=' + f.category_id;
    try {
        var res = await apiCall('/api/qlx/orders' + qs);
        _qlx.orders = res.orders || [];
        _qlx.page = 1;
        _qlxRenderTable();
    } catch(e) { console.error('[QLX] orders:', e); }
}

function _qlxFmtDate(d) { if (!d) return '—'; try { var p = d.split('T')[0].split('-'); return p[2] + '/' + p[1] + '/' + p[0]; } catch(e) { return d; } }

function _qlxRenderTable() {
    var all = _qlx.orders.slice();
    if (_qlx.search) {
        var q = _qlx.search.toLowerCase();
        all = all.filter(function(o) { return (o.order_code || '').toLowerCase().indexOf(q) >= 0 || (o.customer_name || '').toLowerCase().indexOf(q) >= 0; });
    }
    var total = all.length, totalPages = Math.ceil(total / _qlx.pageSize) || 1;
    if (_qlx.page > totalPages) _qlx.page = totalPages;
    if (_qlx.page < 1) _qlx.page = 1;
    var start = (_qlx.page - 1) * _qlx.pageSize;
    var paged = all.slice(start, start + _qlx.pageSize);
    _qlxRenderRows(paged);
    _qlxRenderPagination(total, totalPages);
    _qlxRenderStats(total, all);
}

function _qlxRenderRows(paged) {
    var tbody = document.getElementById('qlxTbody'); if (!tbody) return;
    if (!paged.length) { tbody.innerHTML = '<tr><td colspan="20"><div class="empty-state"><div class="icon">🏭</div><h3>Chưa có đơn hàng nào</h3><p>Chọn bộ lọc ở sidebar</p></div></td></tr>'; return; }

    var rows = [];
    var phoiCounter = {};
    paged.forEach(function(o) {
        var items = o.items || [];
        if (!items.length) { rows.push({ order: o, phoi: null, item: null, phoiIdx: 0 }); return; }
        if (!phoiCounter[o.id]) phoiCounter[o.id] = 0;
        items.forEach(function(it) {
            var pairs = [];
            try { pairs = typeof it.material_pairs === 'string' ? JSON.parse(it.material_pairs) : (it.material_pairs || []); } catch(e) {}
            if (pairs.length > 0) { pairs.forEach(function(p) { phoiCounter[o.id]++; rows.push({ order: o, phoi: p, item: it, phoiIdx: phoiCounter[o.id] }); }); }
            else { phoiCounter[o.id]++; rows.push({ order: o, phoi: null, item: it, phoiIdx: phoiCounter[o.id] }); }
        });
    });

    // Count rows per order to decide phối display
    var rowCountPerOrder = {};
    rows.forEach(function(r) { rowCountPerOrder[r.order.id] = (rowCountPerOrder[r.order.id] || 0) + 1; });

    var lastId = null, stt = 0;
    tbody.innerHTML = rows.map(function(r) {
        var o = r.order, p = r.phoi, it = r.item;
        var isNew = o.id !== lastId;
        if (isNew) { stt++; lastId = o.id; }
        var bg = isNew ? '' : 'background:#f0f9ff;';

        var fabIcon, fabCls = '', matIcon, matCls = '';
        if (o.fabric_arrived) { fabIcon = '✅'; fabCls = ' on-fab'; } else if (o.fabric_called) { fabIcon = '📦'; fabCls = ' on-mat'; } else { fabIcon = '🧵'; }
        if (o.material_arrived) { matIcon = '✅'; matCls = ' on-fab'; } else if (o.material_called) { matIcon = '📦'; matCls = ' on-mat'; } else { matIcon = '📦'; }

        var fabAct = o.fabric_arrived ? 'reset_arrive' : o.fabric_called ? 'arrive' : 'call';
        var matAct = o.material_arrived ? 'reset_arrive' : o.material_called ? 'arrive' : 'call';

        var itemDesc = it ? (it.description || '') : '';
        var totalRows = rowCountPerOrder[o.id] || 1;
        var spName;
        if (totalRows > 1) {
            spName = o.order_code + ' - PH\u1ED0I ' + r.phoiIdx + (itemDesc ? ' - ' + itemDesc : '');
        } else {
            spName = o.order_code + (itemDesc ? ' - ' + itemDesc : '');
        }
        var phoiTag = '';
        var matName = p ? (p.material_name || '') : (it ? (it.material_name || '') : '');
        var colorName = p ? (p.color_name || '') : (it ? (it.color_name || '') : '');

        var priColor = o.shipping_priority === 'GẤP' ? 'background:#dc2626;color:#fff' : o.shipping_priority === 'GỬI' ? 'background:#f59e0b;color:#fff' : 'background:#e2e8f0;color:#334155';

        var statusHtml = '<div class="qlx-status-bar">'
            + '<div class="qlx-status-dot" style="background:' + (o.fabric_arrived ? '#059669' : o.fabric_called ? '#f59e0b' : '#e2e8f0') + '" title="Vải"></div>'
            + '<div class="qlx-status-dot" style="background:' + (o.material_arrived ? '#059669' : o.material_called ? '#f59e0b' : '#e2e8f0') + '" title="VL"></div>'
            + '<div class="qlx-status-dot" style="background:' + (o.nguoi_in ? '#059669' : '#e2e8f0') + '" title="In"></div>'
            + '<div class="qlx-status-dot" style="background:' + (o.nguoi_may ? '#059669' : '#e2e8f0') + '" title="May"></div></div>';

        var updateStr = '';
        if (o.last_update_at) { updateStr = _qlxFmtDate(o.last_update_at); if (o.last_update_by) updateStr += '<br><span style="color:#0369a1;font-size:9px">' + o.last_update_by + '</span>'; }

        var h = '<tr style="' + bg + '">';
        if (isNew) {
            h += '<td style="text-align:center;font-weight:700;color:#94a3b8">' + stt + '</td>';
            if (o.sx_print_confirmed) {
                h += '<td style="text-align:center"><button class="qlx-icon-btn' + fabCls + '" onclick="_qlxFabric(' + o.id + ',\'' + fabAct + '\')" title="Vải">' + fabIcon + '</button></td>';
                h += '<td style="text-align:center"><button class="qlx-icon-btn' + matCls + '" onclick="_qlxMaterial(' + o.id + ',\'' + matAct + '\')" title="VL">' + matIcon + '</button></td>';
                h += '<td style="text-align:center"><button class="qlx-icon-btn' + (o.nguoi_in ? ' on-pri' : '') + '" onclick="_qlxAssign(' + o.id + ',\'in\')" title="PC In">🖨️</button></td>';
                h += '<td style="text-align:center"><button class="qlx-icon-btn' + (o.nguoi_may ? ' on-sew' : '') + '" onclick="_qlxAssign(' + o.id + ',\'may\')" title="PC May">✂️</button></td>';
            } else {
                h += '<td colspan="4" style="text-align:center;padding:4px 6px"><div style="background:#fef3c7;border:1px solid #fbbf24;border-radius:6px;padding:3px 8px;font-size:9px;font-weight:700;color:#92400e;white-space:nowrap">⚠️ Chưa In Phiếu SX</div></td>';
            }
        } else { h += '<td></td><td></td><td></td><td></td><td></td>'; }
        h += '<td style="font-weight:600;color:#1e293b;font-size:11px">' + (isNew ? (o.customer_name || '') : '') + '</td>';
        h += '<td style="font-size:10px;color:#6b7280">' + (isNew ? (o.cskh_name || o.created_by_name || '') : '') + '</td>';
        h += '<td style="font-weight:600">' + phoiTag + '<span style="color:#1e293b;font-size:11px">' + spName + '</span></td>';
        h += '<td style="font-size:10px;color:#475569">' + matName + '</td>';
        h += '<td style="font-size:10px">' + (colorName ? '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#0ea5e9;margin-right:3px;vertical-align:middle"></span>' + colorName : '') + '</td>';
        h += '<td style="text-align:center;font-weight:700;color:#0369a1">' + (isNew ? (o.total_quantity || '') : '') + '</td>';
        h += '<td style="font-size:10px;color:#475569">' + (isNew ? _qlxFmtDate(o.shipping_date) : '') + '</td>';
        h += '<td style="text-align:center">' + (isNew ? '<span class="qlx-priority" style="' + priColor + '">' + (o.shipping_priority || 'CHUẨN') + '</span>' : '') + '</td>';
        h += '<td style="text-align:center">' + (isNew ? statusHtml : '') + '</td>';
        h += '<td style="font-size:10px;color:#059669;font-weight:600">' + (isNew ? (o.nguoi_cat || '—') : '') + '</td>';
        h += '<td style="font-size:10px;color:#2563eb;font-weight:600">' + (isNew ? (o.nguoi_in || '—') : '') + '</td>';
        h += '<td style="font-size:10px;color:#d97706;font-weight:600">' + (isNew ? (o.nguoi_ep || '—') : '') + '</td>';
        h += '<td style="font-size:10px;color:#dc2626;font-weight:600">' + (isNew ? (o.nguoi_may || '—') : '') + '</td>';
        h += '<td style="text-align:center;font-size:10px;color:#6b7280">' + (isNew ? '—' : '') + '</td>';
        h += '<td style="text-align:center;font-size:10px;color:#6b7280">' + (isNew ? '—' : '') + '</td>';
        h += '<td><span style="background:#e0f2fe;color:#0369a1;padding:1px 6px;border-radius:4px;font-size:9px;font-weight:700">' + (isNew ? (o.category_name || '') : '') + '</span></td>';
        h += '<td style="font-size:9px;color:#6b7280">' + (isNew ? updateStr : '') + '</td>';
        return h + '</tr>';
    }).join('');
}

function _qlxRenderPagination(totalItems, totalPages) {
    var html = '';
    if (totalPages <= 1) {
        html = '<div style="text-align:center;font-size:11px;color:#64748b;padding:4px"><span style="font-weight:700">' + totalItems + ' đơn</span></div>';
    } else {
        html = '<div style="display:flex;align-items:center;justify-content:center;gap:4px;flex-wrap:wrap;padding:6px 0">';
        html += '<button onclick="_qlxGoPage(' + (_qlx.page-1) + ')" ' + (_qlx.page<=1?'disabled':'') + ' style="padding:4px 10px;border-radius:6px;border:1px solid #cbd5e1;background:'+(_qlx.page<=1?'#f1f5f9':'#fff')+';color:'+(_qlx.page<=1?'#94a3b8':'#0369a1')+';font-size:11px;font-weight:700;cursor:'+(_qlx.page<=1?'not-allowed':'pointer')+'">◀ Trước</button>';
        var pages = []; pages.push(1);
        var s2 = Math.max(2, _qlx.page-2), e2 = Math.min(totalPages-1, _qlx.page+2);
        if (s2 > 2) pages.push('...');
        for (var p = s2; p <= e2; p++) pages.push(p);
        if (e2 < totalPages-1) pages.push('...');
        if (totalPages > 1) pages.push(totalPages);
        for (var i = 0; i < pages.length; i++) {
            var pg = pages[i];
            if (pg === '...') { html += '<span style="padding:4px 6px;color:#94a3b8;font-size:11px">...</span>'; }
            else { var isA = pg === _qlx.page; html += '<button onclick="_qlxGoPage('+pg+')" style="min-width:30px;padding:4px 8px;border-radius:6px;border:1px solid '+(isA?'#0369a1':'#cbd5e1')+';background:'+(isA?'#0369a1':'#fff')+';color:'+(isA?'#fff':'#334155')+';font-size:11px;font-weight:'+(isA?'800':'600')+';cursor:pointer">'+pg+'</button>'; }
        }
        html += '<button onclick="_qlxGoPage('+(_qlx.page+1)+')" '+(_qlx.page>=totalPages?'disabled':'')+' style="padding:4px 10px;border-radius:6px;border:1px solid #cbd5e1;background:'+(_qlx.page>=totalPages?'#f1f5f9':'#fff')+';color:'+(_qlx.page>=totalPages?'#94a3b8':'#0369a1')+';font-size:11px;font-weight:700;cursor:'+(_qlx.page>=totalPages?'not-allowed':'pointer')+'">Sau ▶</button>';
        html += ' <span style="font-size:11px;color:#64748b;font-weight:600;margin-left:8px">Trang '+_qlx.page+'/'+totalPages+' — '+totalItems+' đơn</span></div>';
    }
    var top = document.getElementById('qlxPaginationTop'), bot = document.getElementById('qlxPaginationBottom');
    if (top) top.innerHTML = html;
    if (bot) bot.innerHTML = html;
}

function _qlxGoPage(p) {
    var tp = Math.ceil((_qlx.orders||[]).length / _qlx.pageSize) || 1;
    if (p < 1 || p > tp) return;
    _qlx.page = p; _qlxRenderTable();
    var tbl = document.getElementById('qlxTable');
    if (tbl) tbl.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function _qlxRenderStats(count, arr) {
    var el = document.getElementById('qlxFilterInfo'); if (!el) return;
    var f = _qlx.filter, parts = [];
    var statusLabels = { incomplete: '⏳ Chưa HT', complete: '✅ Đã HT', all: '📋 Tất cả' };
    parts.push(statusLabels[f.status] || '📋 Tất cả');
    if (f.year) parts.push('📆 ' + f.year);
    if (f.month) parts.push('🗓️ T' + f.month);
    var label = parts.join(' <span style="opacity:0.5;margin:0 6px">•</span> ');
    el.innerHTML = '<div style="display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,#1e293b,#334155);color:#fff;padding:6px 18px;border-radius:8px;font-size:13px;font-weight:700;letter-spacing:0.3px">'
        + label + ' <span style="opacity:0.5;margin:0 4px">—</span> <span style="color:#38bdf8;font-weight:900">' + count + '</span> đơn</div>';

    var sc = document.getElementById('qlxStatCards'); if (!sc) return;
    sc.innerHTML = '<div style="background:linear-gradient(135deg,#2563eb,#3b82f6);color:#fff;padding:8px 18px;border-radius:10px;min-width:100px;text-align:center;box-shadow:0 4px 15px #2563eb30;position:relative;overflow:hidden">'
        +'<div style="position:absolute;top:0;left:-50%;width:200%;height:100%;background:linear-gradient(90deg,transparent 40%,rgba(255,255,255,0.15) 50%,transparent 60%);animation:qlxShimmer 2.5s infinite"></div>'
        +'<div style="font-size:9px;font-weight:600;opacity:0.85;letter-spacing:1px;margin-bottom:2px">📦 SỐ ĐƠN</div>'
        +'<div style="font-size:15px;font-weight:900">'+count+'</div></div>'
        +'<div style="background:linear-gradient(135deg,#059669,#10b981);color:#fff;padding:8px 18px;border-radius:10px;min-width:100px;text-align:center;box-shadow:0 4px 15px #05966930;position:relative;overflow:hidden">'
        +'<div style="position:absolute;top:0;left:-50%;width:200%;height:100%;background:linear-gradient(90deg,transparent 40%,rgba(255,255,255,0.15) 50%,transparent 60%);animation:qlxShimmer 2.5s infinite .3s"></div>'
        +'<div style="font-size:9px;font-weight:600;opacity:0.85;letter-spacing:1px;margin-bottom:2px">🧵 VẢI VỀ</div>'
        +'<div style="font-size:15px;font-weight:900">'+arr.filter(function(o){return o.fabric_arrived;}).length+'</div></div>'
        +'<div style="background:linear-gradient(135deg,#dc2626,#ef4444);color:#fff;padding:8px 18px;border-radius:10px;min-width:100px;text-align:center;box-shadow:0 4px 15px #dc262630;position:relative;overflow:hidden">'
        +'<div style="position:absolute;top:0;left:-50%;width:200%;height:100%;background:linear-gradient(90deg,transparent 40%,rgba(255,255,255,0.15) 50%,transparent 60%);animation:qlxShimmer 2.5s infinite .6s"></div>'
        +'<div style="font-size:9px;font-weight:600;opacity:0.85;letter-spacing:1px;margin-bottom:2px">⚠️ CHỜ VẢI</div>'
        +'<div style="font-size:15px;font-weight:900">'+arr.filter(function(o){return !o.fabric_arrived;}).length+'</div></div>';
}

async function _qlxFabric(orderId, action) {
    try { await apiCall('/api/qlx/fabric/' + orderId, 'POST', { action: action }); showToast('✅ Cập nhật vải'); await _qlxLoadAll(); } catch(e) { showToast(e.message, 'error'); }
}
async function _qlxMaterial(orderId, action) {
    try { await apiCall('/api/qlx/material/' + orderId, 'POST', { action: action }); showToast('✅ Cập nhật vật liệu'); await _qlxLoadAll(); } catch(e) { showToast(e.message, 'error'); }
}

async function _qlxAssign(orderId, type) {
    var typeLabels = { cat: 'Cắt', in: 'In', ep: 'Ép', may: 'May' };
    var deptHint = type === 'in' ? 'in' : type === 'may' ? 'may' : type === 'cat' ? 'cắt' : type;
    var staff;
    try { var res = await apiCall('/api/qlx/staff?dept=' + encodeURIComponent(deptHint)); staff = res.staff || []; } catch(e) { staff = []; }
    if (!staff.length) { try { var res2 = await apiCall('/api/qlx/staff'); staff = res2.staff || []; } catch(e) {} }

    var opts = staff.map(function(s) { return '<option value="' + s.id + '">' + s.full_name + (s.dept_name ? ' (' + s.dept_name + ')' : '') + '</option>'; }).join('');

    var body = '<div style="margin-bottom:12px"><label style="font-weight:700;font-size:12px">Chọn nhân viên ' + typeLabels[type] + '</label>'
        + '<select id="_qlxAssignUser" class="form-control" style="margin-top:6px"><option value="">-- Gỡ phân công --</option>' + opts + '</select></div>';

    var footer = '<button class="btn btn-secondary" onclick="closeModal()">Hủy</button>'
        + '<button class="btn" onclick="_qlxDoAssign(' + orderId + ',\'' + type + '\')" style="background:linear-gradient(135deg,#0369a1,#0284c7);color:#fff;border:none;padding:8px 20px;border-radius:8px;font-weight:700">💾 Phân Công</button>';

    openModal('🏭 Phân Công ' + typeLabels[type] + ' — Đơn #' + orderId, body, footer);
}

async function _qlxDoAssign(orderId, type) {
    var userId = document.getElementById('_qlxAssignUser') ? document.getElementById('_qlxAssignUser').value : null;
    try {
        await apiCall('/api/qlx/assign/' + orderId, 'POST', { type: type, user_id: userId || null });
        closeModal(); showToast('✅ Đã phân công'); await _qlxLoadAll();
    } catch(e) { showToast(e.message, 'error'); }
}

