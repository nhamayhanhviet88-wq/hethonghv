// ========== CHUẨN BỊ QLX — White Sidebar + Blue Theme ==========
var _qlx = { orders: [], tree: null, filter: { status: 'incomplete', year: null, month: null, category_id: null }, search: '', sidebarSearch: '', page: 1, pageSize: 200, stableOrderIds: null };
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
+'.qlx-sb-grp{padding:8px 16px;font-weight:800;font-size:12px;color:var(--navy);cursor:pointer;display:flex;justify-content:space-between;align-items:center;background:#f8fafc;border-bottom:1px solid var(--gray-200);transition:all 0.15s}'
+'.qlx-sb-grp:hover{background:#f1f5f9}.qlx-sb-grp.active{background:#e0f2fe;color:#0369a1}'
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
+'.qlx-icon-btn.qlx-sew-ready{background:#f3e8ff;border-color:#a78bfa;animation:qlxPulseSew 2s infinite}'
+'.qlx-icon-btn.qlx-sew-not-ready{opacity:0.25;filter:grayscale(1)}'
+'@keyframes qlxPulseSew{0%,100%{box-shadow:0 0 0 0 rgba(139,92,246,0.45)}50%{box-shadow:0 0 0 6px rgba(139,92,246,0)}}'
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
+'@media(max-width:768px){.qlx-sidebar{display:none}}'
+'@keyframes qlxBlink{0%,100%{opacity:1}50%{opacity:0.4}}';
        document.head.appendChild(st);
    }
    content.innerHTML = '<div class="qlx-wrap"><div class="qlx-sidebar" id="qlxSidebar"><div style="padding:20px;text-align:center;color:var(--gray-400);font-size:12px">Đang tải...</div></div><div class="qlx-main">'
        +'<div style="display:flex;gap:10px;margin-bottom:8px;flex-wrap:wrap;align-items:center">'
        +'<div id="qlxFilterInfo" style="font-size:12px"></div>'
        +'<div id="qlxStatCards" style="display:flex;gap:10px;flex:1;justify-content:center"></div>'
        +'<input id="qlxSearch" autocomplete="off" placeholder="🔍 Tìm mã đơn, tên KH..." style="padding:6px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:12px;width:200px;outline:none">'
        +(currentUser && currentUser.role === 'giam_doc' ? '<button onclick="_qlxChecklistSetup()" style="padding:6px 14px;background:linear-gradient(135deg,#0f172a,#1e3a5f);color:#fff;border:none;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;margin-left:8px;transition:all .2s" onmouseover="this.style.opacity=0.85" onmouseout="this.style.opacity=1">⚙️ Setup Checklist</button>' : '')
        +'</div>'
        +'<div id="qlxPaginationTop" style="margin:8px 0"></div>'
        +'<div class="card"><div class="card-body" style="overflow-x:auto;padding:8px"><table class="table" style="font-size:11px;white-space:nowrap" id="qlxTable"><thead><tr style="background:var(--gray-800)">'
        +'<th>STT</th><th>🧵</th><th>🔩</th><th>🖨️</th><th>🪡</th>'
        +'<th>Tên KH</th><th>CSKH</th><th>Tiến Độ</th>'
        +'<th>Tên SP / Phối</th><th>Chất Liệu</th><th>Màu</th>'
        +'<th>SL</th><th>Ngày Ra Dự Kiến</th>'
        +'<th>Trạng Thái</th>'
        +'<th>NV Cắt</th><th>NV In</th><th>NV Ép</th><th>NV May</th>'
        +'<th>KTCL</th><th>Hoàn Thiện</th>'
        +'<th>Lĩnh Vực</th><th>Cập Nhật</th>'
        +'</tr></thead><tbody id="qlxTbody"><tr><td colspan="22" style="text-align:center;padding:40px">⏳</td></tr></tbody></table></div></div>'
        +'<div id="qlxPaginationBottom" style="margin:8px 0"></div>'
        +'</div></div>';
    _qlx.search = '';
    _qlx.sidebarSearch = '';
    _qlx.stableOrderIds = null;
    var searchEl = document.getElementById('qlxSearch');
    if (searchEl) searchEl.value = '';

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
    if (pendingKT > 0 || _qlx.activeFilter === 'no_print') {
        var ktAct = _qlx.activeFilter === 'no_print';
        h += '<div onclick="_qlxPendingKTFilter()" style="background:' + (ktAct ? '#fde68a' : 'linear-gradient(135deg,#fef3c7,#fde68a)') + ';padding:8px 16px;display:flex;justify-content:space-between;align-items:center;cursor:pointer;border-bottom:1px solid #fbbf24' + (ktAct ? ';font-weight:900' : '') + '">';
        h += '<span style="font-size:11px;font-weight:800;color:#92400e">⚠️ Chờ KT In Phiếu</span>';
        h += '<span style="background:#f59e0b;color:#fff;padding:2px 10px;border-radius:10px;font-size:10px;font-weight:800">' + pendingKT + '</span>';
        h += '</div>';
    }

    // Chưa Hoàn Thành
    var incOpen = !!_qlxOpen.inc;
    var incAct = f.status === 'incomplete' && !f.category_id && !f.year && !f.month;
    h += '<div class="qlx-sb-grp' + (incAct ? ' active' : '') + '" onclick="_qlxFilter(\'incomplete\')"><span><span onclick="event.stopPropagation(); _qlxToggle(\'inc\')" style="cursor:pointer; padding-right:6px; display:inline-block;">' + (incOpen ? '▼' : '▶') + '</span>⏳ Chưa Hoàn Thành</span><span style="background:linear-gradient(135deg,#0ea5e9,#0284c7);color:#fff;padding:2px 10px;border-radius:10px;font-size:10px">' + incTotal + '</span></div>';
    if (incOpen) {
        h += '<div style="padding:8px 12px;background:#fff;border-bottom:1px solid var(--gray-200);display:flex;align-items:center;gap:6px">';
        h += '<input type="text" id="qlxSidebarSearch" autocomplete="off" placeholder="🔍 Tìm mã đơn, khách, sale..." style="flex:1;padding:6px 10px;border:1.5px solid #cbd5e1;border-radius:6px;font-size:11px;outline:none;background:#f8fafc" value="' + (_qlx.sidebarSearch || '') + '" oninput="_qlxSidebarSearchInput(this.value)" onclick="event.stopPropagation()">';
        if (_qlx.sidebarSearch) {
            h += '<button onclick="event.stopPropagation();_qlxSidebarSearchInput(\'\')" style="background:none;border:none;color:#ef4444;font-size:12px;font-weight:bold;cursor:pointer">✕</button>';
        }
        h += '</div>';
    }
    if (incOpen && t.incomplete && t.incomplete.categories) {
        t.incomplete.categories.forEach(function(cat) {
            var catOpen = !!_qlxOpen['cat' + cat.id];
            var catAct = f.status === 'incomplete' && f.category_id == cat.id && !f.month;
            h += '<div class="qlx-sb-cat' + (catAct ? ' active' : '') + '" onclick="event.stopPropagation(); _qlxFilter(\'incomplete\',' + cat.id + ')"><span><span onclick="event.stopPropagation(); _qlxToggle(\'cat' + cat.id + '\')" style="cursor:pointer; padding-right:6px; display:inline-block;">' + (catOpen ? '▼' : '▶') + '</span>📁 ' + cat.name + '</span><span style="color:' + (cat.count > 0 ? '#0369a1' : '#999') + ';font-weight:' + (cat.count > 0 ? '800' : '400') + '">' + cat.count + '</span></div>';
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
    var compAct = f.status === 'complete' && !f.year && !f.month;
    h += '<div class="qlx-sb-grp' + (compAct ? ' active' : '') + '" onclick="_qlxFilter(\'complete\')"><span><span onclick="event.stopPropagation(); _qlxToggle(\'comp\')" style="cursor:pointer; padding-right:6px; display:inline-block;">' + (compOpen ? '▼' : '▶') + '</span>✅ Đã Hoàn Thành</span><span style="background:linear-gradient(135deg,#059669,#10b981);color:#fff;padding:2px 10px;border-radius:10px;font-size:10px">' + compTotal + '</span></div>';
    if (compOpen && t.complete && t.complete.months) {
        t.complete.months.forEach(function(m) {
            var mAct = f.status === 'complete' && f.year == m.year && f.month == m.month;
            h += '<div class="qlx-sb-month' + (mAct ? ' active' : '') + '" onclick="event.stopPropagation();_qlxFilter(\'complete\',null,' + m.year + ',' + m.month + ')"><span>▸ T' + String(m.month).padStart(2, '0') + '/' + m.year + '</span><span>' + m.count + '</span></div>';
        });
    }
    sb.innerHTML = h;
}

function _qlxToggle(key) { _qlxOpen[key] = !_qlxOpen[key]; _qlxRenderSidebar(); }
function _qlxToggleGroup(key, status) { _qlxOpen[key] = !_qlxOpen[key]; _qlxFilter(status); }
function _qlxPendingKTFilter() {
    if (_qlx.activeFilter === 'no_print') {
        _qlx.activeFilter = null;
    } else {
        _qlx.activeFilter = 'no_print';
    }
    _qlx.page = 1;
    _qlx.stableOrderIds = null;
    _qlxRenderTable();
    _qlxRenderSidebar();
}
function _qlxSidebarSearchInput(val) {
    _qlx.sidebarSearch = val || '';
    _qlx.page = 1;
    _qlxRenderTable();
    _qlxRenderSidebar();
    var newInp = document.getElementById('qlxSidebarSearch');
    if (newInp) {
        newInp.focus();
        newInp.setSelectionRange(newInp.value.length, newInp.value.length);
    }
}

function _qlxFilter(status, catId, year, month) {
    _qlx.filter = { status: status || 'all', category_id: catId || null, year: year || null, month: month || null };
    _qlx.page = 1;
    _qlx.stableOrderIds = null;
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
        _qlx.phoiFabStatus = res.phoi_fab_status || {};
        _qlx.page = 1;
        _qlxRenderTable();
    } catch(e) { console.error('[QLX] orders:', e); }
}

function _qlxFmtDate(d) { if (!d) return '—'; try { var p = d.split('T')[0].split('-'); return p[2] + '/' + p[1] + '/' + p[0]; } catch(e) { return d; } }

function _qlxGetTienDo(o) {
    if (!o.expected_ship_date) return '—';
    var todayVN = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
    todayVN.setHours(0,0,0,0);
    
    var shipExpected = new Date(o.expected_ship_date);
    shipExpected.setHours(0,0,0,0);
    
    var diffDays = Math.round((todayVN.getTime() - shipExpected.getTime()) / 86400000);
    
    if (o.shipped_at || o.shipping_status === 'shipped') {
        var shipActual = o.shipped_at ? new Date(new Date(o.shipped_at).toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' })) : todayVN;
        shipActual.setHours(0,0,0,0);
        var shipDiff = Math.round((shipExpected.getTime() - shipActual.getTime()) / 86400000);
        if (shipDiff > 0) {
            return '<span style="color:#059669;font-weight:700">⚡ Nhanh ' + shipDiff + ' ngày</span>';
        } else if (shipDiff === 0) {
            return '<span style="color:#059669;font-weight:700">✅ Đúng hạn</span>';
        } else {
            return '<span style="color:#dc2626;font-weight:700">⚠️ Trễ ' + Math.abs(shipDiff) + ' ngày</span>';
        }
    } else {
        if (diffDays < 0) {
            return '<span style="color:#2563eb;font-weight:700">⏳ Còn ' + Math.abs(diffDays) + ' ngày</span>';
        } else if (diffDays === 0) {
            return '<span style="color:#f59e0b;font-weight:800">📦 Hôm nay!</span>';
        } else {
            return '<span style="color:#dc2626;font-weight:800;animation:qlxBlink 1s infinite">🔥 Quá hạn ' + diffDays + ' ngày</span>';
        }
    }
}

function _qlxRenderTable() {
    var all = _qlx.orders.slice();
    if (_qlx.search) {
        var q = _qlx.search.toLowerCase();
        all = all.filter(function(o) {
            var code = (o.order_code || '').toLowerCase();
            var cust = (o.customer_name || '').toLowerCase();
            var sale = (o.cskh_name || o.created_by_name || '').toLowerCase();
            return code.indexOf(q) >= 0 || cust.indexOf(q) >= 0 || sale.indexOf(q) >= 0;
        });
    }
    if (_qlx.sidebarSearch) {
        var sq = _qlx.sidebarSearch.toLowerCase();
        all = all.filter(function(o) {
            var code = (o.order_code || '').toLowerCase();
            var cust = (o.customer_name || '').toLowerCase();
            var sale = (o.cskh_name || o.created_by_name || '').toLowerCase();
            return code.indexOf(sq) >= 0 || cust.indexOf(sq) >= 0 || sale.indexOf(sq) >= 0;
        });
    }
    // Apply active filter button
    if (_qlx.activeFilter) {
        var af = _qlx.activeFilter;
        all = all.filter(function(o) {
            if (af === 'no_print') return !o.sx_print_confirmed;
            if (af === 'no_receive') return o.sx_print_confirmed && !(o.qlx_received_phieu === true || o.qlx_received_phieu === 't' || o.qlx_received_phieu === 1 || o.qlx_received_phieu === '1');
            if (af === 'no_fabric') return !o.fabric_called;
            if (af === 'no_material') return !o.material_called;
            if (af === 'no_pc_in') return !o.nguoi_in;
            if (af === 'no_pc_may') return !o.nguoi_may;
            return true;
        });
    }
    _qlxApplyStableSort(all);
    var total = all.length, totalPages = Math.ceil(total / _qlx.pageSize) || 1;
    if (_qlx.page > totalPages) _qlx.page = totalPages;
    if (_qlx.page < 1) _qlx.page = 1;
    var start = (_qlx.page - 1) * _qlx.pageSize;
    var paged = all.slice(start, start + _qlx.pageSize);
    _qlxRenderRows(paged);
    _qlxRenderPagination(total, totalPages);
    _qlxRenderStats(total, all);
}

function _qlxApplyStableSort(arr) {
    function defaultSort(list) {
        list.sort(function(a, b) {
            var aPrint = a.sx_print_confirmed ? 1 : 0;
            var bPrint = b.sx_print_confirmed ? 1 : 0;
            if (aPrint !== bPrint) return aPrint - bPrint;
            var aRecv = (a.qlx_received_phieu === true || a.qlx_received_phieu === 't' || a.qlx_received_phieu === 1 || a.qlx_received_phieu === '1') ? 1 : 0;
            var bRecv = (b.qlx_received_phieu === true || b.qlx_received_phieu === 't' || b.qlx_received_phieu === 1 || b.qlx_received_phieu === '1') ? 1 : 0;
            if (aPrint && bPrint && aRecv !== bRecv) return aRecv - bRecv;
            var dA = a.expected_ship_date || '9999-12-31', dB = b.expected_ship_date || '9999-12-31';
            return dA < dB ? -1 : dA > dB ? 1 : 0;
        });
    }

    if (!_qlx.stableOrderIds || _qlx.stableOrderIds.length === 0) {
        var tempAll = _qlx.orders.slice();
        defaultSort(tempAll);
        _qlx.stableOrderIds = tempAll.map(function(o) { return o.id; });
    }

    var indexMap = {};
    _qlx.stableOrderIds.forEach(function(id, index) {
        indexMap[id] = index;
    });

    var unknown = arr.filter(function(o) { return indexMap[o.id] === undefined; });
    if (unknown.length > 0) {
        defaultSort(unknown);
        unknown.forEach(function(o) {
            _qlx.stableOrderIds.push(o.id);
            indexMap[o.id] = _qlx.stableOrderIds.length - 1;
        });
    }

    arr.sort(function(a, b) {
        return indexMap[a.id] - indexMap[b.id];
    });
}

function _qlxRenderRows(paged) {
    var tbody = document.getElementById('qlxTbody'); if (!tbody) return;
    if (!paged.length) { tbody.innerHTML = '<tr><td colspan="22"><div class="empty-state"><div class="icon">🏭</div><h3>Chưa có đơn hàng nào</h3><p>Chọn bộ lọc ở sidebar</p></div></td></tr>'; return; }

    var rows = [];
    paged.forEach(function(o) {
        var items = o.items || [];
        if (!items.length) { rows.push({ order: o, phoi: null, item: null, phoiIdx: 0, itemIdx: 0, phoiInItem: 0 }); return; }
        var itemIdx = 0;
        items.forEach(function(it) {
            itemIdx++;
            var pairs = [];
            try { pairs = typeof it.material_pairs === 'string' ? JSON.parse(it.material_pairs) : (it.material_pairs || []); } catch(e) {}
            if (pairs.length > 0) { pairs.forEach(function(p, pIdx) { rows.push({ order: o, phoi: p, item: it, phoiIdx: 0, pairIndex: pIdx, itemIdx: itemIdx, phoiInItem: pIdx + 1 }); }); }
            else { rows.push({ order: o, phoi: null, item: it, phoiIdx: 0, itemIdx: itemIdx, phoiInItem: 1 }); }
        });
    });

    // Count rows per order to decide phối display
    var rowCountPerOrder = {};
    rows.forEach(function(r) { rowCountPerOrder[r.order.id] = (rowCountPerOrder[r.order.id] || 0) + 1; });

    var lastId = null, stt = (_qlx.page - 1) * _qlx.pageSize;
    tbody.innerHTML = rows.map(function(r) {
        var o = r.order, p = r.phoi, it = r.item;
        var isNew = o.id !== lastId;
        if (isNew) { stt++; lastId = o.id; }
        var bg = isNew ? '' : 'background:#f0f9ff;';

        var fabIcon, fabCls = '', matIcon, matCls = '';
        // Per-phoi fabric icon
        var _pfKey = o.id + '_' + (it ? it.id : 0) + '_' + (r.pairIndex || 0);
        var _pfs = (_qlx.phoiFabStatus || {})[_pfKey];
        if (_pfs && _pfs.pending === 0 && _pfs.arrived > 0) { fabIcon = '✅'; fabCls = ' on-fab'; }
        else if (_pfs && _pfs.total > 0) { fabIcon = '📞'; fabCls = ' on-mat'; }
        else { fabIcon = '🧵'; }
        // Material called/arrived status per-ticket
        var isMatArrived = it ? it.material_arrived : o.material_arrived;
        var isMatCalled = it ? it.material_called : o.material_called;
        if (isMatArrived) { matIcon = '✅'; matCls = ' on-fab'; } 
        else if (isMatCalled) { matIcon = '📥'; matCls = ' on-mat'; } 
        else { matIcon = '🔩'; }

        var matAct = isMatArrived ? 'reset_arrive' : isMatCalled ? 'arrive' : 'call';

        var itemDesc = it ? (it.description || '') : '';
        var totalRows = rowCountPerOrder[o.id] || 1;
        var priority = (o.shipping_priority || 'CHUẨN').toUpperCase();
        var priBadge = '';
        if (priority === 'GẤP') {
            priBadge = '<span style="margin-right: 6px; background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; font-size: 9px; padding: 1px 4px; border-radius: 3px; font-weight: bold; display: inline-block; vertical-align: middle;">Gấp</span>';
        } else if (priority === 'GỬI') {
            priBadge = '<span style="margin-right: 6px; background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; font-size: 9px; padding: 1px 4px; border-radius: 3px; font-weight: bold; display: inline-block; vertical-align: middle;">Gửi</span>';
        } else {
            priBadge = '<span style="margin-right: 6px; background: #f3e8ff; color: #7e22ce; border: 1px solid #d8b4fe; font-size: 9px; padding: 1px 4px; border-radius: 3px; font-weight: bold; display: inline-block; vertical-align: middle;">Chuẩn</span>';
        }
        var spName;
        if (totalRows > 1) {
            spName = priBadge + o.order_code + ' \u2014 Phi\u1ebfu ' + r.itemIdx + ' \u2014 P' + r.phoiInItem + (itemDesc ? ' \u2014 ' + itemDesc : '');
        } else {
            spName = priBadge + o.order_code + (itemDesc ? ' \u2014 ' + itemDesc : '');
        }
        var phoiTag = '';
        var matName = p ? (p.material_name || '') : (it ? (it.material_name || '') : '');
        var colorName = p ? (p.color_name || '') : (it ? (it.color_name || '') : '');

        var priColor = o.shipping_priority === 'GẤP' ? 'background:#dc2626;color:#fff' : o.shipping_priority === 'GỬI' ? 'background:#f59e0b;color:#fff' : 'background:#e2e8f0;color:#334155';

        var statusHtml = '<div class="qlx-status-bar">'
            + '<div class="qlx-status-dot" style="background:' + (o.fabric_arrived ? '#059669' : o.fabric_called ? '#f59e0b' : '#e2e8f0') + '" title="Vải"></div>'
            + '<div class="qlx-status-dot" style="background:' + (isMatArrived ? '#059669' : isMatCalled ? '#f59e0b' : '#e2e8f0') + '" title="VL"></div>'
            + '<div class="qlx-status-dot" style="background:' + (o.nguoi_in ? '#059669' : '#e2e8f0') + '" title="In"></div>'
            + '<div class="qlx-status-dot" style="background:' + (o.nguoi_may ? '#059669' : '#e2e8f0') + '" title="May"></div></div>';

        var updateStr = '';
        if (o.last_update_at) { updateStr = _qlxFmtDate(o.last_update_at); if (o.last_update_by) updateStr += '<br><span style="color:#0369a1;font-size:9px">' + o.last_update_by + '</span>'; }

        var h = '<tr style="' + bg + '">';
        
        // Column 1: STT
        if (isNew) {
            h += '<td style="text-align:center;font-weight:700;color:#94a3b8">' + stt + '</td>';
        } else {
            h += '<td style="text-align:center;font-weight:700;color:#94a3b8"></td>';
        }

        // Columns 2 to 5 (Preparation & Assignments)
        if (o.qlx_reviewed) {
            if (r.phoiInItem === 1) {
                // First coord of a ticket: show Vải, VL, In, May
                
                // Column 2: Gọi vải
                h += '<td style="text-align:center"><button class="qlx-icon-btn' + fabCls + '" onclick="_qlxFabricPopup(' + o.id + ',' + (it ? it.id : 0) + ',' + (r.pairIndex || 0) + ')" title="Vải">' + fabIcon + '</button></td>';
                
                // Column 3: Gọi vật liệu
                h += '<td style="text-align:center"><button class="qlx-icon-btn' + matCls + '" onclick="_qlxMaterial(' + o.id + ',\'' + matAct + '\',' + (it ? it.id : 0) + ')" title="VL">' + matIcon + '</button></td>';
                
                // Columns 4 & 5: In & May
                if (o.sx_print_confirmed) {
                    var receivedPhieu = o.qlx_received_phieu === true || o.qlx_received_phieu === 't' || o.qlx_received_phieu === 1 || o.qlx_received_phieu === '1';
                    if (receivedPhieu) {
                        var hasNguoiIn = it ? it.nguoi_in : o.nguoi_in;
                        var hasNguoiMay = it ? it.nguoi_may : o.nguoi_may;
                        var isSewingAllowed = it ? (it.is_cut_done && it.is_material_done) : (o.is_cut_done && o.is_material_done);
                        var sewClass = '';
                        if (hasNguoiMay) {
                            sewClass = ' on-sew';
                        } else if (isSewingAllowed) {
                            sewClass = ' qlx-sew-ready';
                        } else {
                            sewClass = ' qlx-sew-not-ready';
                        }
                        h += '<td style="text-align:center"><button class="qlx-icon-btn' + (hasNguoiIn ? ' on-pri' : '') + '" onclick="_qlxAssign(' + o.id + ',\'in\',' + (it ? it.id : 0) + ')" title="PC In">🖨️</button></td>';
                        h += '<td style="text-align:center"><button class="qlx-icon-btn' + sewClass + '" onclick="_qlxAssign(' + o.id + ',\'may\',' + (it ? it.id : 0) + ')" title="PC May">🪡</button></td>';
                    } else {
                        if (isNew) {
                            h += '<td colspan="2" style="text-align:center;padding:4px 6px"><button class="qlx-icon-btn" onclick="_qlxReceivePhieu(' + o.id + ')" style="width:auto;padding:2px 10px;background:linear-gradient(135deg,#dbeafe,#bfdbfe);border-color:#3b82f6;font-size:9px;font-weight:700;color:#1e40af;white-space:nowrap;animation:qlxPulse 2s infinite" title="Xác nhận đã nhận Phiếu SX từ KT">📋 Nhận Phiếu SX</button></td>';
                        } else {
                            h += '<td></td><td></td>';
                        }
                    }
                } else {
                    if (isNew) {
                        h += '<td colspan="2" style="text-align:center;padding:4px 6px"><button class="qlx-icon-btn" style="width:auto;padding:2px 10px;background:linear-gradient(135deg,#fee2e2,#fecaca);border-color:#ef4444;font-size:9px;font-weight:700;color:#dc2626;white-space:nowrap;animation:qlxPulse 2s infinite;cursor:default" title="Chưa In Phiếu Sản Xuất">🖨️ Chưa In Phiếu SX</button></td>';
                    } else {
                        h += '<td></td><td></td>';
                    }
                }
            } else {
                // Subsequent coords of a ticket (P2, P3...): only show Vải (Column 2)
                h += '<td style="text-align:center"><button class="qlx-icon-btn' + fabCls + '" onclick="_qlxFabricPopup(' + o.id + ',' + (it ? it.id : 0) + ',' + (r.pairIndex || 0) + ')" title="Vải" style="font-size:10px">' + fabIcon + '</button></td>';
                h += '<td></td><td></td><td></td>';
            }
        } else {
            if (isNew) {
                h += '<td colspan="4" style="text-align:center;padding:4px 6px"><div class="qlx-cl-icon-btn" onclick="_qlxChecklist(' + o.id + ',\'' + (o.order_code||'') + '\',\'' + (o.customer_name||'').replace(/'/g,'') + '\')">📋 Kiểm tra</div></td>';
            } else {
                h += '<td colspan="4"></td>';
            }
        }

        var showAssignNames = r.phoiInItem === 1;

        h += '<td style="font-weight:600;color:#1e293b;font-size:11px">' + (isNew ? (o.customer_name || '') : '') + '</td>';
        h += '<td style="font-size:10px;color:#6b7280">' + (isNew ? (o.cskh_name || o.created_by_name || '') : '') + '</td>';
        h += '<td style="font-size:10px;text-align:center">' + (isNew ? _qlxGetTienDo(o) : '') + '</td>';
        h += '<td style="font-weight:600">' + phoiTag + '<span style="color:#1e293b;font-size:11px">' + spName + '</span></td>';
        h += '<td style="font-size:10px;color:#475569">' + matName + '</td>';
        h += '<td style="font-size:10px">' + (colorName ? '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#0ea5e9;margin-right:3px;vertical-align:middle"></span>' + colorName : '') + '</td>';
        // SL: P1 (phối chính mỗi phiếu) = xanh đậm, P2+ = xanh nhạt; hiển thị SL của item, không phải tổng đơn
        var rawQty = it ? (it.quantity || o.total_quantity || '') : (o.total_quantity || '');
        var itemQtyLabel = rawQty;
        if (rawQty !== '') {
            if (r.phoiInItem === 1) {
                var suffix = (it && it.cutting_category_name) ? (' ' + it.cutting_category_name) : '';
                itemQtyLabel = rawQty + suffix;
            } else if (r.phoiInItem > 1) {
                itemQtyLabel = rawQty + ' Phối';
            }
        }
        if (r.phoiInItem === 1 || isNew) {
            h += '<td style="text-align:center;font-weight:700;color:#0369a1">' + itemQtyLabel + '</td>';
        } else {
            h += '<td style="text-align:center;font-weight:700;color:#93c5fd;font-size:10px">' + itemQtyLabel + '</td>';
        }
        h += '<td style="font-size:10px;color:#475569">' + (isNew ? _qlxFmtDate(o.expected_ship_date) : '') + '</td>';
        h += '<td style="text-align:center">' + (isNew ? statusHtml : '') + '</td>';
        
        var nvCatHtml = showAssignNames ? ((it && it.nguoi_cat) || o.nguoi_cat || '—') : '';
        h += '<td style="font-size:10px;color:#059669;font-weight:600">' + nvCatHtml + '</td>';
        
        var nvInHtml = showAssignNames ? ((it && it.nguoi_in) || o.nguoi_in || '—') : '';
        if (nvInHtml && nvInHtml !== '—') {
            nvInHtml = nvInHtml.replace(/;\s*/g, '<br>');
        }
        if (isNew && o.in_theu_chung_names) nvInHtml += '<br><span style="font-size:8px;color:#8b5cf6;font-weight:600" title="In/Thêu Chung: ' + (o.in_theu_chung_names||'').replace(/"/g,'') + '">🤝 ' + o.in_theu_chung_names + '</span>';
        h += '<td style="font-size:10px;color:#2563eb;font-weight:600">' + nvInHtml + '</td>';
        
        var nvEpHtml = showAssignNames ? (o.nguoi_ep || '—') : '';
        h += '<td style="font-size:10px;color:#d97706;font-weight:600">' + nvEpHtml + '</td>';
        
        var nvMayHtml = showAssignNames ? ((it && it.nguoi_may) || o.nguoi_may || '—') : '';
        h += '<td style="font-size:10px;color:#dc2626;font-weight:600">' + nvMayHtml + '</td>';
        
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

    // Count all stats from unfiltered orders
    var allOrders = _qlx.orders || [];
    var totalAll = allOrders.length;
    var noPrint = allOrders.filter(function(o) { return !o.sx_print_confirmed; }).length;
    var noReceive = allOrders.filter(function(o) { return o.sx_print_confirmed && !(o.qlx_received_phieu === true || o.qlx_received_phieu === 't' || o.qlx_received_phieu === 1 || o.qlx_received_phieu === '1'); }).length;
    var noFab = allOrders.filter(function(o) { return !o.fabric_called; }).length;
    var noMat = allOrders.filter(function(o) { return !o.material_called; }).length;
    var noIn = allOrders.filter(function(o) { return !o.nguoi_in; }).length;
    var noMay = allOrders.filter(function(o) { return !o.nguoi_may; }).length;

    var af = _qlx.activeFilter || '';
    var sc = document.getElementById('qlxStatCards'); if (!sc) return;
    function _fc(key, label, cnt, grad, icon) {
        var isActive = af === key;
        var opacity = isActive ? '1' : '0.85';
        var scale = isActive ? 'transform:scale(1.05);box-shadow:0 6px 20px rgba(0,0,0,0.25)' : 'box-shadow:0 4px 15px rgba(0,0,0,0.15)';
        return '<button onclick="_qlxStatFilter(\'' + key + '\')" style="background:linear-gradient(135deg,' + grad + ');color:#fff;padding:8px 16px;border-radius:10px;min-width:90px;text-align:center;border:none;cursor:pointer;position:relative;overflow:hidden;opacity:' + opacity + ';transition:all .2s;' + scale + '">'
            + '<div style="position:absolute;top:0;left:-50%;width:200%;height:100%;background:linear-gradient(90deg,transparent 40%,rgba(255,255,255,0.15) 50%,transparent 60%);animation:qlxShimmer 2.5s infinite"></div>'
            + '<div style="font-size:9px;font-weight:600;opacity:0.9;letter-spacing:0.5px;margin-bottom:2px;white-space:nowrap">' + icon + ' ' + label + '</div>'
            + '<div style="font-size:18px;font-weight:900">' + cnt + '</div></button>';
    }
    sc.innerHTML = '<div style="display:flex;flex-direction:column;gap:8px;width:100%">'
        + '<div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center">'
        + _fc('no_print', 'Chưa In Phiếu', noPrint, '#dc2626,#ef4444', '🖨️')
        + _fc('no_receive', 'Chưa Nhận Phiếu', noReceive, '#d97706,#f59e0b', '📋')
        + '</div>'
        + '<div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center">'
        + _fc('no_fabric', 'Chưa Gọi Vải', noFab, '#059669,#10b981', '🧵')
        + _fc('no_material', 'Chưa Gọi VL', noMat, '#0369a1,#0ea5e9', '🔩')
        + _fc('no_pc_in', 'Chưa PC In', noIn, '#7c3aed,#8b5cf6', '🖨️')
        + _fc('no_pc_may', 'Chưa PC May', noMay, '#be185d,#ec4899', '🪡')
        + '</div></div>';
}

function _qlxStatFilter(key) {
    if (_qlx.activeFilter === key || key === '') {
        _qlx.activeFilter = null;
    } else {
        _qlx.activeFilter = key;
    }
    _qlx.page = 1;
    _qlxRenderTable();
    _qlxRenderSidebar();
}

async function _qlxFabric(orderId, action) {
    try {
        var res = await apiCall('/api/qlx/fabric/' + orderId, 'POST', { action: action });
        if (res && res.error) {
            showToast('⚠️ ' + res.error, 'error');
            return;
        }
        showToast('✅ Cập nhật vải');
        await _qlxLoadAll();
    } catch(e) { showToast(e.message, 'error'); }
}

async function _qlxFabricPopup(orderId, itemId, pairIndex) {
    try {
        var data = await apiCall('/api/qlx/fabric-lookup/' + orderId + '/' + itemId + '/' + pairIndex);
        var d = data; // keep reference for pendingCalls/myLinkedIds
        var o = data.order, it = data.item, ph = data.phoi, wh = data.warehouse, rolls = data.rolls || [], existing = data.existing || [];
        var unit = wh ? wh.unit : 'kg';
        var unitLabel = unit === 'kg' ? 'kg' : unit === 'met' ? 'mét' : 'cái';
        // Store for _qlxFabLink access
        window._qlxFabPopupData = { material_name: ph ? ph.material_name : '', color_name: ph ? ph.color_name : '', unit: unit };

        var html = '<div style="padding:0">';
        // Header info
        html += '<div style="background:linear-gradient(135deg,#0f172a,#1e3a5f);color:#fff;padding:16px 20px;border-radius:12px 12px 0 0">';
        html += '<div style="font-size:16px;font-weight:800;margin-bottom:4px">🧵 GỌI VẢI</div>';
        html += '<div style="font-size:11px;opacity:0.8">📋 Đơn: ' + (o.order_code||'') + ' — Phối ' + ((pairIndex||0)+1) + (it.description ? ' — ' + it.description : '') + '</div>';
        if (ph) {
            html += '<div style="display:flex;gap:16px;margin-top:8px;font-size:12px">';
            html += '<div>Chất Liệu: <b>' + (ph.material_name||'—') + '</b></div>';
            html += '<div>Màu: <b>' + (ph.color_name||'—') + '</b></div>';
            html += '<div>Định Lượng: <b>' + unitLabel + '</b></div>';
            html += '</div>';
        }
        html += '</div>';

        if (!ph || !ph.material_name) {
            html += '<div style="padding:30px;text-align:center;color:#94a3b8">⚠️ Phối này chưa có thông tin chất liệu/màu</div>';
        } else if (!wh) {
            // No match in kho
            html += '<div style="padding:16px 20px"><div style="background:#fef3c7;border:1px solid #fbbf24;border-radius:8px;padding:12px;font-size:12px;color:#92400e;font-weight:600">⚠️ Kho không có chất liệu <b>' + ph.material_name + '</b> màu <b>' + ph.color_name + '</b></div></div>';
            html += _qlxFabCallSection(ph, unit, unitLabel, orderId, itemId, pairIndex);
        } else {
            // Determine which type already chosen
            var hasStock = false, hasCall = false;
            if (existing.length) {
                existing.forEach(function(ex) {
                    if (ex.reservation_type === 'from_stock') hasStock = true;
                    if (ex.reservation_type === 'new_call') hasCall = true;
                });
            }

            // Show existing reservations
            if (existing.length) {
                // Sort: arrived first (kg ascending), then pending
                existing.sort(function(a, b) {
                    var aArr = a.status === 'arrived' ? 0 : 1;
                    var bArr = b.status === 'arrived' ? 0 : 1;
                    if (aArr !== bArr) return aArr - bArr;
                    return (Number(a.kg_reserved)||0) - (Number(b.kg_reserved)||0);
                });
                html += '<div style="padding:12px 20px 0"><div style="font-size:12px;font-weight:800;color:#0f172a;margin-bottom:8px">📋 TRẠNG THÁI VẢI: <span style="font-weight:600;color:#6b7280;font-size:11px">(' + existing.length + ' Cây Vải)</span></div>';
                existing.forEach(function(ex, exIdx) {
                    var isArrived = ex.status === 'arrived';
                    var bgColor = isArrived ? '#f0fdf4' : '#fffbeb';
                    var borderColor = isArrived ? '#86efac' : '#fbbf24';
                    var statusBadge = isArrived
                        ? '<span style="background:linear-gradient(135deg,#059669,#10b981);color:#fff;padding:2px 8px;border-radius:4px;font-size:8px;font-weight:700;white-space:nowrap">✅ ĐÃ VỀ</span>'
                        : '<span style="background:linear-gradient(135deg,#d97706,#f59e0b);color:#fff;padding:2px 8px;border-radius:4px;font-size:8px;font-weight:700;white-space:nowrap">⏳ ĐANG CHỜ</span>';
                    var lbl = ex.reservation_type === 'from_stock'
                        ? '📦 ' + (ex.material_name||ph.material_name||'') + ' - ' + (ex.color_name||ph.color_name||'') + ': ' + ex.kg_reserved + unitLabel
                        : (ex.reservation_type === 'linked_call'
                            ? '📎 Liên kết: ' + (ex.call_content || ex.material_name + ' - ' + ex.color_name) + (ex.linked_from_order_code ? ' (từ 🔖 ' + ex.linked_from_order_code + ')' : '')
                            : '📞 ' + (ex.call_content || ex.material_name + ' - ' + ex.color_name));
                    // Build inline date + confirmer
                    var inlineDate = '';
                    if (isArrived && ex.arrived_at) {
                        var dt = new Date(ex.arrived_at);
                        var dateStr = ('0'+dt.getDate()).slice(-2) + '/' + ('0'+(dt.getMonth()+1)).slice(-2) + '/' + dt.getFullYear();
                        inlineDate = ' <span style="font-size:9px;color:#059669;font-weight:600">📅 ' + dateStr + (ex.arrived_by_name ? ' • ' + ex.arrived_by_name : '') + '</span>';
                    }
                    var createdInfo = (!isArrived && ex.created_by_name) ? ' <span style="font-size:9px;color:#6b7280">Tạo: ' + ex.created_by_name + '</span>' : '';

                    html += '<div style="background:' + bgColor + ';border:1.5px solid ' + borderColor + ';border-radius:8px;padding:8px 12px;margin-bottom:6px;font-size:11px">';
                    html += '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">';
                    html += '<span style="font-size:10px;font-weight:800;color:#6b7280;min-width:18px">' + (exIdx+1) + '.</span>';
                    html += statusBadge + ' ';
                    html += '<span style="flex:1;font-weight:700;color:#1e293b">' + lbl + inlineDate + createdInfo + '</span>';
                    if (!isArrived) {
                        html += '<button onclick="_qlxFabArrived(' + ex.id + ',' + orderId + ',' + itemId + ',' + pairIndex + ')" style="padding:3px 10px;background:linear-gradient(135deg,#059669,#10b981);color:#fff;border:none;border-radius:6px;font-size:9px;font-weight:700;cursor:pointer;white-space:nowrap">✅ Vải Đã Về</button>';
                    }
                    if ((ex.reservation_type === 'new_call' || ex.reservation_type === 'linked_call') && ex.call_content) {
                        html += '<button onclick="navigator.clipboard.writeText(\'' + (ex.call_content||'').replace(/'/g, "\\'") + '\');showToast(\'📋 Đã copy!\')" style="padding:3px 10px;background:#dbeafe;border:1px solid #93c5fd;border-radius:6px;font-size:9px;font-weight:600;cursor:pointer;color:#1e40af;white-space:nowrap">📋 Copy</button>';
                    }
                    html += '<button onclick="_qlxFabRelease(' + ex.id + ',' + orderId + ',' + itemId + ',' + pairIndex + ')" style="padding:3px 10px;background:#fef2f2;border:1px solid #fca5a5;border-radius:6px;font-size:9px;cursor:pointer;color:#dc2626;font-weight:600;white-space:nowrap">🔓 Hủy</button>';
                    html += '</div>';
                    // Show linked orders for new_call reservations
                    if (ex.reservation_type === 'new_call' && ex.linked_order_codes) {
                        html += '<div style="font-size:9px;color:#7c3aed;margin-top:3px;padding-left:28px;font-weight:600">🔗 Đã liên kết: ' + ex.linked_order_codes + ' (' + (ex.linked_count||0) + ' đơn)</div>';
                    }
                    html += '</div>';
                });
                html += '</div>';
            }
            // === Pending calls from other orders (same material/color) ===
            var pendingCalls = d.pendingCalls || [];
            var myLinkedIds = d.myLinkedIds || [];
            // Filter: only show calls NOT already linked by this order
            var showableCalls = pendingCalls.filter(function(pc) { return myLinkedIds.indexOf(pc.id) < 0; });
            if (showableCalls.length) {
                html += '<div style="padding:8px 20px"><div style="border:1.5px dashed #8b5cf6;border-radius:10px;padding:10px;background:#faf5ff">';
                html += '<div style="font-size:11px;font-weight:800;color:#7c3aed;margin-bottom:8px">📞 CUỘC GỌI VẢI ĐANG CHỜ (cùng ' + ph.material_name + ' - ' + ph.color_name + ')</div>';
                showableCalls.forEach(function(pc) {
                    var linkedWarn = pc.linked_count > 5 ? '<div style="font-size:9px;color:#dc2626;margin-top:2px">⚠️ Đã có ' + pc.linked_count + ' đơn liên kết!</div>' : '';
                    html += '<div style="background:#fff;border:1px solid #e9d5ff;border-radius:8px;padding:8px 10px;margin-bottom:6px">';
                    html += '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">';
                    html += '<span style="background:#dbeafe;color:#1e40af;padding:1px 6px;border-radius:4px;font-size:8px;font-weight:700">🔖 ' + pc.order_code + '</span>';
                    html += '<span style="font-size:10px;color:#374151;font-weight:600">' + (pc.product_name ? 'Phối ' + ((pc.phoi_index||0)+1) + ' — ' + pc.product_name : 'Phối ' + ((pc.phoi_index||0)+1)) + '</span>';
                    html += '<span style="margin-left:auto"></span>';
                    html += '<button onclick="_qlxFabLink(' + pc.id + ',' + orderId + ',' + itemId + ',' + pairIndex + ')" style="padding:3px 10px;background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;border:none;border-radius:6px;font-size:9px;font-weight:700;cursor:pointer;white-space:nowrap">📎 Liên kết đơn này</button>';
                    html += '</div>';
                    html += '<div style="font-size:10px;color:#6b7280;margin-top:4px">📞 ' + (pc.call_content || pc.material_name + ' - ' + pc.color_name) + '</div>';
                    if (pc.linked_count > 0) html += '<div style="font-size:9px;color:#7c3aed;margin-top:2px">🔗 Đã có ' + pc.linked_count + ' đơn liên kết</div>';
                    html += linkedWarn;
                    html += '</div>';
                });
                html += '</div></div>';
            }

            // === Stock section (always visible when warehouse has data) ===
            html += '<div id="_qlxSecStock">';
            html += '<div style="padding:0 20px"><div style="font-size:12px;font-weight:700;color:#1e293b;margin-bottom:8px">📦 LẤY VẢI TỪ KHO (' + wh.warehouse_name + ') <span style="font-weight:600;color:#6b7280;font-size:11px">— ' + rolls.length + ' Cây Vải</span></div>';
            if (rolls.length) {
                // Sort: group by primary order tag, then by available ascending
                var orderCode = o.order_code || '';
                rolls.sort(function(a, b) {
                    // First: locked by cutting on top, unlocked below
                    var aLocked = a.locked_by_cutting_id ? 1 : 0;
                    var bLocked = b.locked_by_cutting_id ? 1 : 0;
                    if (aLocked !== bLocked) return bLocked - aLocked;

                    // Second: rolls with available > 0 on top, 0 at bottom
                    var aHas = a.available > 0 ? 1 : 0;
                    var bHas = b.available > 0 ? 1 : 0;
                    if (aHas !== bHas) return bHas - aHas;

                    // Parse called_for_orders
                    var aOrders = a.called_for_orders || [];
                    var bOrders = b.called_for_orders || [];
                    if (typeof aOrders === 'string') try { aOrders = JSON.parse(aOrders); } catch(e) { aOrders = []; }
                    if (typeof bOrders === 'string') try { bOrders = JSON.parse(bOrders); } catch(e) { bOrders = []; }

                    // Filter called_for_orders by active reservations
                    var aActive = (a.reservations || []).map(function(rv) { return rv.order_code; });
                    var bActive = (b.reservations || []).map(function(rv) { return rv.order_code; });
                    aOrders = aOrders.filter(function(ord) { return aActive.indexOf(ord) >= 0; });
                    bOrders = bOrders.filter(function(ord) { return bActive.indexOf(ord) >= 0; });

                    // Priority: this-order first, then other orders, then untagged
                    var aMatch = aOrders.indexOf(orderCode) >= 0 ? 2 : (aOrders.length > 0 ? 1 : 0);
                    var bMatch = bOrders.indexOf(orderCode) >= 0 ? 2 : (bOrders.length > 0 ? 1 : 0);
                    if (aMatch !== bMatch) return bMatch - aMatch;
                    // Same group: sort by primary order tag to cluster
                    var aTag = aOrders.length ? aOrders[0] : 'zzz';
                    var bTag = bOrders.length ? bOrders[0] : 'zzz';
                    if (aTag !== bTag) return aTag.localeCompare(bTag);
                    // Same tag: sort by available ascending
                    return a.available - b.available;
                });
                rolls.forEach(function(rl, idx) {
                    var avail = Math.max(0, rl.available);
                    var resInfo = '';
                    if (rl.reservations && rl.reservations.length) {
                        rl.reservations.forEach(function(rv) {
                            var isThisOrder = rv.order_code === orderCode;
                            var badge = isThisOrder
                                ? '<span style="background:#dcfce7;color:#059669;padding:1px 6px;border-radius:4px;font-size:8px;font-weight:700;white-space:nowrap">🏷️ Đơn này</span>'
                                : '<span style="background:#dbeafe;color:#1e40af;padding:1px 6px;border-radius:4px;font-size:8px;font-weight:700;white-space:nowrap">🔖 ' + rv.order_code + '</span>';
                            var phoiLabel = ' Phối ' + ((rv.phoi_index||0)+1);
                            var prodName = rv.product_name ? ' — ' + rv.product_name : '';
                            var editId = '_qlxResKg_' + rv.id;
                            // Calculate max allowed for this reservation: rollWeight - otherReservations
                            var otherKg = 0;
                            rl.reservations.forEach(function(orv) { if (orv.id !== rv.id) otherKg += Number(orv.kg_reserved||0); });
                            var editMax = Number(rl.weight) - otherKg;
                            resInfo += '<div id="' + editId + '_row" style="font-size:10px;color:#475569;margin-top:3px;padding-left:8px;display:flex;align-items:center;gap:4px;flex-wrap:wrap">'
                                + badge
                                + '<span style="font-weight:600">' + phoiLabel + prodName + ': <b id="' + editId + '_val">' + rv.kg_reserved + unitLabel + '</b></span>'
                                + '<button onclick="_qlxFabEditKgToggle(' + rv.id + ',' + rv.kg_reserved + ',\'' + unitLabel + '\',' + orderId + ',' + itemId + ',' + pairIndex + ',' + editMax + ')" style="background:none;border:none;cursor:pointer;font-size:10px;padding:0 2px" title="Sửa kg">✏️</button>'
                                + '<button onclick="_qlxFabRelease(' + rv.id + ',' + orderId + ',' + itemId + ',' + pairIndex + ')" style="background:none;border:none;cursor:pointer;font-size:10px;padding:0 2px" title="Hủy giữ vải">🗑️</button>'
                                + '</div>';
                        });
                    }
                    // Determine tag from called_for_orders
                    var calledOrders = rl.called_for_orders || [];
                    if (typeof calledOrders === 'string') try { calledOrders = JSON.parse(calledOrders); } catch(e) { calledOrders = []; }
                    var activeResOrders = (rl.reservations || []).map(function(rv) { return rv.order_code; });
                    calledOrders = calledOrders.filter(function(ord) { return activeResOrders.indexOf(ord) >= 0; });
                    var tagHtml = '';
                    if (calledOrders.indexOf(orderCode) >= 0) {
                        tagHtml = '<span style="background:#dcfce7;color:#059669;padding:1px 6px;border-radius:4px;font-size:8px;font-weight:700;white-space:nowrap">🏷️ Gọi cho đơn này</span>';
                    } else if (calledOrders.length > 0) {
                        tagHtml = '<span style="background:#f1f5f9;color:#64748b;padding:1px 6px;border-radius:4px;font-size:8px;font-weight:700;white-space:nowrap">🔖 ' + calledOrders[0] + '</span>';
                    }

                    var borderColor = calledOrders.indexOf(orderCode) >= 0 ? '#86efac' : '#e2e8f0';
                    var bgColor = calledOrders.indexOf(orderCode) >= 0 ? '#f0fdf4' : '#f8fafc';
                    // Cutting lock check
                    var isLocked = !!rl.locked_by_cutting_id;
                    if (isLocked) { borderColor = '#fca5a5'; bgColor = '#fef2f2'; }
                    html += '<div style="background:' + bgColor + ';border:1.5px solid ' + borderColor + ';border-radius:8px;padding:10px;margin-bottom:6px;' + (isLocked ? 'opacity:0.6;' : '') + '">';
                    html += '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">';
                    html += '<span style="font-size:10px;font-weight:800;color:#6b7280;min-width:18px">' + (idx+1) + '.</span>';
                    html += '<span style="font-weight:700;font-size:11px;color:#1e293b">' + (ph.material_name||'') + ' - ' + (ph.color_name||'') + ' - ' + rl.weight + unitLabel + '</span>';
                    if (rl.is_original_tree) html += '<span style="background:#dbeafe;color:#1e40af;padding:1px 6px;border-radius:4px;font-size:8px;font-weight:700">CÂY NGUYÊN</span>';
                    if (isLocked) {
                        html += '<span style="background:#dc2626;color:#fff;padding:2px 8px;border-radius:4px;font-size:8px;font-weight:700;white-space:nowrap">🔒 Đang cắt: ' + (rl.cutting_order_name || 'Đang xử lý') + (rl.cutting_by_name ? ' (' + rl.cutting_by_name + ')' : '') + '</span>';
                    }
                    if (tagHtml) html += tagHtml;
                    html += '<span style="margin-left:auto;font-size:10px;color:' + (avail > 0 ? '#059669' : '#dc2626') + ';font-weight:700">✅ Còn: ' + avail + unitLabel + '</span>';
                    html += '</div>';
                    // Show import date inline below header
                    if (rl.roll_created_at) {
                        var rdt = new Date(rl.roll_created_at);
                        var rdStr = ('0'+rdt.getDate()).slice(-2) + '/' + ('0'+(rdt.getMonth()+1)).slice(-2) + '/' + rdt.getFullYear();
                        html += '<div style="font-size:9px;color:#8b5cf6;margin-top:1px;padding-left:26px">📅 ' + rdStr + '</div>';
                    }
                    html += resInfo;
                    // Check if roll has any arrived reservations (fabric physically in warehouse)
                    var hasArrived = rl.reservations && rl.reservations.some(function(rv) { return rv.res_status === 'arrived'; });
                    // Check if this order already has a reservation on this roll
                    var alreadyMarked = rl.reservations && rl.reservations.some(function(rv) { return rv.order_code === orderCode; });
                    if (avail > 0 && !alreadyMarked) {
                        html += '<div style="display:flex;align-items:center;gap:8px;margin-top:6px">';
                        html += '<span style="font-size:10px;color:#475569;font-weight:700">Sử dụng:<span style="color:#dc2626"> *</span></span>';
                        html += '<input id="_qlxFabKg_' + idx + '" type="number" step="0.1" min="0.1" max="' + avail + '" placeholder="Tối đa ' + avail + '" required style="width:90px;padding:4px 8px;border:1.5px solid #e2e8f0;border-radius:6px;font-size:11px;text-align:center" value="">';
                        html += '<span style="font-size:10px;color:#64748b">' + unitLabel + '</span>';
                        html += '<button onclick="_qlxFabReserveRoll(' + orderId + ',' + itemId + ',' + pairIndex + ',' + rl.id + ',\'' + (rl.roll_code||'') + '\',' + idx + ',\'' + (ph.material_name||'') + '\',\'' + (ph.color_name||'') + '\',\'' + unit + '\')" style="padding:4px 12px;background:linear-gradient(135deg,#059669,#10b981);color:#fff;border:none;border-radius:6px;font-size:10px;font-weight:700;cursor:pointer">📌 Đánh dấu</button>';
                        html += '</div>';
                    }
                    html += '</div>';
                });
            } else {
                html += '<div style="text-align:center;padding:12px;color:#94a3b8;font-size:11px">Kho chưa có cây vải nào</div>';
            }
            html += '</div></div>';

            // === Divider ===
            html += '<div style="padding:0 20px;margin:12px 0"><div style="border-top:1.5px dashed #cbd5e1"></div></div>';

            // === Call new section (always visible) ===
            html += '<div id="_qlxSecCall">';
            html += _qlxFabCallSection(ph, unit, unitLabel, orderId, itemId, pairIndex);
            html += '</div>';
        }

        html += '<div style="padding:12px 20px;border-top:1px solid #e2e8f0;text-align:right">';
        html += '<button onclick="document.getElementById(\'_qlxFabOverlay\').remove()" style="padding:8px 20px;background:#f1f5f9;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;color:#475569">Đóng</button>';
        html += '</div></div>';

        var old = document.getElementById('_qlxFabOverlay'); if (old) old.remove();
        var ov = document.createElement('div');
        ov.className = 'qlx-cl-overlay'; ov.id = '_qlxFabOverlay';
        ov.onclick = function(e) { if (e.target === ov) ov.remove(); };
        ov.innerHTML = '<div class="qlx-cl-popup" style="width:700px;max-height:90vh;overflow-y:auto">' + html + '</div>';
        document.body.appendChild(ov);
    } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
}

function _qlxFabCallSection(ph, unit, unitLabel, orderId, itemId, pairIndex) {
    var mat = (ph.material_name||'').replace(/'/g, "\\'");
    var col = (ph.color_name||'').replace(/'/g, "\\'");
    var oninput = 'oninput="_qlxFabPreview(\'' + mat + '\',\'' + col + '\',\'' + unit + '\')"';
    var html = '<div style="padding:12px 20px"><div style="font-size:12px;font-weight:700;color:#1e293b;margin-bottom:8px">📞 GỌI VẢI MỚI</div>';
    html += '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px">';
    html += '<div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin-bottom:8px">';
    html += '<div><label style="font-size:10px;font-weight:600;color:#475569">Số cây</label><input id="_qlxFabCallTrees" type="number" min="0" value="0" ' + oninput + ' style="display:block;width:70px;padding:6px;border:1.5px solid #e2e8f0;border-radius:6px;font-size:12px;text-align:center;margin-top:2px"></div>';
    html += '<div><label style="font-size:10px;font-weight:600;color:#475569">Số ' + unitLabel + '</label><input id="_qlxFabCallAmount" type="number" min="0" step="0.1" value="0" ' + oninput + ' style="display:block;width:80px;padding:6px;border:1.5px solid #e2e8f0;border-radius:6px;font-size:12px;text-align:center;margin-top:2px"></div>';
    html += '<div style="flex:1;min-width:150px"><label style="font-size:10px;font-weight:600;color:#475569">Ghi chú</label><input id="_qlxFabCallNote" placeholder="..." ' + oninput + ' style="display:block;width:100%;padding:6px;border:1.5px solid #e2e8f0;border-radius:6px;font-size:12px;margin-top:2px"></div>';
    html += '</div>';
    html += '<div style="margin-bottom:8px"><label style="font-size:10px;font-weight:600;color:#475569">Ngày gọi</label><input id="_qlxFabCallDate" type="date" value="' + new Date(new Date().getTime() + 7*3600000).toISOString().slice(0,10) + '" readonly style="display:block;padding:6px;border:1.5px solid #e2e8f0;border-radius:6px;font-size:12px;margin-top:2px;background:#f1f5f9;color:#475569;cursor:not-allowed"></div>';
    html += '<div id="_qlxFabCallPreview" style="margin-bottom:8px"></div>';
    html += '<button onclick="_qlxFabCallSubmit(\'' + mat + '\',\'' + col + '\',\'' + unit + '\',' + orderId + ',' + itemId + ',' + pairIndex + ')" style="padding:8px 16px;background:linear-gradient(135deg,#059669,#10b981);color:#fff;border:none;border-radius:8px;font-weight:700;font-size:12px;cursor:pointer;width:100%">💾 Xác Nhận Gọi Vải</button>';
    html += '<div id="_qlxFabCallResult" style="margin-top:8px"></div>';
    html += '</div></div>';
    return html;
}



function _qlxFabPreview(mat, color, unit) {
    var trees = parseInt(document.getElementById('_qlxFabCallTrees').value) || 0;
    var amount = parseFloat(document.getElementById('_qlxFabCallAmount').value) || 0;
    var note = (document.getElementById('_qlxFabCallNote') ? document.getElementById('_qlxFabCallNote').value : '').trim();
    var el = document.getElementById('_qlxFabCallPreview');
    if (!el) return;
    if (!trees && !amount) { el.innerHTML = ''; return; }
    var unitLabel = unit === 'kg' ? 'kg' : unit === 'met' ? 'mét' : 'cái';
    var parts = [mat + ' - ' + color];
    if (trees > 0) parts.push(trees + ' cây');
    if (amount > 0) parts.push(amount + unitLabel);
    if (note) parts.push(note);
    var content = parts.join(' - ');
    el.innerHTML = '<div style="background:#eff6ff;border:1.5px solid #93c5fd;border-radius:8px;padding:10px;display:flex;align-items:center;gap:8px">'
        + '<span style="flex:1;font-weight:700;font-size:13px;color:#1e40af" id="_qlxFabPreviewText">' + content + '</span>'
        + '<button onclick="navigator.clipboard.writeText(document.getElementById(\'_qlxFabPreviewText\').textContent);showToast(\'📋 Đã copy!\')" style="padding:6px 14px;background:linear-gradient(135deg,#0369a1,#0284c7);color:#fff;border:none;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap">📋 Copy</button>'
        + '</div>';
}

async function _qlxFabCallSubmit(mat, color, unit, orderId, itemId, pairIndex) {
    if (window._qlxFabBusy) return;
    window._qlxFabBusy = true;
    var trees = parseInt(document.getElementById('_qlxFabCallTrees').value) || 0;
    var amount = parseFloat(document.getElementById('_qlxFabCallAmount').value) || 0;
    if (!trees && !amount) { showToast('Nhập số cây hoặc số lượng', 'error'); window._qlxFabBusy = false; return; }
    var unitLabel = unit === 'kg' ? 'kg' : unit === 'met' ? 'mét' : 'cái';
    var note = document.getElementById('_qlxFabCallNote') ? document.getElementById('_qlxFabCallNote').value : '';
    var callDate = document.getElementById('_qlxFabCallDate') ? document.getElementById('_qlxFabCallDate').value : '';
    var parts = [mat + ' - ' + color];
    if (trees > 0) parts.push(trees + ' cây');
    if (amount > 0) parts.push(amount + unitLabel);
    if (note) parts.push(note);
    var content = parts.join(' - ');

    try {
        var res = await apiCall('/api/qlx/fabric-reserve', 'POST', {
            dht_order_id: orderId, item_id: itemId, phoi_index: pairIndex,
            material_name: mat, color_name: color, unit: unit,
            reservation_type: 'new_call', call_trees: trees, call_amount: amount,
            call_note: note, call_date: callDate || null, call_content: content
        });
        if (res && res.error) {
            showToast('⚠️ ' + res.error, 'error');
            return;
        }
        // Show copy content
        var el = document.getElementById('_qlxFabCallResult');
        if (el) {
            el.innerHTML = '<div style="background:#dcfce7;border:1.5px solid #22c55e;border-radius:8px;padding:10px;display:flex;align-items:center;gap:8px">'
                + '<span style="flex:1;font-weight:700;font-size:12px;color:#059669">✅ Đã lưu: ' + content + '</span>'
                + '<button onclick="navigator.clipboard.writeText(\'' + content.replace(/'/g, "\\'") + '\');showToast(\'📋 Đã copy!\')" style="padding:6px 14px;background:linear-gradient(135deg,#0369a1,#0284c7);color:#fff;border:none;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer">📋 Copy</button>'
                + '</div>';
        }
        showToast('✅ Đã xác nhận gọi vải!');
        // Refresh popup after short delay
        setTimeout(function() { _qlxFabricPopup(orderId, itemId, pairIndex); }, 1500);
        _qlxLoadAll();
    } catch(e) { showToast('Lỗi: ' + e.message, 'error'); } finally { window._qlxFabBusy = false; }
}

function _qlxFabCopyContent() {
    var el = document.getElementById('_qlxFabCallContent');
    if (el) { navigator.clipboard.writeText(el.textContent); showToast('📋 Đã copy!'); }
}

async function _qlxFabArrived(resId, orderId, itemId, pairIndex) {
    if (!confirm('Xác nhận VẢI ĐÃ VỀ cho mục này?')) return;
    try {
        var res = await apiCall('/api/qlx/fabric-reserve/' + resId + '/arrive', 'PUT');
        if (res && res.error) {
            showToast('⚠️ ' + res.error, 'error');
            return;
        }
        showToast('✅ Đã xác nhận vải về!');
        _qlxFabricPopup(orderId, itemId, pairIndex);
        _qlxLoadAll();
    } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
}


async function _qlxFabReserveRoll(orderId, itemId, pairIndex, rollId, rollCode, idx, mat, color, unit) {
    if (window._qlxFabBusy) return;
    window._qlxFabBusy = true;
    var inp = document.getElementById('_qlxFabKg_' + idx);
    var kg = inp ? parseFloat(inp.value) : 0;
    if (!kg || kg <= 0) {
        if(inp){inp.style.border='2px solid #dc2626';inp.style.background='#fef2f2';inp.focus();inp.style.animation='none';inp.offsetHeight;inp.style.animation='shake .4s';setTimeout(function(){inp.style.animation='';},400);}
        showToast('⚠️ Bắt buộc nhập số ' + (unit==='kg'?'kg':unit==='met'?'mét':'cái') + ' sử dụng!', 'error');
        window._qlxFabBusy = false;
        return;
    }
    var maxKg = inp ? parseFloat(inp.max) : 0;
    if (maxKg > 0 && kg > maxKg) {
        inp.style.border='2px solid #dc2626';inp.style.background='#fef2f2';inp.focus();
        showToast('⚠️ Không được vượt quá ' + maxKg + (unit||'kg') + ' còn lại!', 'error');
        window._qlxFabBusy = false;
        return;
    }
    try {
        var res = await apiCall('/api/qlx/fabric-reserve', 'POST', {
            dht_order_id: orderId, item_id: itemId, phoi_index: pairIndex,
            material_name: mat, color_name: color, unit: unit,
            reservation_type: 'from_stock', roll_id: rollId, roll_code: rollCode, kg_reserved: kg
        });
        if (res && res.error) {
            showToast('⚠️ ' + res.error, 'error');
            return;
        }
        showToast('✅ Đã đánh dấu cây ' + rollCode);
        _qlxFabricPopup(orderId, itemId, pairIndex);
        _qlxLoadAll();
    } catch(e) { showToast(e.message, 'error'); } finally { window._qlxFabBusy = false; }
}

async function _qlxFabRelease(resId, orderId, itemId, pairIndex) {
    if (!confirm('Giải phóng đánh dấu này?')) return;
    try {
        var res = await apiCall('/api/qlx/fabric-reserve/' + resId, 'DELETE');
        if (res && res.error) {
            showToast('⚠️ ' + res.error, 'error');
            return;
        }
        showToast('🔓 Đã giải phóng');
        _qlxFabricPopup(orderId, itemId, pairIndex);
        _qlxLoadAll();
    } catch(e) { showToast(e.message, 'error'); }
}

function _qlxFabEditKgToggle(resId, currentKg, unitLabel, orderId, itemId, pairIndex, maxKg) {
    var valEl = document.getElementById('_qlxResKg_' + resId + '_val');
    if (!valEl) return;
    var mxVal = maxKg || 9999;
    var saveId = '_qlxResKgSave_' + resId;
    var errId = '_qlxResKgErr_' + resId;
    valEl.innerHTML = '<input id="_qlxResKgInput_' + resId + '" type="number" step="0.1" min="0.1" max="' + mxVal + '" value="' + currentKg + '" oninput="_qlxFabEditKgCheck(' + resId + ',' + mxVal + ')" style="width:60px;padding:2px 4px;border:1.5px solid #3b82f6;border-radius:4px;font-size:10px;text-align:center;font-weight:700">'
        + '<span style="font-size:9px;color:#64748b;margin:0 2px">' + unitLabel + '</span>'
        + '<button id="' + saveId + '" onclick="_qlxFabSaveKg(' + resId + ',' + orderId + ',' + itemId + ',' + pairIndex + ')" style="padding:1px 6px;background:#3b82f6;color:#fff;border:none;border-radius:4px;font-size:9px;font-weight:700;cursor:pointer">💾</button>'
        + '<button onclick="_qlxFabricPopup(' + orderId + ',' + itemId + ',' + pairIndex + ')" style="padding:1px 6px;background:#f1f5f9;border:1px solid #cbd5e1;border-radius:4px;font-size:9px;cursor:pointer;margin-left:2px">✕</button>'
        + '<span id="' + errId + '" style="font-size:8px;color:#dc2626;font-weight:700;display:none;margin-left:4px"></span>';
    var inp = document.getElementById('_qlxResKgInput_' + resId);
    if (inp) { inp.focus(); inp.select(); }
}

function _qlxFabEditKgCheck(resId, maxKg) {
    var inp = document.getElementById('_qlxResKgInput_' + resId);
    var saveBtn = document.getElementById('_qlxResKgSave_' + resId);
    var errEl = document.getElementById('_qlxResKgErr_' + resId);
    if (!inp || !saveBtn) return;
    var v = parseFloat(inp.value);
    if (v > maxKg || !v || v <= 0) {
        inp.style.border = '2px solid #dc2626';
        inp.style.background = '#fef2f2';
        saveBtn.style.background = '#9ca3af';
        saveBtn.style.cursor = 'not-allowed';
        saveBtn.disabled = true;
        if (errEl) { errEl.textContent = v > maxKg ? '⚠️ Tối đa ' + maxKg + '!' : ''; errEl.style.display = v > maxKg ? 'inline' : 'none'; }
    } else {
        inp.style.border = '1.5px solid #3b82f6';
        inp.style.background = '#fff';
        saveBtn.style.background = '#3b82f6';
        saveBtn.style.cursor = 'pointer';
        saveBtn.disabled = false;
        if (errEl) { errEl.style.display = 'none'; }
    }
}

async function _qlxFabSaveKg(resId, orderId, itemId, pairIndex) {
    var inp = document.getElementById('_qlxResKgInput_' + resId);
    if (!inp) return;
    var newKg = parseFloat(inp.value);
    if (!newKg || newKg <= 0) { inp.style.border = '2px solid #dc2626'; showToast('⚠️ Số kg phải > 0', 'error'); return; }
    try {
        var res = await apiCall('/api/qlx/fabric-reserve/' + resId + '/update-kg', 'PUT', { kg_reserved: newKg });
        if (res && res.error) {
            showToast('⚠️ ' + res.error, 'error');
            return;
        }
        showToast('✅ Đã cập nhật kg!');
        _qlxFabricPopup(orderId, itemId, pairIndex);
    } catch(e) { showToast(e.message, 'error'); }
}

async function _qlxFabLink(callId, orderId, itemId, pairIndex) {
    if (!confirm('Liên kết đơn này vào cuộc gọi vải đang chờ?')) return;
    try {
        // Get phoi info from current popup data
        var ph = window._qlxFabPopupData || {};
        var res = await apiCall('/api/qlx/fabric-reserve', 'POST', {
            dht_order_id: orderId, item_id: itemId, phoi_index: pairIndex,
            material_name: ph.material_name || '', color_name: ph.color_name || '', unit: ph.unit || 'kg',
            reservation_type: 'linked_call', linked_call_id: callId
        });
        if (res && res.error) {
            showToast('⚠️ ' + res.error, 'error');
            return;
        }
        showToast('📎 Đã liên kết thành công!');
        _qlxFabricPopup(orderId, itemId, pairIndex);
        _qlxLoadAll();
    } catch(e) { showToast(e.message, 'error'); }
}

async function _qlxMaterial(orderId, action, itemId) {
    try {
        var res = await apiCall('/api/qlx/material/' + orderId, 'POST', { action: action, item_id: itemId });
        if (res && res.error) {
            showToast('⚠️ ' + res.error, 'error');
            return;
        }
        showToast('✅ Cập nhật vật liệu');
        await _qlxLoadAll();
    } catch(e) { showToast(e.message, 'error'); }
}

async function _qlxAssign(orderId, type, itemId) {
    var typeLabels = { cat: 'Cắt', in: 'In', ep: 'Ép', may: 'May' };

    // Special modal for 'in' type
    if (type === 'in') { return _qlxAssignIn(orderId, itemId); }
    // Special modal for 'may' type
    if (type === 'may') { return _qlxAssignMay(orderId, itemId); }

    var ord = _qlx.orders.find(function(o) { return o.id === orderId; });
    var checkRes;
    if (type === 'may') {
        try {
            // Check current assignment first: is someone already assigned?
            var isAlreadyAssigned = false;
            if (ord) {
                if (itemId) {
                    var it = ord.items.find(function(item) { return item.id === itemId; });
                    if (it && it.nguoi_may) isAlreadyAssigned = true;
                } else {
                    if (ord.nguoi_may) isAlreadyAssigned = true;
                }
            }

            // Call the real-time check API
            checkRes = await apiCall('/api/qlx/assign-check/' + orderId + '?type=may&item_id=' + (itemId || 0));
            if (!checkRes.isCutDone || !checkRes.isMatDone) {
                var msg = '';
                if (!checkRes.isCutDone && !checkRes.isMatDone) {
                    msg = 'Cắt đơn chưa xong và Gọi vật liệu chưa xong!';
                } else if (!checkRes.isCutDone) {
                    msg = 'Cắt đơn chưa xong!';
                } else {
                    msg = 'Gọi vật liệu chưa xong!';
                }

                if (!isAlreadyAssigned) {
                    // Show a beautiful warning popup using a clean modal
                    var warnBody = '<div style="text-align:center;padding:20px 10px">'
                        + '<div style="font-size:48px;margin-bottom:16px">⚠️</div>'
                        + '<h4 style="color:#dc2626;font-weight:800;margin-bottom:16px;font-size:16px">CHƯA ĐỦ ĐIỀU KIỆN PHÂN CÔNG MAY</h4>'
                        + '<div style="display:flex;flex-direction:column;gap:12px;max-width:320px;margin:0 auto;text-align:left">'
                        + '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px">'
                        + '<span>Cắt Đơn:</span>'
                        + (checkRes.isCutDone ? '<b style="color:#059669">🟢 Đã xong</b>' : '<b style="color:#dc2626">🔴 Chưa xong</b>')
                        + '</div>'
                        + '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px">'
                        + '<span>Gọi Vật Liệu:</span>'
                        + (checkRes.isMatDone ? '<b style="color:#059669">🟢 Đã xong</b>' : '<b style="color:#dc2626">🔴 Chưa xong</b>')
                        + '</div>'
                        + '</div>'
                        + '<p style="color:#64748b;font-size:11px;margin-top:16px;line-height:1.4">Vui lòng liên hệ bộ phận liên quan để hoàn thành trước khi phân công may.</p>'
                        + '</div>';
                    var warnFooter = '<button class="btn btn-secondary" onclick="closeModal()" style="width:100%">Đồng ý</button>';
                    openModal('Cảnh Báo Điều Phối', warnBody, warnFooter);
                    return;
                } else {
                    showToast('⚠️ Cảnh báo: ' + msg + ' (Chỉ được gỡ phân công, không thể đổi thợ)', 'warning');
                }
            }
        } catch(e) {
            console.error('Error checking assignment:', e);
        }
    }

    var deptHint = type === 'may' ? 'may' : type === 'cat' ? 'cắt' : type;
    var staff;
    try { var res = await apiCall('/api/qlx/staff?dept=' + encodeURIComponent(deptHint)); staff = res.staff || []; } catch(e) { staff = []; }
    if (!staff.length) { try { var res2 = await apiCall('/api/qlx/staff'); staff = res2.staff || []; } catch(e) {} }

    var opts = staff.map(function(s) { return '<option value="' + s.id + '">' + s.full_name + (s.dept_name ? ' (' + s.dept_name + ')' : '') + '</option>'; }).join('');

    var warningBanner = '';
    if (type === 'may' && checkRes && (!checkRes.isCutDone || !checkRes.isMatDone)) {
        warningBanner = '<div style="background:#fffbeb;border:1px solid #fef3c7;color:#b45309;padding:10px 14px;border-radius:8px;font-size:11px;margin-bottom:12px;line-height:1.4">'
            + '⚠️ <b>Cảnh báo:</b> Cắt đơn hoặc vật liệu chưa xong. Bạn chỉ có thể chọn <b>Gỡ phân công</b>. Nếu chọn nhân viên khác sẽ bị hệ thống từ chối.'
            + '</div>';
    }

    var body = warningBanner + '<div style="margin-bottom:12px"><label style="font-weight:700;font-size:12px">Chọn nhân viên ' + typeLabels[type] + '</label>'
        + '<select id="_qlxAssignUser" class="form-control" style="margin-top:6px"><option value="">-- Gỡ phân công --</option>' + opts + '</select></div>';

    var footer = '<button class="btn btn-secondary" onclick="closeModal()">Hủy</button>'
        + '<button class="btn" onclick="_qlxDoAssign(' + orderId + ',\'' + type + '\',' + (itemId || null) + ')" style="background:linear-gradient(135deg,#0369a1,#0284c7);color:#fff;border:none;padding:8px 20px;border-radius:8px;font-weight:700">💾 Phân Công</button>';

    var titleSuffix = '';
    if (ord) {
        titleSuffix = ord.order_code || ('Đơn #' + orderId);
        if (itemId) {
            var it = ord.items.find(function(item) { return item.id === itemId; });
            if (it && it.description) {
                titleSuffix += ' — ' + it.description;
            }
        }
    } else {
        titleSuffix = 'Đơn #' + orderId;
    }
    openModal('🏭 Phân Công ' + typeLabels[type] + ' — ' + titleSuffix, body, footer);
}

async function _qlxDoAssign(orderId, type, itemId) {
    var userId = document.getElementById('_qlxAssignUser') ? document.getElementById('_qlxAssignUser').value : null;
    try {
        await apiCall('/api/qlx/assign/' + orderId, 'POST', { type: type, user_id: userId || null, item_id: itemId || null });
        closeModal(); showToast('✅ Đã phân công'); await _qlxLoadAll();
    } catch(e) { showToast(e.message, 'error'); }
}

// ========== PRINT ASSIGNMENT MODAL (Phân Công In) ==========
async function _qlxAssignIn(orderId, itemId) {
    try {
        var data = await apiCall('/api/qlx/print-assignment/' + orderId + (itemId ? '?item_id=' + itemId : ''));
        var o = data.order;
        var fields = data.fields || [];
        var assignments = data.assignments || [];
        
        // Store in global/window context for saving
        window._qlxPAData = { orderId: orderId, itemId: itemId, fields: fields };

        var spLabel = o.order_code + (o.items_desc ? ' — ' + o.items_desc : '');

        var html = '<div style="padding:0">';
        // Header
        html += '<div style="background:linear-gradient(135deg,#0f172a,#1e3a5f,#0ea5e9);color:#fff;padding:20px 24px;border-radius:16px 16px 0 0">';
        html += '<h3 style="margin:0;font-size:16px;font-weight:800">🖨️ Phân Công Lĩnh Vực In</h3>';
        html += '<p style="margin:4px 0 0;font-size:11px;opacity:0.8">Đơn #' + o.order_code + ' — ' + (o.customer_name || '') + '</p></div>';

        html += '<div style="padding:20px 24px;max-height:50vh;overflow-y:auto">';
        // SẢN PHẨM
        html += '<div style="margin-bottom:16px"><label style="font-size:11px;font-weight:800;color:#475569;display:block;margin-bottom:6px">SẢN PHẨM</label>';
        html += '<input type="text" value="' + spLabel.replace(/"/g, '&quot;') + '" readonly style="width:100%;padding:10px 14px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:13px;font-weight:700;color:#1e293b;background:#f8fafc;cursor:not-allowed"></div>';

        // LĨNH VỰC IN
        html += '<div style="margin-bottom:16px"><label style="font-size:11px;font-weight:800;color:#475569;display:block;margin-bottom:6px">LĨNH VỰC IN & PHÂN CÔNG <span style="color:#dc2626">*</span></label>';
        
        if (fields.length === 0) {
            html += '<div style="text-align:center;padding:20px;border:1.5px dashed #cbd5e1;border-radius:10px;color:#64748b;font-size:12px">Chưa có Lĩnh Vực In nào được cấu hình trong Bộ Phận In.</div>';
        } else {
            html += '<div style="display:flex;flex-direction:column;gap:12px">';
            fields.forEach(function(f) {
                // Check if this field is currently assigned
                var isFieldAssigned = assignments.some(function(a) { return a.field_id === f.id; });
                var displayOpsStyle = isFieldAssigned ? 'display:block;' : 'display:none;';
                
                // Mapped operators
                var fieldStaff = f.staff || [];
                var fieldCons = f.contractors || [];
                
                html += '<div style="border:1.5px solid ' + (isFieldAssigned ? '#0ea5e9' : '#e2e8f0') + ';border-radius:12px;overflow:hidden;background:#fff;transition:border-color 0.15s" class="field-card-item" id="field_card_' + f.id + '">';
                
                // Card Header (Field check)
                html += '<label style="display:flex;align-items:center;gap:10px;padding:12px 16px;margin:0;cursor:pointer;background:#f8fafc;user-select:none">';
                html += '<input type="checkbox" class="field-checkbox" data-field-id="' + f.id + '" ' + (isFieldAssigned ? 'checked' : '') + ' onchange="_qlxToggleFieldOps(' + f.id + ')" style="width:18px;height:18px;accent-color:#0ea5e9;cursor:pointer">';
                html += '<span style="font-weight:700;font-size:13px;color:#1e293b">' + f.name + '</span>';
                html += '</label>';
                
                // Card Body (Operators list)
                html += '<div id="field_ops_' + f.id + '" style="border-top:1px solid #f1f5f9;padding:12px 16px;background:#fff;' + displayOpsStyle + '">';
                
                if (fieldStaff.length === 0 && fieldCons.length === 0) {
                    html += '<div style="color:#94a3b8;font-size:11px;text-align:center;padding:10px">Chưa gán nhân sự cho lĩnh vực này. Vui lòng cấu hình ở Bộ Phận In.</div>';
                } else {
                    html += '<div style="font-size:10px;font-weight:800;color:#64748b;margin-bottom:8px">CHỌN NGƯỜI THỰC HIỆN:</div>';
                    html += '<div style="display:flex;flex-direction:column;gap:6px;max-height:150px;overflow-y:auto;padding-right:4px">';
                    
                    // Staff checkboxes
                    fieldStaff.forEach(function(s) {
                        var isOpAssigned = assignments.some(function(a) { return a.field_id === f.id && a.operator_type === 'user' && a.operator_id === s.id; });
                        html += '<label style="display:flex;align-items:center;gap:8px;font-size:12px;cursor:pointer;padding:4px 8px;border-radius:6px;transition:background .15s" onmouseover="this.style.background=\'#f0f9ff\'" onmouseout="this.style.background=\'\'">';
                        html += '<input type="checkbox" class="operator-checkbox" data-field-id="' + f.id + '" data-type="user" data-id="' + s.id + '" ' + (isOpAssigned ? 'checked' : '') + ' onchange="_qlxToggleOperator(this, ' + f.id + ')" style="width:16px;height:16px;accent-color:#0ea5e9;cursor:pointer">';
                        html += '<span style="font-weight:600;color:#334155">👤 ' + s.name + '</span>';
                        html += '</label>';
                    });
                    
                    // Contractor checkboxes
                    fieldCons.forEach(function(c) {
                        var isOpAssigned = assignments.some(function(a) { return a.field_id === f.id && a.operator_type === 'contractor' && a.operator_id === c.id; });
                        html += '<label style="display:flex;align-items:center;gap:8px;font-size:12px;cursor:pointer;padding:4px 8px;border-radius:6px;transition:background .15s" onmouseover="this.style.background=\'#faf5ff\'" onmouseout="this.style.background=\'\'">';
                        html += '<input type="checkbox" class="operator-checkbox" data-field-id="' + f.id + '" data-type="contractor" data-id="' + c.id + '" ' + (isOpAssigned ? 'checked' : '') + ' onchange="_qlxToggleOperator(this, ' + f.id + ')" style="width:16px;height:16px;accent-color:#7c3aed;cursor:pointer">';
                        html += '<span style="font-weight:600;color:#334155">🏭 ' + c.name + '</span>';
                        html += '</label>';
                    });
                    
                    html += '</div>';
                }
                
                html += '</div>'; // close Card Body
                html += '</div>'; // close Card Item
            });
            html += '</div>';
        }
        
        html += '</div>'; // close Lĩnh Vực In container
        html += '</div>'; // close main padding container

        // Footer
        html += '<div style="padding:16px 24px;border-top:1px solid #e2e8f0;display:flex;justify-content:flex-end;gap:10px;background:#f8fafc;border-radius:0 0 16px 16px">';
        html += '<button onclick="document.getElementById(\'_qlxPAOverlay\').remove()" style="padding:10px 24px;background:#fff;border:1.5px solid #e2e8f0;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;color:#475569;transition:all 0.15s" onmouseover="this.style.background=\'#f1f5f9\'" onmouseout="this.style.background=\'#fff\'">Hủy bỏ</button>';
        html += '<button onclick="_qlxPASave()" style="padding:10px 24px;background:linear-gradient(135deg,#0f172a,#1e3a5f);color:#fff;border:none;border-radius:10px;font-size:12px;font-weight:800;cursor:pointer;box-shadow:0 4px 10px rgba(15,23,42,0.15)">💾 Lưu Phân Công</button>';
        html += '</div></div>';

        var old = document.getElementById('_qlxPAOverlay'); if (old) old.remove();
        var ov = document.createElement('div');
        ov.className = 'qlx-cl-overlay'; ov.id = '_qlxPAOverlay';
        ov.onclick = function(e) { if (e.target === ov) ov.remove(); };
        ov.innerHTML = '<div class="qlx-cl-popup" style="width:500px;max-height:85vh">' + html + '</div>';
        document.body.appendChild(ov);
    } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
}

function _qlxToggleFieldOps(fieldId) {
    var cb = document.querySelector('.field-checkbox[data-field-id="' + fieldId + '"]');
    var opsDiv = document.getElementById('field_ops_' + fieldId);
    var card = document.getElementById('field_card_' + fieldId);
    
    if (cb && cb.checked) {
        if (opsDiv) {
            opsDiv.style.display = 'block';
            opsDiv.style.animation = 'qlxSlideDown 0.2s ease';
        }
        if (card) card.style.borderColor = '#0ea5e9';
    } else {
        if (opsDiv) opsDiv.style.display = 'none';
        if (card) card.style.borderColor = '#e2e8f0';
        
        // Also uncheck all operators inside this field
        var opCbs = document.querySelectorAll('.operator-checkbox[data-field-id="' + fieldId + '"]');
        opCbs.forEach(function(opCb) { opCb.checked = false; });
    }
}

function _qlxToggleOperator(el, fieldId) {
    if (el.checked) {
        var opCbs = document.querySelectorAll('.operator-checkbox[data-field-id="' + fieldId + '"]');
        opCbs.forEach(function(opCb) {
            if (opCb !== el) {
                opCb.checked = false;
            }
        });
    }
}

async function _qlxPASave() {
    if (window._qlxPABusy) return;
    
    // Collect all assignments
    var assignments = [];
    var fieldCards = document.querySelectorAll('.field-card-item');
    var validationError = null;
    
    fieldCards.forEach(function(card) {
        var fieldCb = card.querySelector('.field-checkbox');
        if (fieldCb && fieldCb.checked) {
            var fieldId = Number(fieldCb.getAttribute('data-field-id'));
            var opCbs = card.querySelectorAll('.operator-checkbox:checked');
            
            if (opCbs.length === 0) {
                var fieldName = card.querySelector('span').textContent || 'Lĩnh vực';
                validationError = 'Vui lòng chọn ít nhất một người thực hiện cho lĩnh vực: ' + fieldName;
            } else if (opCbs.length > 1) {
                var fieldName = card.querySelector('span').textContent || 'Lĩnh vực';
                validationError = 'Mỗi lĩnh vực in chỉ được chọn tối đa 1 người thực hiện! Lĩnh vực đang chọn nhiều hơn 1: ' + fieldName;
            }
            
            opCbs.forEach(function(opCb) {
                assignments.push({
                    field_id: fieldId,
                    operator_type: opCb.getAttribute('data-type'),
                    operator_id: Number(opCb.getAttribute('data-id'))
                });
            });
        }
    });
    
    if (assignments.length === 0) {
        return showToast('Bắt buộc chọn ít nhất một Lĩnh Vực In và người thực hiện!', 'error');
    }
    
    if (validationError) {
        return showToast(validationError, 'error');
    }
    
    window._qlxPABusy = true;
    try {
        var d = window._qlxPAData;
        await apiCall('/api/qlx/print-assignment/' + d.orderId, 'POST', { assignments: assignments, item_id: d.itemId });
        
        var ov = document.getElementById('_qlxPAOverlay'); if (ov) ov.remove();
        showToast('✅ Đã lưu Phân Công In');
        await _qlxLoadAll();
    } catch(e) { showToast(e.message || 'Lỗi', 'error'); } finally { window._qlxPABusy = false; }
}

async function _qlxReceivePhieu(orderId) {
    if (!confirm('Xác nhận QLX đã nhận Phiếu Sản Xuất cho đơn này?')) return;
    try {
        await apiCall('/api/qlx/receive-phieu/' + orderId, 'POST');
        showToast('✅ Đã xác nhận nhận Phiếu SX');
        await _qlxLoadAll();
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
            if (currentUser && currentUser.role === 'giam_doc') {
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
        html += '<div style="padding:16px 20px;border-top:1px solid #e2e8f0;text-align:right"><button onclick="document.getElementById(\'_qlxSetupOverlay\').remove()" style="padding:8px 20px;background:#f1f5f9;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;color:#475569">Đóng</button></div>';
        html += '</div>';
        var old = document.getElementById('_qlxSetupOverlay'); if (old) old.remove();
        var ov = document.createElement('div');
        ov.className = 'qlx-cl-overlay'; ov.id = '_qlxSetupOverlay';
        ov.onclick = function(e) { if (e.target === ov) ov.remove(); };
        ov.innerHTML = '<div class="qlx-cl-popup" style="width:700px"><div class="qlx-cl-header"><h3>⚙️ Setup Checklist Chuẩn Bị QLX</h3><p>Quản lý câu hỏi & ghi chú kiểm tra</p></div>' + html + '</div>';
        document.body.appendChild(ov);
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

// ========== SPLIT SEWING ASSIGNMENT MODAL (Phân Công May Bàn Giao) ==========
async function _qlxAssignMay(orderId, itemId) {
    if (!itemId) {
        showToast('Vui lòng phân công may theo từng phiếu sản phẩm cụ thể!', 'error');
        return;
    }

    try {
        // 1. First, check preconditions
        var checkRes = await apiCall('/api/qlx/assign-check/' + orderId + '?type=may&item_id=' + itemId);
        if (!checkRes.isCutDone || !checkRes.isMatDone) {
            // Check if there is already an assignment to let them de-assign
            var ord = _qlx.orders.find(function(o) { return o.id === orderId; });
            var isAlreadyAssigned = false;
            if (ord) {
                var it = ord.items.find(function(item) { return item.id === itemId; });
                if (it && it.nguoi_may) isAlreadyAssigned = true;
            }

            if (!isAlreadyAssigned) {
                var warnBody = '<div style="text-align:center;padding:20px 10px">'
                    + '<div style="font-size:48px;margin-bottom:16px">⚠️</div>'
                    + '<h4 style="color:#dc2626;font-weight:800;margin-bottom:16px;font-size:16px">CHƯA ĐỦ ĐIỀU KIỆN PHÂN CÔNG MAY</h4>'
                    + '<div style="display:flex;flex-direction:column;gap:12px;max-width:320px;margin:0 auto;text-align:left">'
                    + '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px">'
                    + '<span>Cắt Đơn:</span>'
                    + (checkRes.isCutDone ? '<b style="color:#059669">🟢 Đã xong</b>' : '<b style="color:#dc2626">🔴 Chưa xong</b>')
                    + '</div>'
                    + '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px">'
                    + '<span>Gọi Vật Liệu:</span>'
                    + (checkRes.isMatDone ? '<b style="color:#059669">🟢 Đã xong</b>' : '<b style="color:#dc2626">🔴 Chưa xong</b>')
                    + '</div>'
                    + '</div>'
                    + '<p style="color:#64748b;font-size:11px;margin-top:16px;line-height:1.4">Vui lòng hoàn thành các công đoạn trước để có số lượng cắt xong trước khi phân công may.</p>'
                    + '</div>';
                var warnFooter = '<button class="btn btn-secondary" onclick="closeModal()" style="width:100%;color:#fff;background-color:#1e3a8a;border:none">Đồng ý</button>';
                openModal('Cảnh Báo Điều Phối', warnBody, warnFooter);
                return;
            } else {
                showToast('⚠️ Cắt hoặc vật liệu chưa xong. Bạn chỉ có thể gỡ phân công cũ (lưu danh sách trống)', 'warning');
            }
        }

        // 2. Fetch current assignment and configuration data
        var res = await apiCall('/api/qlx/sewing-assignment/' + itemId);
        
        // Store config and state globally/window
        window._qlxMayData = {
            orderId: orderId,
            itemId: itemId,
            cut_qty: res.cut_qty,
            item: res.item,
            contractors: res.contractors,
            pricing: res.pricing
        };

        // Render modal
        var html = '<div style="padding:0; background-color:#ffffff; color:#1e293b">';
        // Header
        var priorityText = res.item.shipping_priority || 'CHUẨN';
        var priorityBadge = '';
        if (priorityText === 'GẤP') {
            priorityBadge = '<span style="background:#7f1d1d;color:#fca5a5;padding:2px 8px;border-radius:6px;font-weight:800;font-size:10px;margin-left:4px;border:1px solid #991b1b">🔥 GẤP</span>';
        } else if (priorityText === 'GỬI') {
            priorityBadge = '<span style="background:#7c2d12;color:#fed7aa;padding:2px 8px;border-radius:6px;font-weight:800;font-size:10px;margin-left:4px;border:1px solid #9a3412">📦 GỬI</span>';
        } else {
            priorityBadge = '<span style="background:#064e3b;color:#a7f3d0;padding:2px 8px;border-radius:6px;font-weight:800;font-size:10px;margin-left:4px;border:1px solid #065f46">🟢 CHUẨN</span>';
        }
        var deliveryDateStr = res.item.expected_ship_date ? _qlxFmtDate(res.item.expected_ship_date) : 'Chưa thiết lập';
        var timeText = res.item.standard_delivery_time ? ' lúc ' + res.item.standard_delivery_time : '';
        var fullDeliveryDateStr = deliveryDateStr + timeText;

        html += '<div style="background:linear-gradient(135deg,#1e1b4b,#311042);color:#ffffff;padding:20px 24px;border-radius:16px 16px 0 0;border-bottom:1px solid #311042">';
        html += '<h3 style="margin:0;font-size:16px;font-weight:800;color:#ffffff;margin-bottom:6px">🪡 Phân Công May & Bàn Giao</h3>';
        html += '<p style="margin:0;font-size:11px;color:#94a3b8;display:flex;align-items:center;gap:10px;flex-wrap:wrap">'
            + '<span>Mã đơn: <b style="color:#f8fafc">' + res.item.order_code + '</b></span>'
            + '<span>— Rập: <b style="color:#f8fafc">' + (res.item.pattern_name || 'N/A') + '</b></span>'
            + '</p></div>';



        html += '<div style="padding:20px 24px">';

        
        // Product Info
        var prodLabel = (res.item.product_name || res.item.description || 'N/A');
        html += '<div style="margin-bottom:16px; display:grid; grid-template-columns: 2fr 1fr; gap:12px">';
        html += '<div><label style="font-size:11px;font-weight:800;color:#475569;display:block;margin-bottom:4px">MẶT HÀNG</label>';
        html += '<input type="text" value="' + prodLabel.replace(/"/g, '&quot;') + '" readonly style="width:100%;padding:8px 12px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:12px;font-weight:700;color:#1e293b;background:#f8fafc;cursor:not-allowed"></div>';
        
        html += '<div><label style="font-size:11px;font-weight:800;color:#475569;display:block;margin-bottom:4px">SL CẮT XONG</label>';
        html += '<input type="text" value="' + res.cut_qty + ' cái" readonly style="width:100%;padding:8px 12px;border:1.5px solid #bbf7d0;border-radius:8px;font-size:12px;font-weight:700;color:#15803d;background:#f0fdf4;text-align:center;cursor:not-allowed"></div>';
        html += '</div>';

        // Pricing Info Banner
        var factoryPriceText = res.pricing.factory_price > 0 ? (res.pricing.factory_price.toLocaleString('vi-VN') + 'đ') : '🔴 Chưa thiết lập';
        var processingPriceText = res.pricing.processing_price > 0 ? (res.pricing.processing_price.toLocaleString('vi-VN') + 'đ') : '🔴 Chưa thiết lập';
        
        html += '<div style="background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:10px;padding:10px 14px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;font-size:12px;color:#475569">';
        html += '<span>💵 Đơn giá May nhà: <b style="color:#0f172a">' + factoryPriceText + '</b></span>';
        html += '<span>💵 Đơn giá Gia công: <b style="color:#0f172a">' + processingPriceText + '</b></span>';
        html += '</div>';

        // High priority Info banner card - styled professionally in light mode
        var bannerBg = '#f8fafc';
        var bannerBorder = '#e2e8f0';
        var statusIndicator = '';
        var bannerTextColor = '#0f172a';
        if (priorityText === 'GẤP') {
            bannerBg = '#fef2f2';
            bannerBorder = '#fecaca';
            bannerTextColor = '#991b1b';
            statusIndicator = '<span style="color:#ef4444">🔥 GẤP</span>';
        } else if (priorityText === 'GỬI') {
            bannerBg = '#fff7ed';
            bannerBorder = '#fed7aa';
            bannerTextColor = '#9a3412';
            statusIndicator = '<span style="color:#f97316">📦 GỬI</span>';
        } else {
            bannerBg = '#f0fdf4';
            bannerBorder = '#bbf7d0';
            bannerTextColor = '#166534';
            statusIndicator = '<span style="color:#10b981">🟢 CHUẨN</span>';
        }

        // Calculate Tiến Độ
        var progressHTML = '<span style="color:#64748b">—</span>';
        if (res.item.expected_ship_date) {
            var todayVN = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
            todayVN.setHours(0,0,0,0);
            
            var shipExpected = new Date(res.item.expected_ship_date);
            shipExpected.setHours(0,0,0,0);
            
            var diffDays = Math.round((todayVN.getTime() - shipExpected.getTime()) / 86400000);
            
            if (res.item.shipped_at || res.item.shipping_status === 'shipped') {
                var shipActual = res.item.shipped_at ? new Date(new Date(res.item.shipped_at).toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' })) : todayVN;
                shipActual.setHours(0,0,0,0);
                var shipDiff = Math.round((shipExpected.getTime() - shipActual.getTime()) / 86400000);
                if (shipDiff > 0) {
                    progressHTML = '<span style="color:#059669;font-weight:800">⚡ Nhanh ' + shipDiff + ' ngày</span>';
                } else if (shipDiff === 0) {
                    progressHTML = '<span style="color:#059669;font-weight:800">✅ Đúng hạn</span>';
                } else {
                    progressHTML = '<span style="color:#dc2626;font-weight:800">⚠️ Trễ ' + Math.abs(shipDiff) + ' ngày</span>';
                }
            } else {
                if (diffDays < 0) {
                    progressHTML = '<span style="color:#2563eb;font-weight:800">⏳ Còn ' + Math.abs(diffDays) + ' ngày</span>';
                } else if (diffDays === 0) {
                    progressHTML = '<span style="color:#f59e0b;font-weight:800">📦 Hôm nay!</span>';
                } else {
                    progressHTML = '<span style="color:#dc2626;font-weight:800;animation:qlxBlink 1s infinite">🔥 Quá hạn ' + diffDays + ' ngày</span>';
                }
            }
        }

        html += '<div style="background:' + bannerBg + ';border:1.5px solid ' + bannerBorder + ';border-radius:12px;padding:14px 18px;margin-bottom:20px;display:grid;grid-template-columns:1.2fr 1fr 1fr;gap:12px;align-items:center;color:' + bannerTextColor + ';font-size:12px;box-shadow:0 2px 4px rgba(0,0,0,0.02)">';
        
        // Hạn Trả Hàng
        html += '<div style="display:flex;align-items:center;gap:10px"><span style="font-size:20px">📅</span>';
        html += '<div><div style="font-size:9px;font-weight:800;opacity:0.8;text-transform:uppercase;letter-spacing:0.5px">Hạn Trả Hàng</div>';
        html += '<div style="font-size:14px;font-weight:800">' + fullDeliveryDateStr + '</div></div></div>';
        
        // Tiến Độ
        html += '<div style="text-align:center"><div style="font-size:9px;font-weight:800;opacity:0.8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px">Tiến Độ</div>';
        html += '<div style="font-size:13px">' + progressHTML + '</div></div>';
        
        // Tiêu Chuẩn Đơn
        html += '<div style="text-align:right"><div style="font-size:9px;font-weight:800;opacity:0.8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px">Tiêu Chuẩn Đơn</div>';
        html += '<div style="font-weight:800;font-size:13px">' + statusIndicator + '</div></div>';
        
        html += '</div>';


        // Assignment summary & validation
        html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding:0 4px">';
        html += '<label style="font-size:11px;font-weight:800;color:#475569;margin:0">PHÂN BỔ CHI TIẾT</label>';
        html += '<div style="display:flex;align-items:center;gap:8px">';
        html += '<span style="font-size:12px;font-weight:600;color:#64748b">Tổng đã chia: <b id="may_assign_total_qty" style="color:#0f172a">0</b> / ' + res.cut_qty + '</span>';
        html += '<span id="may_assign_status_badge" style="font-size:10px;font-weight:800;padding:2px 8px;border-radius:6px">Chưa khớp</span>';
        html += '</div></div>';

        // Assignment Table/List
        html += '<div style="max-height:30vh;overflow-y:auto;border:1.5px solid #e2e8f0;border-radius:10px;padding:12px;background:#f8fafc;margin-bottom:12px">';
        html += '<div id="may_assignment_rows" style="display:flex;flex-direction:column;gap:10px"></div>';
        html += '</div>';

        // Add button
        html += '<div style="text-align:right;margin-bottom:16px">';
        html += '<button class="btn btn-secondary" onclick="_qlxAssignMayAddRow()" style="padding:6px 14px;font-size:11px;font-weight:700;border-radius:8px;color:#ffffff;background-color:#1e3a8a;border:none">➕ Thêm bên nhận may</button>';
        html += '</div>';

        html += '</div>'; // padding-24

        // Footer
        html += '<div style="padding:16px 24px;border-top:1px solid #e2e8f0;display:flex;justify-content:flex-end;gap:12px;background:#f8fafc;border-radius:0 0 16px 16px">';
        html += '<button class="btn btn-secondary" onclick="closeModal()" style="color:#ffffff;background-color:#1e3a8a;border:none;padding:8px 24px;border-radius:8px;font-weight:700">Hủy</button>';
        html += '<button id="may_assign_save_btn" class="btn" onclick="_qlxAssignMaySave()" style="background:linear-gradient(135deg,#701a75,#4a044e);color:#fff;border:none;padding:8px 24px;border-radius:8px;font-weight:700">💾 Lưu Phân Công</button>';


        html += '</div>';

        html += '</div>';

        openModal('Phân Công May', html);

        // Populate existing assignments or add one default row
        if (window._qlxMayPendingRows && window._qlxMayPendingRows.length > 0) {
            // Restore from pending (reopened modal after price warn)
            window._qlxMayPendingRows.forEach(function(row) {
                _qlxAssignMayAddRow(row.contractor_id, row.quantity, row.expected_date, row.notes);
            });
            window._qlxMayPendingRows = null;
        } else if (res.assignments && res.assignments.length > 0) {
            res.assignments.forEach(function(a) {
                var formattedDate = a.expected_date ? a.expected_date.split('T')[0] : '';
                _qlxAssignMayAddRow(a.contractor_id, a.quantity, formattedDate, a.notes);
            });
        } else {
            // Default 1 row with full cut quantity and default target May Nhà
            _qlxAssignMayAddRow('', res.cut_qty, '', '');
        }

    } catch(e) {
        showToast('Lỗi: ' + e.message, 'error');
    }
}

function _qlxAssignMayAddRow(contractorId, quantity, expectedDate, notes) {
    var cId = contractorId !== undefined ? contractorId : '';
    var qty = quantity !== undefined ? quantity : '';
    var date = expectedDate !== undefined ? expectedDate : '';
    var noteText = notes !== undefined ? notes : '';

    var tzToday = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
    var yyyy = tzToday.getFullYear();
    var mm = String(tzToday.getMonth() + 1).padStart(2, '0');
    var dd = String(tzToday.getDate()).padStart(2, '0');
    var minDateStr = yyyy + '-' + mm + '-' + dd;

    var contractors = window._qlxMayData.contractors || [];
    var contractorOpts = contractors.map(function(c) {
        var selected = String(c.id) === String(cId) ? 'selected' : '';
        return '<option value="' + c.id + '" ' + selected + '>🏭 Gia công: ' + c.name + '</option>';
    }).join('');

    var rowId = 'may_row_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);

    var html = '<div id="' + rowId + '" class="may-assign-row" style="display:grid;grid-template-columns:1.8fr 1fr 1fr 1.5fr auto;gap:8px;align-items:center;background:#ffffff;padding:8px 10px;border:1px solid #e2e8f0;border-radius:8px">';
    
    // Target dropdown (May Nhà / Gia Công)
    html += '<div><select class="form-control may-target" style="padding:6px;font-size:11px;font-weight:600;height:auto;background:#ffffff;color:#1e293b;border:1.5px solid #cbd5e1" onchange="_qlxAssignMayUpdateTotal()">';
    html += '<option value="" ' + (cId === '' ? 'selected' : '') + '>🏠 May Nhà (Trong xưởng)</option>';
    html += '<optgroup label="Bên Nhận Gia Công ngoài">' + contractorOpts + '</optgroup>';
    html += '</select></div>';

    // Quantity input
    html += '<div><input type="number" class="form-control may-qty" value="' + qty + '" min="1" placeholder="SL" style="padding:6px;font-size:11px;font-weight:700;text-align:center;height:auto;background:#ffffff;color:#1e293b;border:1.5px solid #cbd5e1" oninput="_qlxAssignMayUpdateTotal()"></div>';

    // Target completion Date
    html += '<div><input type="date" class="form-control may-date" value="' + date + '" min="' + minDateStr + '" style="padding:6px;font-size:11px;height:auto;background:#ffffff;color:#1e293b;border:1.5px solid #cbd5e1"></div>';

    // Notes
    html += '<div><input type="text" class="form-control may-notes" value="' + noteText.replace(/"/g, '&quot;') + '" placeholder="Ghi chú hạn/phối..." style="padding:6px;font-size:11px;height:auto;background:#ffffff;color:#1e293b;border:1.5px solid #cbd5e1"></div>';

    // Delete button
    html += '<div><button class="btn btn-danger" onclick="_qlxAssignMayRemoveRow(this)" style="padding:4px 8px;font-size:11px;border-radius:6px;background:#fef2f2;color:#ef4444;border:1px solid #fca5a5">🗑️</button></div>';


    var container = document.getElementById('may_assignment_rows');
    if (container) {
        var temp = document.createElement('div');
        temp.innerHTML = html;
        container.appendChild(temp.firstElementChild);
        _qlxAssignMayUpdateTotal();
    }
}

function _qlxAssignMayRemoveRow(btn) {
    var row = btn.closest('.may-assign-row');
    if (row) {
        row.remove();
        _qlxAssignMayUpdateTotal();
    }
}

function _qlxAssignMayUpdateTotal() {
    var rows = document.querySelectorAll('.may-assign-row');
    var total = 0;
    
    rows.forEach(function(row) {
        var qtyInput = row.querySelector('.may-qty');
        var qty = parseInt(qtyInput ? qtyInput.value : 0) || 0;
        total += qty;
    });

    var cutQty = window._qlxMayData.cut_qty;
    var totalSpan = document.getElementById('may_assign_total_qty');
    if (totalSpan) {
        totalSpan.textContent = total;
    }

    var badge = document.getElementById('may_assign_status_badge');
    var saveBtn = document.getElementById('may_assign_save_btn');

    if (badge && saveBtn) {
        if (total === cutQty) {
            badge.textContent = '🟢 Khớp 100%';
            badge.style.background = '#dcfce7';
            badge.style.color = '#15803d';
        } else {
            badge.textContent = '🔴 Chưa khớp';
            badge.style.background = '#fee2e2';
            badge.style.color = '#b91c1c';
        }
    }
}

async function _qlxAssignMaySave() {
    var rows = document.querySelectorAll('.may-assign-row');
    var assignments = [];
    var totalQty = 0;
    var priceCheckFailed = false;
    var failedTargetLabel = '';

    var pricing = window._qlxMayData.pricing;
    var productName = (window._qlxMayData.item.product_name || window._qlxMayData.item.description || 'N/A');
    var patternName = window._qlxMayData.item.pattern_name || 'N/A';

    var validationError = '';
    var tzToday = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
    var yyyy = tzToday.getFullYear();
    var mm = String(tzToday.getMonth() + 1).padStart(2, '0');
    var dd = String(tzToday.getDate()).padStart(2, '0');
    var todayStr = yyyy + '-' + mm + '-' + dd;

    rows.forEach(function(row) {
        if (validationError) return;

        var targetSelect = row.querySelector('.may-target');
        var qtyInput = row.querySelector('.may-qty');
        var dateInput = row.querySelector('.may-date');
        var notesInput = row.querySelector('.may-notes');

        var contractorId = targetSelect ? targetSelect.value : '';
        var qty = parseInt(qtyInput ? qtyInput.value : 0) || 0;
        var date = dateInput ? dateInput.value : '';
        var notes = notesInput ? notesInput.value : '';

        var isGiaCong = contractorId !== '';
        var price = isGiaCong ? pricing.processing_price : pricing.factory_price;

        if (qty > 0) {
            if (!date) {
                validationError = 'Vui lòng chọn Ngày yêu cầu trả hàng cho tất cả các bên nhận may!';
                return;
            }
            if (date < todayStr) {
                validationError = 'Ngày yêu cầu trả hàng không được ở quá khứ (phải chọn từ hôm nay hoặc tương lai)!';
                return;
            }

            assignments.push({
                contractor_id: isGiaCong ? parseInt(contractorId) : null,
                quantity: qty,
                expected_date: date,
                notes: notes || null
            });
            totalQty += qty;

            if (price <= 0) {
                priceCheckFailed = true;
                failedTargetLabel = isGiaCong ? 'Gia Công' : 'Trong Nhà';
            }
        }
    });

    if (validationError) {
        showToast('⚠️ ' + validationError, 'error');
        return;
    }

    var cutQty = window._qlxMayData.cut_qty;
    
    // Validations
    if (assignments.length === 0) {
        if (!confirm('Bạn có chắc chắn muốn gỡ toàn bộ phân công May của sản phẩm này?')) {
            return;
        }
    } else if (totalQty !== cutQty) {
        showToast('Tổng số lượng phân công (' + totalQty + ') phải khớp chính xác 100% với số lượng đã cắt xong (' + cutQty + ')!', 'error');
        return;
    }

    // Pricing validation check
    if (priceCheckFailed) {
        // Store current form state to restore when reopening
        window._qlxMayPendingRows = [];
        rows.forEach(function(row) {
            window._qlxMayPendingRows.push({
                contractor_id: row.querySelector('.may-target').value,
                quantity: parseInt(row.querySelector('.may-qty').value) || 0,
                expected_date: row.querySelector('.may-date').value,
                notes: row.querySelector('.may-notes').value
            });
        });

        // Close and open warning popup
        var warnBody = '<div style="text-align:center;padding:20px 10px">'
            + '<div style="font-size:48px;margin-bottom:16px">⚠️</div>'
            + '<h4 style="color:#dc2626;font-weight:800;margin-bottom:12px;font-size:15px">SẢN PHẨM CHƯA CÓ ĐƠN GIÁ MAY</h4>'
            + '<p style="color:#1e293b;font-size:13px;line-height:1.5;margin-bottom:10px">Sản phẩm <b>' + productName + '</b> chưa được thiết lập Đơn Giá May <b>' + failedTargetLabel + '</b>.</p>'
            + '<p style="color:#475569;font-size:12px;line-height:1.4;margin-bottom:16px">Vui lòng liên hệ Giám Đốc để thiết lập bảng giá cho rập <b>' + patternName + '</b> trước khi tiếp tục phân công sản xuất.</p>'
            + '</div>';
        
        var warnFooter = '<button class="btn btn-secondary" onclick="_qlxAssignMayReopen()" style="width:100%;color:#fff;background-color:#1e3a8a;border:none">Quay lại thiết lập</button>';
            
        openModal('Cảnh Báo Đơn Giá May', warnBody, warnFooter);
        return;
    }

    try {
        await apiCall('/api/qlx/sewing-assignment/' + window._qlxMayData.itemId, 'POST', { assignments: assignments });
        closeModal();
        showToast('✅ Đã lưu phân công May & Bàn giao');
        await _qlxLoadAll();
    } catch(e) {
        showToast(e.message, 'error');
    }
}

function _qlxAssignMayReopen() {
    closeModal();
    if (window._qlxMayData) {
        _qlxAssignMay(window._qlxMayData.orderId, window._qlxMayData.itemId);
    }
}
