// ========== ĐƠN HÀNG THIẾT KẾ — Tracking thiết kế theo nhân viên ==========
var _dhtk = { tree: [], orders: [], filter: {}, page: 1, pageSize: 100 };
var _dhtkOpen = {};

function _dhtkFmt(n) { return Number(n || 0).toLocaleString('vi-VN'); }

async function renderDonhangthietkePage(content) {
    // Inject styles
    if (!document.getElementById('dhtkStyles')) {
        var st = document.createElement('style'); st.id = 'dhtkStyles';
        st.textContent = ''
            +'.dhtk-wrap{display:flex;height:calc(100vh - 60px);overflow:hidden}'
            +'.dhtk-sidebar{width:280px;min-width:280px;background:linear-gradient(180deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%);overflow-y:auto;position:relative;box-shadow:4px 0 20px rgba(0,0,0,0.15)}'
            +'.dhtk-main{flex:1;min-width:0;display:flex;flex-direction:column;overflow-y:auto;padding:20px;background:#f8f9fb}'
            // Sidebar title
            +'.dhtk-sb-title{font-size:14px;font-weight:900;padding:20px 18px 16px;text-align:center;position:relative;overflow:hidden;color:#fff;letter-spacing:0.5px}'
            +'.dhtk-sb-title::before{content:"";position:absolute;top:-50%;left:-50%;width:200%;height:200%;background:linear-gradient(45deg,transparent 30%,rgba(233,69,96,0.1) 50%,transparent 70%);animation:dhtkShimmer 3s infinite}'
            +'@keyframes dhtkShimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}'
            // Grand total bar
            +'.dhtk-sb-total{background:linear-gradient(135deg,#e94560,#c23152);color:#fff;padding:14px 18px;font-size:14px;font-weight:800;display:flex;justify-content:space-between;align-items:center;cursor:pointer;position:relative;overflow:hidden;margin:0 10px 8px;border-radius:12px;box-shadow:0 4px 15px rgba(233,69,96,0.3)}'
            +'.dhtk-sb-total::after{content:"";position:absolute;top:0;left:-100%;width:60%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent);animation:dhtkGlow 2.5s infinite}'
            +'@keyframes dhtkGlow{0%{left:-100%}100%{left:150%}}'
            // Year row
            +'.dhtk-sb-year{padding:10px 18px;font-weight:800;font-size:13px;color:#e2e8f0;cursor:pointer;display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,0.04);border-bottom:1px solid rgba(255,255,255,0.06);transition:all .15s}'
            +'.dhtk-sb-year:hover{background:rgba(255,255,255,0.08)}'
            // Month row
            +'.dhtk-sb-month{padding:8px 18px 8px 32px;font-size:12px;font-weight:700;cursor:pointer;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid rgba(255,255,255,0.03);color:#94a3b8;transition:all .15s}'
            +'.dhtk-sb-month:hover{background:rgba(233,69,96,0.1);color:#e94560}'
            +'.dhtk-sb-month.active{background:rgba(233,69,96,0.15);color:#e94560;font-weight:800}'
            // Designer row
            +'.dhtk-sb-designer{padding:7px 18px 7px 48px;font-size:11px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;color:#64748b;transition:all .15s}'
            +'.dhtk-sb-designer:hover{background:rgba(233,69,96,0.08);color:#f8b4c0}'
            +'.dhtk-sb-designer.active{background:rgba(233,69,96,0.18);color:#fff;font-weight:800}'
            // Table styles
            +'.dhtk-table{width:100%;border-collapse:separate;border-spacing:0;font-size:13px}'
            +'.dhtk-table thead th{background:linear-gradient(135deg,#1a1a2e,#16213e);color:#e2e8f0;padding:12px 14px;font-size:11px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;position:sticky;top:0;z-index:2;white-space:nowrap}'
            +'.dhtk-table thead th:first-child{border-radius:10px 0 0 0}'
            +'.dhtk-table thead th:last-child{border-radius:0 10px 0 0}'
            +'.dhtk-table tbody td{padding:10px 14px;border-bottom:1px solid #f0f0f0;vertical-align:middle}'
            +'.dhtk-table tbody tr{transition:all .1s}'
            +'.dhtk-table tbody tr:hover{background:#fef2f5}'
            +'.dhtk-table tbody tr:nth-child(even){background:#fcfcfd}'
            +'.dhtk-table tbody tr:nth-child(even):hover{background:#fef2f5}'
            // Category badge
            +'.dhtk-cat-badge{display:inline-block;padding:3px 10px;border-radius:6px;font-size:10px;font-weight:800;white-space:nowrap}'
            // Designer badge
            +'.dhtk-designer-badge{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:6px;font-size:10px;font-weight:700;background:#ede9fe;color:#7c3aed;border:1px solid #7c3aed22}'
            // Stat cards
            +'.dhtk-stat{display:inline-flex;align-items:center;gap:10px;padding:10px 20px;border-radius:12px;font-weight:800;position:relative;overflow:hidden;cursor:default}'
            +'.dhtk-stat::after{content:"";position:absolute;top:0;left:-50%;width:200%;height:100%;background:linear-gradient(90deg,transparent 40%,rgba(255,255,255,0.15) 50%,transparent 60%);animation:dhtkShimmer 2.5s infinite}'
            // Animation
            +'@keyframes dhtkPulse{0%,100%{opacity:1}50%{opacity:0.6}}'
        ;
        document.head.appendChild(st);
    }

    // Layout
    content.innerHTML = ''
        +'<div class="dhtk-wrap">'
        +'  <div class="dhtk-sidebar" id="dhtkSidebar"><div style="padding:30px;text-align:center;color:#475569;font-size:12px">⏳ Đang tải...</div></div>'
        +'  <div class="dhtk-main">'
        +'    <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px;flex-wrap:wrap">'
        +'      <div id="dhtkFilterInfo" style="font-size:13px"></div>'
        +'      <div id="dhtkStatCards" style="display:flex;gap:10px;flex:1;justify-content:flex-end"></div>'
        +'    </div>'
        +'    <div id="dhtkPaginationTop" style="margin-bottom:8px"></div>'
        +'    <div class="card" style="border-radius:14px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.06)">'
        +'      <div class="card-body" style="overflow-x:auto;padding:0">'
        +'        <table class="dhtk-table" id="dhtkTable">'
        +'          <thead><tr>'
        +'            <th>#</th>'
        +'            <th>Ngày Lên Đơn</th>'
        +'            <th>Lĩnh Vực</th>'
        +'            <th>Mã Đơn</th>'
        +'            <th>Tên Khách Hàng</th>'
        +'            <th>CSKH</th>'
        +'            <th>Nhân Viên TK</th>'
        +'          </tr></thead>'
        +'          <tbody id="dhtkTbody"><tr><td colspan="7" style="text-align:center;padding:40px;color:#94a3b8">⏳ Đang tải dữ liệu...</td></tr></tbody>'
        +'        </table>'
        +'      </div>'
        +'    </div>'
        +'    <div id="dhtkPaginationBottom" style="margin-top:8px"></div>'
        +'  </div>'
        +'</div>';

    // Default: current year
    var nowVN = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
    _dhtk.filter = { year: nowVN.getFullYear() };
    if (!_dhtkOpen._init) { _dhtkOpen['y' + nowVN.getFullYear()] = true; _dhtkOpen._init = true; }

    await _dhtkLoadTree();
    await _dhtkLoadOrders();
}

// ========== TREE ==========
async function _dhtkLoadTree() {
    var data = await apiCall('/api/dht-design/tree');
    _dhtk.tree = data.tree || [];
    _dhtk.allDesigners = data.designers || [];
    var sb = document.getElementById('dhtkSidebar'); if (!sb) return;
    var nowVN = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
    var curYear = nowVN.getFullYear();
    var curMonth = nowVN.getMonth() + 1;

    // Auto-expand current month's designers on first load
    if (!_dhtkOpen._monthInit) {
        _dhtkOpen['y' + curYear + 'm' + curMonth] = true;
        _dhtkOpen._monthInit = true;
    }

    var grandCount = data.grandCount || 0;
    var h = '<div class="dhtk-sb-title"><span style="opacity:0.5">───</span> <span style="color:#e94560">🎨 Đơn Hàng Thiết Kế</span> <span style="opacity:0.5">───</span></div>';
    h += '<div class="dhtk-sb-total"><span>📦 Tổng đơn thiết kế</span><span style="font-size:18px">' + grandCount + '</span></div>';

    var years = _dhtk.tree.length > 0 ? _dhtk.tree : [{ year: curYear, count: 0, months: [] }];
    years.forEach(function(yr) {
        var yKey = 'y' + yr.year;
        var yOpen = !!_dhtkOpen[yKey];
        h += '<div class="dhtk-sb-year" onclick="_dhtkToggle(\'' + yKey + '\')">'
            + '<span>' + (yOpen ? '▼' : '▶') + ' Năm ' + yr.year + '</span>'
            + '<span style="background:linear-gradient(135deg,#e94560,#c23152);color:#fff;padding:3px 12px;border-radius:8px;font-size:11px;font-weight:800;min-width:28px;text-align:center">' + yr.count + '</span>'
            + '</div>';
        h += '<div style="display:' + (yOpen ? 'block' : 'none') + '">';

        // Show all 12 months
        for (var mi = 12; mi >= 1; mi--) {
            var mData = (yr.months || []).find(function(m) { return m.month === mi; });
            var mCount = mData ? mData.count : 0;
            var mKey = yKey + 'm' + mi;
            var mOpen = !!_dhtkOpen[mKey];
            var mActive = _dhtk.filter.year == yr.year && _dhtk.filter.month == mi && !_dhtk.filter.designer_id && _dhtk.filter.designer_id !== 0;

            // ★ Build merged designers list: all dept designers + "Thiết Kế Cũ" with counts from data
            var dataDesigners = mData ? (mData.designers || []) : [];
            var mergedDesigners = [];
            // First: add all department designers (staff) with their counts
            (_dhtk.allDesigners || []).forEach(function(ad) {
                var found = dataDesigners.find(function(dd) { return dd.designer_id === ad.id; });
                mergedDesigners.push({
                    designer_id: ad.id,
                    designer_name: ad.full_name,
                    count: found ? found.count : 0
                });
            });
            // Then: add "Thiết Kế Cũ" if exists in data
            var oldDesignEntry = dataDesigners.find(function(dd) { return dd.designer_id === 0; });
            if (oldDesignEntry) {
                mergedDesigners.push(oldDesignEntry);
            }

            // Determine if we should show expand arrow
            var hasDesigners = mergedDesigners.length > 0;

            h += '<div class="dhtk-sb-month' + (mActive ? ' active' : '') + '" onclick="event.stopPropagation();_dhtkFilterMonth(' + yr.year + ',' + mi + ')">'
                + '<span style="display:flex;align-items:center;gap:6px">'
                + (hasDesigners ? '<span onclick="event.stopPropagation();_dhtkToggle(\'' + mKey + '\')" style="cursor:pointer;font-size:9px;width:14px;text-align:center">' + (mOpen ? '▼' : '▶') + '</span>' : '<span style="width:14px;display:inline-block"></span>')
                + '📅 Tháng ' + String(mi).padStart(2, '0')
                + '</span>'
                + '<span style="color:' + (mCount > 0 ? '#e94560' : 'rgba(255,255,255,0.2)') + ';font-weight:' + (mCount > 0 ? '800' : '400') + ';font-size:11px">' + mCount + '</span>'
                + '</div>';

            // Designers within this month (always show all dept designers)
            if (hasDesigners) {
                h += '<div style="display:' + (mOpen ? 'block' : 'none') + '">';
                mergedDesigners.forEach(function(d) {
                    var dActive = _dhtk.filter.year == yr.year && _dhtk.filter.month == mi && _dhtk.filter.designer_id == d.designer_id;
                    var isOldDesign = d.designer_id === 0;
                    var icon = isOldDesign ? '📁' : '👤';
                    var countStyle = d.count > 0
                        ? 'background:' + (isOldDesign ? 'rgba(255,255,255,0.08)' : 'rgba(233,69,96,0.2)') + ';color:' + (isOldDesign ? '#94a3b8' : '#e94560')
                        : 'background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.15)';
                    h += '<div class="dhtk-sb-designer' + (dActive ? ' active' : '') + '" onclick="event.stopPropagation();_dhtkFilterDesigner(' + yr.year + ',' + mi + ',' + d.designer_id + ')">'
                        + '<span>' + icon + ' ' + d.designer_name + '</span>'
                        + '<span style="' + countStyle + ';padding:2px 8px;border-radius:6px;font-size:10px;font-weight:800">' + d.count + '</span>'
                        + '</div>';
                });
                h += '</div>';
            }
        }
        h += '</div>';
    });

    sb.innerHTML = h;
}

function _dhtkToggle(key) {
    _dhtkOpen[key] = !_dhtkOpen[key];
    _dhtkLoadTree();
}

function _dhtkFilterMonth(year, month) {
    _dhtk.filter = { year: year, month: month };
    _dhtk.page = 1;
    // Also open this month's designer list
    _dhtkOpen['y' + year + 'm' + month] = true;
    _dhtkLoadTree();
    _dhtkLoadOrders();
}

function _dhtkFilterDesigner(year, month, designerId) {
    _dhtk.filter = { year: year, month: month, designer_id: designerId };
    _dhtk.page = 1;
    _dhtkLoadTree();
    _dhtkLoadOrders();
}

// ========== ORDERS ==========
async function _dhtkLoadOrders() {
    var f = _dhtk.filter;
    var url = '/api/dht-design/orders?';
    if (f.year) url += 'year=' + f.year + '&';
    if (f.month) url += 'month=' + f.month + '&';
    if (f.designer_id !== undefined && f.designer_id !== '') url += 'designer_id=' + f.designer_id + '&';

    var data = await apiCall(url);
    _dhtk.orders = data.orders || [];
    _dhtk.page = 1;
    _dhtkRenderTable();
}

function _dhtkRenderTable() {
    var filtered = _dhtk.orders.slice();
    var totalFiltered = filtered.length;
    var totalPages = Math.ceil(totalFiltered / _dhtk.pageSize) || 1;
    if (_dhtk.page > totalPages) _dhtk.page = totalPages;
    if (_dhtk.page < 1) _dhtk.page = 1;
    var startIdx = (_dhtk.page - 1) * _dhtk.pageSize;
    var paged = filtered.slice(startIdx, startIdx + _dhtk.pageSize);

    _dhtkRenderOrderRows(paged, startIdx);
    _dhtkRenderPagination(totalFiltered, totalPages);
    _dhtkRenderFilterInfo(totalFiltered);
}

function _dhtkRenderOrderRows(paged, startIdx) {
    var tbody = document.getElementById('dhtkTbody'); if (!tbody) return;

    if (paged.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7">'
            + '<div style="text-align:center;padding:60px 20px">'
            + '<div style="font-size:48px;margin-bottom:12px;opacity:0.3">🎨</div>'
            + '<div style="font-size:14px;font-weight:700;color:#94a3b8">Chưa có đơn thiết kế nào</div>'
            + '<div style="font-size:12px;color:#cbd5e1;margin-top:4px">Chọn khoảng thời gian hoặc nhân viên ở sidebar bên trái</div>'
            + '</div></td></tr>';
        return;
    }

    var fmtD = function(d) {
        if (!d) return '—';
        var dt = new Date(d);
        return dt.getDate() + '/' + (dt.getMonth() + 1) + '/' + dt.getFullYear();
    };

    var _catColors = ['#7c3aed', '#0891b2', '#059669', '#d97706', '#dc2626', '#2563eb', '#c026d3', '#0d9488', '#ea580c', '#4f46e5'];
    var _catBgs = ['#ede9fe', '#cffafe', '#d1fae5', '#fef3c7', '#fee2e2', '#dbeafe', '#fae8ff', '#ccfbf1', '#ffedd5', '#e0e7ff'];

    tbody.innerHTML = paged.map(function(o, i) {
        var idx = startIdx + i + 1;
        var catName = o.category_name || '—';
        var catHash = catName.split('').reduce(function(a, c) { return a + c.charCodeAt(0); }, 0) % _catColors.length;
        var catColor = _catColors[catHash];
        var catBg = _catBgs[catHash];

        var designerLabel = '';
        if (o.designer_type === 'old_design') {
            designerLabel = '<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:6px;font-size:10px;font-weight:700;background:#f1f5f9;color:#64748b;border:1px solid #e2e8f0">📁 Thiết Kế Cũ</span>';
        } else if (o.designer_name) {
            designerLabel = '<span class="dhtk-designer-badge">👤 ' + o.designer_name + '</span>';
        } else {
            designerLabel = '—';
        }

        return '<tr>'
            + '<td style="color:#94a3b8;font-weight:600;text-align:center;width:40px">' + idx + '</td>'
            + '<td style="font-weight:600">' + fmtD(o.order_date) + '</td>'
            + '<td><span class="dhtk-cat-badge" style="color:' + catColor + ';background:' + catBg + ';border:1px solid ' + catColor + '22">' + catName + '</span></td>'
            + '<td><strong style="color:#1a1a2e;letter-spacing:0.3px">' + (o.order_code || '—') + '</strong></td>'
            + '<td>' + (o.customer_name || '—') + '</td>'
            + '<td style="color:#2563eb;font-weight:600">' + (o.cskh_name || '—') + '</td>'
            + '<td>' + designerLabel + '</td>'
            + '</tr>';
    }).join('');
}

function _dhtkRenderPagination(totalItems, totalPages) {
    var html = '';
    if (totalPages <= 1) {
        html = '<div style="text-align:center;font-size:11px;color:#64748b;padding:4px">'
            + '<span style="font-weight:700">' + totalItems + ' đơn</span></div>';
    } else {
        html = '<div style="display:flex;align-items:center;justify-content:center;gap:4px;flex-wrap:wrap;padding:6px 0">';
        html += '<button onclick="_dhtkGoPage(' + (_dhtk.page - 1) + ')" ' + (_dhtk.page <= 1 ? 'disabled' : '')
            + ' style="padding:4px 10px;border-radius:6px;border:1px solid #e2e8f0;background:' + (_dhtk.page <= 1 ? '#f1f5f9' : '#fff')
            + ';color:' + (_dhtk.page <= 1 ? '#94a3b8' : '#e94560') + ';font-size:11px;font-weight:700;cursor:' + (_dhtk.page <= 1 ? 'not-allowed' : 'pointer')
            + '">◀ Trước</button>';

        var pages = [];
        pages.push(1);
        var start = Math.max(2, _dhtk.page - 2);
        var end = Math.min(totalPages - 1, _dhtk.page + 2);
        if (start > 2) pages.push('...');
        for (var p = start; p <= end; p++) pages.push(p);
        if (end < totalPages - 1) pages.push('...');
        if (totalPages > 1) pages.push(totalPages);

        for (var i = 0; i < pages.length; i++) {
            var pg = pages[i];
            if (pg === '...') {
                html += '<span style="padding:4px 6px;color:#94a3b8;font-size:11px">...</span>';
            } else {
                var isActive = pg === _dhtk.page;
                html += '<button onclick="_dhtkGoPage(' + pg + ')" style="min-width:30px;padding:4px 8px;border-radius:6px;border:1px solid '
                    + (isActive ? '#e94560' : '#e2e8f0') + ';background:' + (isActive ? '#e94560' : '#fff')
                    + ';color:' + (isActive ? '#fff' : '#334155') + ';font-size:11px;font-weight:' + (isActive ? '800' : '600')
                    + ';cursor:pointer">' + pg + '</button>';
            }
        }

        html += '<button onclick="_dhtkGoPage(' + (_dhtk.page + 1) + ')" ' + (_dhtk.page >= totalPages ? 'disabled' : '')
            + ' style="padding:4px 10px;border-radius:6px;border:1px solid #e2e8f0;background:' + (_dhtk.page >= totalPages ? '#f1f5f9' : '#fff')
            + ';color:' + (_dhtk.page >= totalPages ? '#94a3b8' : '#e94560') + ';font-size:11px;font-weight:700;cursor:' + (_dhtk.page >= totalPages ? 'not-allowed' : 'pointer')
            + '">Sau ▶</button>';

        var from = (_dhtk.page - 1) * _dhtk.pageSize + 1;
        var to = Math.min(_dhtk.page * _dhtk.pageSize, totalItems);
        html += '<span style="margin-left:8px;font-size:11px;color:#64748b;font-weight:600">'
            + 'Trang ' + _dhtk.page + '/' + totalPages + ' — ' + from + '-' + to + ' / ' + totalItems + ' đơn</span>';
        html += '</div>';
    }
    var top = document.getElementById('dhtkPaginationTop');
    var bot = document.getElementById('dhtkPaginationBottom');
    if (top) top.innerHTML = html;
    if (bot) bot.innerHTML = html;
}

function _dhtkGoPage(p) {
    var totalPages = Math.ceil((_dhtk.orders || []).length / _dhtk.pageSize) || 1;
    if (p < 1 || p > totalPages) return;
    _dhtk.page = p;
    _dhtkRenderTable();
    var tbl = document.getElementById('dhtkTable');
    if (tbl) tbl.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function _dhtkRenderFilterInfo(count) {
    var el = document.getElementById('dhtkFilterInfo'); if (!el) return;
    var f = _dhtk.filter;
    var parts = [];
    if (f.year) parts.push('<span style="color:#e94560">📆</span> NĂM ' + f.year);
    if (f.month) parts.push('<span style="color:#3b82f6">🗓️</span> THÁNG ' + f.month);
    if (f.designer_id !== undefined && f.designer_id !== '') {
        // Find designer name from tree
        var dName = '';
        if (Number(f.designer_id) === 0) {
            dName = '📁 Thiết Kế Cũ';
        } else {
            (_dhtk.tree || []).forEach(function(yr) {
                (yr.months || []).forEach(function(m) {
                    (m.designers || []).forEach(function(d) {
                        if (d.designer_id == f.designer_id) dName = d.designer_name;
                    });
                });
            });
            dName = dName ? ('👤 ' + dName) : ('👤 NV #' + f.designer_id);
        }
        parts.push('<span style="color:#7c3aed">🎨</span> ' + dName);
    }
    var label = parts.length > 0 ? parts.join(' <span style="opacity:0.3;margin:0 6px">•</span> ') : 'Tất cả';
    el.innerHTML = '<div style="display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,#1a1a2e,#16213e);color:#fff;padding:7px 20px;border-radius:10px;font-size:13px;font-weight:700;letter-spacing:0.3px">'
        + label
        + ' <span style="opacity:0.3;margin:0 4px">—</span> <span style="color:#e94560;font-weight:900">' + count + '</span> đơn'
        + '</div>';

    // Stat card
    var sc = document.getElementById('dhtkStatCards');
    if (sc) {
        sc.innerHTML = '<div class="dhtk-stat" style="background:linear-gradient(135deg,#e94560,#c23152);color:#fff;box-shadow:0 4px 15px rgba(233,69,96,0.3)">'
            + '<div style="font-size:20px">🎨</div>'
            + '<div><div style="font-size:9px;opacity:0.8;letter-spacing:1px;margin-bottom:2px">TỔNG ĐƠN THIẾT KẾ</div><div style="font-size:18px;font-weight:900">' + count + '</div></div>'
            + '</div>';
    }
}
