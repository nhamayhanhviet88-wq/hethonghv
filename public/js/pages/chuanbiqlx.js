// ========== CHUẨN BỊ QLX — White Sidebar + Blue Theme ==========
var _qlx = { orders: [], tree: null, filter: { status: 'incomplete', year: null, month: null, category_id: null }, search: '', page: 1, pageSize: 100 };
var _qlxOpen = { inc: true };
function _qlxFmt(n) { return Number(n||0).toLocaleString('vi-VN'); }
function _qlxFmtDate(v) { if (!v) return '—'; try { var d = new Date(v); if (isNaN(d.getTime())) return '—'; return d.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric' }); } catch(e) { return '—'; } }

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
+'.qlx-cl-overlay{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(15,23,42,0.6);backdrop-filter:blur(4px);z-index:9999;display:flex;align-items:center;justify-content:center;animation:qlxFadeIn .2s}'
+'@keyframes qlxFadeIn{from{opacity:0}to{opacity:1}}'
+'.qlx-cl-popup{background:#fff;border-radius:16px;width:520px;max-width:95vw;max-height:85vh;overflow-y:auto;box-shadow:0 25px 50px rgba(0,0,0,0.25);animation:qlxSlideUp .3s}'
+'@keyframes qlxSlideUp{from{transform:translateY(30px);opacity:0}to{transform:translateY(0);opacity:1}}'
+'.qlx-cl-header{background:linear-gradient(135deg,#0f172a,#1e3a5f,#0369a1);color:#fff;padding:20px 24px;border-radius:16px 16px 0 0}'
+'.qlx-cl-header h3{margin:0;font-size:16px;font-weight:800;letter-spacing:0.5px}'
+'.qlx-cl-header p{margin:4px 0 0;font-size:11px;opacity:0.8}'
+'.qlx-cl-body{padding:20px 24px}'
+'.qlx-cl-note{background:linear-gradient(135deg,#fffbeb,#fef3c7);border:1px solid #fbbf24;border-radius:10px;padding:12px 16px;margin-bottom:16px}'
+'.qlx-cl-note-title{font-size:11px;font-weight:800;color:#92400e;margin-bottom:6px}'
+'.qlx-cl-note-item{font-size:11px;color:#78350f;padding:3px 0;line-height:1.4}'
+'.qlx-cl-section{margin-bottom:16px}'
+'.qlx-cl-section-title{font-size:12px;font-weight:800;color:#0f172a;margin-bottom:10px;display:flex;align-items:center;gap:6px}'
+'.qlx-cl-item{display:flex;align-items:flex-start;gap:10px;padding:10px 14px;border:1.5px solid #e2e8f0;border-radius:10px;margin-bottom:8px;cursor:pointer;transition:all .15s}'
+'.qlx-cl-item:hover{border-color:#0ea5e9;background:#f0f9ff}'
+'.qlx-cl-item.checked{border-color:#22c55e;background:#f0fdf4}'
+'.qlx-cl-check{width:22px;height:22px;border-radius:6px;border:2px solid #cbd5e1;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .2s;font-size:13px}'
+'.qlx-cl-item.checked .qlx-cl-check{background:#22c55e;border-color:#22c55e;color:#fff}'
+'.qlx-cl-label{font-size:12px;color:#334155;font-weight:600;line-height:1.5}'
+'.qlx-cl-progress{height:6px;background:#e2e8f0;border-radius:3px;overflow:hidden;margin-bottom:16px}'
+'.qlx-cl-progress-bar{height:100%;background:linear-gradient(90deg,#0ea5e9,#22c55e);border-radius:3px;transition:width .3s}'
+'.qlx-cl-footer{padding:16px 24px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center}'
+'.qlx-cl-btn{padding:10px 24px;border-radius:10px;font-size:12px;font-weight:800;cursor:pointer;border:none;transition:all .2s}'
+'.qlx-cl-btn.confirm{background:linear-gradient(135deg,#059669,#10b981);color:#fff;box-shadow:0 4px 12px rgba(16,185,129,0.3)}'
+'.qlx-cl-btn.confirm:disabled{background:#94a3b8;box-shadow:none;cursor:not-allowed}'
+'.qlx-cl-btn.confirm:not(:disabled):hover{transform:translateY(-1px);box-shadow:0 6px 16px rgba(16,185,129,0.4)}'
+'.qlx-cl-btn.close{background:#f1f5f9;color:#475569}'
+'.qlx-cl-btn.close:hover{background:#e2e8f0}'
+'.qlx-cl-btn.reset{background:linear-gradient(135deg,#dc2626,#ef4444);color:#fff;font-size:10px;padding:6px 14px}'
+'.qlx-cl-reviewed{background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:1.5px solid #22c55e;border-radius:10px;padding:16px;text-align:center}'
+'.qlx-cl-reviewed h4{color:#059669;font-size:14px;margin:0 0 4px}'
+'.qlx-cl-reviewed p{color:#6b7280;font-size:11px;margin:0}'
+'.qlx-cl-icon-btn{cursor:pointer;display:inline-flex;align-items:center;justify-content:center;width:80px;height:26px;border-radius:8px;border:1.5px solid #0ea5e9;background:linear-gradient(135deg,#e0f2fe,#bae6fd);font-size:10px;font-weight:700;color:#0369a1;gap:4px;transition:all .2s;animation:qlxPulse 2s infinite}'
+'@keyframes qlxPulse{0%,100%{box-shadow:0 0 0 0 rgba(14,165,233,0.4)}50%{box-shadow:0 0 0 6px rgba(14,165,233,0)}}'
+'.qlx-cl-icon-btn:hover{transform:scale(1.05);background:linear-gradient(135deg,#bae6fd,#7dd3fc)}'
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
                if (o.qlx_reviewed) {
                    h += '<td style="text-align:center"><button class="qlx-icon-btn' + fabCls + '" onclick="_qlxFabric(' + o.id + ',\'' + fabAct + '\')" title="Vải">' + fabIcon + '</button></td>';
                    h += '<td style="text-align:center"><button class="qlx-icon-btn' + matCls + '" onclick="_qlxMaterial(' + o.id + ',\'' + matAct + '\')" title="VL">' + matIcon + '</button></td>';
                    h += '<td style="text-align:center"><button class="qlx-icon-btn' + (o.nguoi_in ? ' on-pri' : '') + '" onclick="_qlxAssign(' + o.id + ',\'in\')" title="PC In">🖨️</button></td>';
                    h += '<td style="text-align:center"><button class="qlx-icon-btn' + (o.nguoi_may ? ' on-sew' : '') + '" onclick="_qlxAssign(' + o.id + ',\'may\')" title="PC May">✂️</button></td>';
                } else {
                    h += '<td colspan="4" style="text-align:center;padding:4px 6px"><div class="qlx-cl-icon-btn" onclick="_qlxChecklist(' + o.id + ',\'' + (o.order_code||'') + '\',\'' + (o.customer_name||'').replace(/'/g,'') + '\')">📋 Kiểm tra</div></td>';
                }
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
        h += '<td style="font-size:10px;color:#475569">' + (isNew ? _qlxFmtDate(o.expected_ship_date) : '') + '</td>';
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

// ========== CHECKLIST POPUP ==========
async function _qlxChecklist(orderId, orderCode, customerName) {
    try {
        var data = await apiCall('/api/qlx/checklist/' + orderId);
        var templates = data.templates || [];
        var responses = data.responses || [];
        var reviewed = data.reviewed;
        var questions = templates.filter(function(t) { return t.type === 'question'; });
        if (questions.length === 0 && !reviewed) {
            await apiCall('/api/qlx/checklist/' + orderId + '/confirm', 'POST', { checks: [] });
            showToast('✅ Không có checklist, đã xác nhận tự động');
            await _qlxLoadAll(); return;
        }
        var respMap = {};
        responses.forEach(function(r) { respMap[r.template_id] = r; });
        var notes = templates.filter(function(t) { return t.type === 'note'; });

        var overlay = document.createElement('div');
        overlay.className = 'qlx-cl-overlay';
        overlay.id = '_qlxClOverlay';
        overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };

        var html = '<div class="qlx-cl-popup">';
        html += '<div class="qlx-cl-header"><h3>\ud83d\udccb KI\u1ec2M TRA TR\u01af\u1edaC KHI CHU\u1ea8N B\u1eca</h3>';
        html += '<p>\u0110\u01a1n: <strong>' + orderCode + '</strong> \u2014 ' + customerName + '</p></div>';
        html += '<div class="qlx-cl-body">';

        if (reviewed) {
            html += '<div class="qlx-cl-reviewed"><h4>\u2705 \u0110\u00e3 Ki\u1ec3m Tra & X\u00e1c Nh\u1eadn</h4>';
            html += '<p>B\u1edfi: <strong>' + (data.reviewed_by || '\u2014') + '</strong></p>';
            html += '<p>L\u00fac: ' + _qlxFmtDate(data.reviewed_at) + '</p></div>';
            if (questions.length) {
                html += '<div class="qlx-cl-section" style="margin-top:16px"><div class="qlx-cl-section-title">\ud83d\udcdd Chi ti\u1ebft \u0111\u00e3 ki\u1ec3m tra</div>';
                questions.forEach(function(q) {
                    html += '<div class="qlx-cl-item checked" style="cursor:default"><div class="qlx-cl-check">\u2713</div><div class="qlx-cl-label">' + q.content + '</div></div>';
                });
                html += '</div>';
            }
            html += '</div><div class="qlx-cl-footer">';
            html += '<button class="qlx-cl-btn close" onclick="document.getElementById(\'_qlxClOverlay\').remove()">\u0110\u00f3ng</button>';
            if (window._currentUser && window._currentUser.role === 'giam_doc') {
                html += '<button class="qlx-cl-btn reset" onclick="_qlxClReset(' + orderId + ')">\ud83d\udd04 Reset Checklist</button>';
            }
            html += '</div>';
        } else {
            if (notes.length) {
                html += '<div class="qlx-cl-note"><div class="qlx-cl-note-title">\ud83d\udccc GHI CH\u00da L\u01afU \u00dd</div>';
                notes.forEach(function(n) { html += '<div class="qlx-cl-note-item">\u26a0\ufe0f ' + n.content + '</div>'; });
                html += '</div>';
            }
            html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">';
            html += '<div class="qlx-cl-section-title">\u2705 CHECKLIST</div>';
            html += '<span id="_qlxClCount" style="font-size:11px;font-weight:700;color:#64748b">0/' + questions.length + '</span></div>';
            html += '<div class="qlx-cl-progress"><div class="qlx-cl-progress-bar" id="_qlxClBar" style="width:0%"></div></div>';
            html += '<div class="qlx-cl-section">';
            questions.forEach(function(q) {
                html += '<div class="qlx-cl-item" data-tid="' + q.id + '" onclick="_qlxClToggle(this)"><div class="qlx-cl-check"></div><div class="qlx-cl-label">' + q.content + '</div></div>';
            });
            html += '</div></div>';
            html += '<div class="qlx-cl-footer"><button class="qlx-cl-btn close" onclick="document.getElementById(\'_qlxClOverlay\').remove()">\u274c \u0110\u00f3ng</button>';
            html += '<button class="qlx-cl-btn confirm" id="_qlxClConfirmBtn" disabled onclick="_qlxClConfirm(' + orderId + ')">\u2705 X\u00e1c Nh\u1eadn \u0110\u00e3 Ki\u1ec3m Tra</button></div>';
        }
        html += '</div>';
        overlay.innerHTML = html;
        document.body.appendChild(overlay);
    } catch(e) { showToast('L\u1ed7i: ' + e.message, 'error'); }
}

function _qlxClToggle(el) {
    el.classList.toggle('checked');
    el.querySelector('.qlx-cl-check').innerHTML = el.classList.contains('checked') ? '\u2713' : '';
    var total = document.querySelectorAll('.qlx-cl-item[data-tid]').length;
    var checked = document.querySelectorAll('.qlx-cl-item.checked[data-tid]').length;
    var c = document.getElementById('_qlxClCount'), b = document.getElementById('_qlxClBar'), btn = document.getElementById('_qlxClConfirmBtn');
    if (c) c.textContent = checked + '/' + total;
    if (b) b.style.width = (total ? (checked / total * 100) : 0) + '%';
    if (btn) btn.disabled = checked < total;
}

async function _qlxClConfirm(orderId) {
    var checks = [];
    document.querySelectorAll('.qlx-cl-item.checked[data-tid]').forEach(function(el) {
        checks.push({ template_id: parseInt(el.getAttribute('data-tid')) });
    });
    try {
        await apiCall('/api/qlx/checklist/' + orderId + '/confirm', 'POST', { checks: checks });
        var ov = document.getElementById('_qlxClOverlay'); if (ov) ov.remove();
        showToast('\u2705 \u0110\u00e3 x\u00e1c nh\u1eadn ki\u1ec3m tra \u0111\u01a1n h\u00e0ng'); await _qlxLoadAll();
    } catch(e) { showToast('L\u1ed7i: ' + e.message, 'error'); }
}

async function _qlxClReset(orderId) {
    if (!confirm('Reset checklist \u0111\u01a1n n\u00e0y?')) return;
    try {
        await apiCall('/api/qlx/checklist/' + orderId + '/reset', 'POST');
        var ov = document.getElementById('_qlxClOverlay'); if (ov) ov.remove();
        showToast('\ud83d\udd04 \u0110\u00e3 reset checklist'); await _qlxLoadAll();
    } catch(e) { showToast('L\u1ed7i: ' + e.message, 'error'); }
}

// ========== CHECKLIST SETUP (Gi\u00e1m \u0110\u1ed1c) ==========
async function _qlxChecklistSetup() {
    try {
        var data = await apiCall('/api/qlx/checklist/templates/all');
        var templates = data.templates || [];
        var html = '<div style="padding:20px"><h3 style="margin:0 0 16px;color:#0f172a">\u2699\ufe0f Qu\u1ea3n L\u00fd Checklist Chu\u1ea9n B\u1ecb QLX</h3>';
        html += '<div style="background:#f8fafc;border-radius:10px;padding:14px;margin-bottom:20px;border:1px solid #e2e8f0">';
        html += '<div style="font-size:12px;font-weight:700;color:#334155;margin-bottom:8px">\u2795 Th\u00eam M\u1edbi</div>';
        html += '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">';
        html += '<select id="_qlxClNewType" style="padding:8px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:12px"><option value="question">\u2705 C\u00e2u h\u1ecfi</option><option value="note">\ud83d\udccc Ghi ch\u00fa</option></select>';
        html += '<input id="_qlxClNewContent" placeholder="N\u1ed9i dung..." style="flex:1;min-width:200px;padding:8px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:12px">';
        html += '<input id="_qlxClNewOrder" type="number" value="0" placeholder="TT" style="width:60px;padding:8px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:12px;text-align:center">';
        html += '<button onclick="_qlxClAdd()" style="padding:8px 16px;background:linear-gradient(135deg,#059669,#10b981);color:#fff;border:none;border-radius:8px;font-weight:700;font-size:12px;cursor:pointer">Th\u00eam</button>';
        html += '</div></div>';
        if (templates.length) {
            html += '<table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr style="background:#f1f5f9"><th style="padding:8px;text-align:left">Lo\u1ea1i</th><th style="padding:8px;text-align:left">N\u1ed9i dung</th><th style="padding:8px;text-align:center">TT</th><th style="padding:8px;text-align:center">Tr\u1ea1ng th\u00e1i</th><th style="padding:8px;text-align:center">Thao t\u00e1c</th></tr></thead><tbody>';
            templates.forEach(function(t) {
                var tp = t.type === 'question' ? '<span style="background:#dbeafe;color:#1e40af;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700">\u2705 C\u00e2u h\u1ecfi</span>' : '<span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700">\ud83d\udccc Ghi ch\u00fa</span>';
                var st = t.is_active ? '<span style="color:#059669;font-weight:700">B\u1eadt</span>' : '<span style="color:#dc2626;font-weight:700">T\u1eaft</span>';
                html += '<tr style="border-bottom:1px solid #e2e8f0"><td style="padding:8px">' + tp + '</td><td style="padding:8px;font-weight:600">' + t.content + '</td><td style="padding:8px;text-align:center">' + t.sort_order + '</td><td style="padding:8px;text-align:center">' + st + '</td>';
                html += '<td style="padding:8px;text-align:center"><button onclick="_qlxClToggleActive(' + t.id + ',' + !t.is_active + ')" style="padding:4px 10px;border:1px solid #e2e8f0;border-radius:6px;font-size:10px;cursor:pointer;background:#fff;margin-right:4px">' + (t.is_active ? '\ud83d\udd07 T\u1eaft' : '\ud83d\udd14 B\u1eadt') + '</button>';
                html += '<button onclick="_qlxClDelete(' + t.id + ')" style="padding:4px 10px;border:1px solid #fca5a5;border-radius:6px;font-size:10px;cursor:pointer;background:#fef2f2;color:#dc2626">\ud83d\uddd1\ufe0f X\u00f3a</button></td></tr>';
            });
            html += '</tbody></table>';
        } else { html += '<div style="text-align:center;padding:30px;color:#94a3b8;font-size:13px">Ch\u01b0a c\u00f3 checklist n\u00e0o</div>'; }
        html += '</div>';
        showModal('\u2699\ufe0f Setup Checklist', html, { width: '700px' });
    } catch(e) { showToast('L\u1ed7i: ' + e.message, 'error'); }
}

async function _qlxClAdd() {
    var t = document.getElementById('_qlxClNewType').value, c = document.getElementById('_qlxClNewContent').value, s = parseInt(document.getElementById('_qlxClNewOrder').value) || 0;
    if (!c.trim()) return showToast('Nh\u1eadp n\u1ed9i dung', 'error');
    try { await apiCall('/api/qlx/checklist/templates', 'POST', { type: t, content: c, sort_order: s }); showToast('\u2705 \u0110\u00e3 th\u00eam'); _qlxChecklistSetup(); } catch(e) { showToast(e.message, 'error'); }
}
async function _qlxClToggleActive(id, val) {
    try { await apiCall('/api/qlx/checklist/templates/' + id, 'PUT', { is_active: val }); showToast('\u2705 C\u1eadp nh\u1eadt'); _qlxChecklistSetup(); } catch(e) { showToast(e.message, 'error'); }
}
async function _qlxClDelete(id) {
    if (!confirm('X\u00f3a m\u1ee5c n\u00e0y?')) return;
    try { await apiCall('/api/qlx/checklist/templates/' + id, 'DELETE'); showToast('\u2705 \u0110\u00e3 x\u00f3a'); _qlxChecklistSetup(); } catch(e) { showToast(e.message, 'error'); }
}
