// ========== ĐƠN GỬI ÁO MẪU — Bộ Phận Văn Phòng ==========
var _dgam = { tree: [], orders: [], filter: {}, page: 1, pageSize: 100 };
var _dgamOpen = {};
function _dgamFmt(n) { return Number(n||0).toLocaleString('vi-VN'); }

async function renderDonguiaomauPage(content) {
    if (!document.getElementById('dgamStyles')) {
        var st = document.createElement('style'); st.id = 'dgamStyles';
        st.textContent = '.dgam-wrap{display:flex;height:calc(100vh - 60px);overflow:hidden}'
            +'.dgam-sidebar{width:270px;min-width:270px;background:#fff;border-right:1px solid var(--gray-200);overflow-y:auto;position:relative}'
            +'.dgam-main{flex:1;min-width:0;display:flex;flex-direction:column;overflow-y:auto;padding:16px}.dgam-main>*{flex-shrink:0}.dgam-main .card{overflow:visible}'
            +'.dgam-sb-title{font-size:13px;font-weight:800;padding:16px;border-bottom:1px solid var(--gray-200);text-align:center;position:relative;overflow:hidden}'
            +'.dgam-sb-title::before{content:"";position:absolute;top:-50%;left:-50%;width:200%;height:200%;background:linear-gradient(45deg,transparent 30%,rgba(14,165,233,0.08) 50%,transparent 70%);animation:dgamShimmer 3s infinite}'
            +'@keyframes dgamShimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}'
            +'.dgam-sb-total{background:linear-gradient(135deg,#0369a1,#0284c7,#0ea5e9);color:#fff;padding:12px 16px;font-size:13px;font-weight:800;display:flex;justify-content:space-between;cursor:pointer;position:relative;overflow:hidden}'
            +'.dgam-sb-total::after{content:"";position:absolute;top:0;left:-100%;width:60%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent);animation:dgamGlow 2.5s infinite}'
            +'@keyframes dgamGlow{0%{left:-100%}100%{left:150%}}'
            +'.dgam-sb-year{padding:8px 16px;font-weight:800;font-size:12px;color:var(--navy);cursor:pointer;display:flex;justify-content:space-between;align-items:center;background:#f8fafc;border-bottom:1px solid var(--gray-200)}'
            +'.dgam-sb-month{padding:6px 16px 6px 28px;font-size:11px;font-weight:700;cursor:pointer;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #f0f0f0;color:#0369a1}'
            +'.dgam-sb-month:hover{background:#f0f9ff}.dgam-sb-month.active{background:#e0f2fe;font-weight:800}'
            +'.dgam-icon-btn{width:26px;height:26px;border-radius:6px;border:1.5px solid #e2e8f0;background:#fff;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;font-size:12px;transition:all .15s;margin:0 1px}'
            +'.dgam-icon-btn:hover{transform:scale(1.15);box-shadow:0 2px 8px rgba(0,0,0,0.12)}'
            +'.dgam-icon-btn.on-duyet{background:#dcfce7;border-color:#22c55e}'
            +'.dgam-icon-btn.on-gui{background:#dbeafe;border-color:#3b82f6}'
            +'.dgam-icon-btn.on-hoan{background:#fef3c7;border-color:#f59e0b}'
            +'.dgam-icon-btn.on-ktra{background:#ede9fe;border-color:#8b5cf6}'
        ;
        document.head.appendChild(st);
    }

    content.innerHTML = '<div class="dgam-wrap"><div class="dgam-sidebar" id="dgamSidebar"><div style="padding:20px;text-align:center;color:var(--gray-400);font-size:12px">Đang tải...</div></div><div class="dgam-main">'
        +'<div style="display:flex;gap:10px;margin-bottom:8px;flex-wrap:wrap;align-items:center">'
        +'<div id="dgamFilterInfo" style="font-size:12px"></div>'
        +'<div id="dgamStatCards" style="display:flex;gap:10px;flex:1;justify-content:center"></div>'
        +'<div style="margin-left:auto"><button onclick="_dgamShowAdd()" style="font-size:13px;padding:9px 20px;background:linear-gradient(135deg,#0369a1,#0284c7,#0ea5e9);color:#fff;border:none;border-radius:10px;font-weight:900;cursor:pointer;box-shadow:0 3px 12px rgba(14,165,233,0.4);transition:all .2s" onmouseover="this.style.transform=\'scale(1.05)\'" onmouseout="this.style.transform=\'scale(1)\'">➕ Thêm Đơn</button></div>'
        +'</div>'
        +'<div id="dgamPaginationTop" style="margin:8px 0"></div>'
        +'<div class="card"><div class="card-body" style="overflow-x:auto;padding:8px"><table class="table" style="font-size:12px;white-space:nowrap" id="dgamTable"><thead><tr style="background:var(--gray-800)">'
        +'<th>Thao Tác</th>'
        +'<th>Ngày Lên Đơn</th>'
        +'<th>Số Tiền Còn Lại</th>'
        +'<th>Người Trả</th>'
        +'<th>Mã Đơn Áo Mẫu</th>'
        +'<th>Loại</th>'
        +'<th>Tên Khách Hàng</th>'
        +'<th>Tên Sản Phẩm</th>'
        +'<th>SĐT Khách</th>'
        +'<th>Hình Thức Gửi</th>'
        +'<th>Số Lượng</th>'
        +'<th>Giá</th>'
        +'<th>Tổng Tiền</th>'
        +'<th>Mã Cọc</th>'
        +'<th>Ngày Gửi Hàng</th>'
        +'<th>Trạng Thái Đơn</th>'
        +'<th>Hình Thức Trả</th>'
        +'<th>Tiền Vận Chuyển</th>'
        +'<th>Vận Chuyển Hoàn</th>'
        +'<th>Người Trả Hoàn</th>'
        +'<th>Hình Thức Trả Hoàn</th>'
        +'</tr></thead><tbody id="dgamTbody"><tr><td colspan="21" style="text-align:center;padding:40px">⏳</td></tr></tbody></table></div></div>'
        +'<div id="dgamPaginationBottom" style="margin:8px 0"></div>'
        +'</div></div>';

    var nowVN = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
    _dgam.filter = { year: nowVN.getFullYear() };
    if (!_dgamOpen._init) { _dgamOpen['y' + nowVN.getFullYear()] = true; _dgamOpen._init = true; }

    await _dgamLoadTree();
    await _dgamLoadOrders();
}

// ========== TREE ==========
async function _dgamLoadTree() {
    var data = await apiCall('/api/don-gui-ao-mau/tree');
    _dgam.tree = data.tree || [];
    var sb = document.getElementById('dgamSidebar'); if (!sb) return;
    var curYear = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' })).getFullYear();

    var grandCount = data.grandCount || 0;
    var h = '<div class="dgam-sb-title"><span style="color:var(--navy)">───</span> <span style="color:#0369a1;font-weight:900">👕 Đơn Gửi Áo Mẫu</span> <span style="color:var(--navy)">───</span></div>';
    h += '<div class="dgam-sb-total" onclick="_dgamFilterAll()"><span>📦 Tổng đơn</span><span style="font-size:16px">' + grandCount + '</span></div>';

    var years = _dgam.tree.length > 0 ? _dgam.tree : [{ year: curYear, count: 0, months: [] }];
    years.forEach(function(yr) {
        var yKey = 'y' + yr.year;
        var yOpen = !!_dgamOpen[yKey];
        h += '<div class="dgam-sb-year" onclick="_dgamToggle(\'' + yKey + '\')"><span>' + (yOpen ? '▼' : '▶') + ' Năm ' + yr.year + '</span><span style="background:linear-gradient(135deg,#0ea5e9,#0284c7);color:#fff;padding:2px 10px;border-radius:10px;font-size:10px">' + yr.count + ' đơn</span></div>';
        h += '<div style="display:' + (yOpen ? 'block' : 'none') + '">';
        for (var mi = 12; mi >= 1; mi--) {
            var mData = (yr.months || []).find(function(m) { return m.month === mi; });
            var mCount = mData ? mData.count : 0;
            var mActive = _dgam.filter.year == yr.year && _dgam.filter.month == mi;
            h += '<div class="dgam-sb-month' + (mActive ? ' active' : '') + '" onclick="event.stopPropagation();_dgamFilterMonth(' + yr.year + ',' + mi + ')"><span>▸ Tháng ' + String(mi).padStart(2, '0') + '</span><span style="color:' + (mCount > 0 ? '#0369a1' : '#999') + ';font-weight:' + (mCount > 0 ? '800' : '400') + '">' + mCount + '</span></div>';
        }
        h += '</div>';
    });
    sb.innerHTML = h;
}

function _dgamToggle(key) { _dgamOpen[key] = !_dgamOpen[key]; _dgamLoadTree(); }
function _dgamFilterAll() { var n = new Date(new Date().toLocaleString('en-US',{timeZone:'Asia/Ho_Chi_Minh'})); _dgam.filter={year:n.getFullYear()}; _dgam.page=1; _dgamLoadTree(); _dgamLoadOrders(); }
function _dgamFilterMonth(y, m) { _dgam.filter = { year: y, month: m }; _dgam.page = 1; _dgamLoadTree(); _dgamLoadOrders(); }

// ========== ORDERS ==========
async function _dgamLoadOrders() {
    var f = _dgam.filter, url = '/api/don-gui-ao-mau/orders?';
    if (f.year) url += 'year=' + f.year + '&';
    if (f.month) url += 'month=' + f.month + '&';
    var data = await apiCall(url);
    _dgam.orders = data.orders || [];
    _dgam.page = 1;
    _dgamRenderTable();
}

function _dgamRenderTable() {
    var all = _dgam.orders.slice();
    var total = all.length, totalPages = Math.ceil(total / _dgam.pageSize) || 1;
    if (_dgam.page > totalPages) _dgam.page = totalPages;
    if (_dgam.page < 1) _dgam.page = 1;
    var start = (_dgam.page - 1) * _dgam.pageSize;
    var paged = all.slice(start, start + _dgam.pageSize);
    _dgamRenderRows(paged);
    _dgamRenderPagination(total, totalPages);
    _dgamRenderInfo(total, all);
}

var _dgamStatusMap = {
    'cho_duyet': { label: 'Chờ Duyệt', bg: '#fef3c7', color: '#92400e' },
    'da_duyet': { label: 'Đã Duyệt', bg: '#dcfce7', color: '#166534' },
    'da_gui': { label: 'Đã Gửi', bg: '#dbeafe', color: '#1e40af' },
    'hoan_hang': { label: 'Hoàn Hàng', bg: '#fee2e2', color: '#991b1b' },
    'hoan_thanh': { label: 'Hoàn Thành', bg: '#d1fae5', color: '#065f46' }
};

function _dgamRenderRows(paged) {
    var tbody = document.getElementById('dgamTbody'); if (!tbody) return;
    if (paged.length === 0) {
        tbody.innerHTML = '<tr><td colspan="21"><div class="empty-state"><div class="icon">👕</div><h3>Chưa có đơn gửi áo mẫu nào</h3><p>Chọn thời gian ở sidebar hoặc thêm đơn mới</p></div></td></tr>';
        return;
    }
    var fmtD = function(d) { if (!d) return '—'; var dt = new Date(d); return dt.getDate() + '/' + (dt.getMonth()+1); };
    var fmtDF = function(d) { if (!d) return '—'; var dt = new Date(d); return dt.getDate() + '/' + (dt.getMonth()+1) + '/' + dt.getFullYear(); };

    tbody.innerHTML = paged.map(function(o) {
        var st = _dgamStatusMap[o.order_status] || { label: o.order_status || '—', bg: '#f1f5f9', color: '#475569' };
        var remaining = Number(o.remaining_amount) || 0;
        var remColor = remaining > 0 ? 'var(--danger)' : 'var(--success)';

        return '<tr>'
            +'<td style="text-align:center">'
            +'<button class="dgam-icon-btn'+(o.status_duyet?' on-duyet':'')+'" title="Duyệt" onclick="_dgamTogSt('+o.id+',\'status_duyet\','+!o.status_duyet+')">✅</button>'
            +'<button class="dgam-icon-btn'+(o.status_gui_don?' on-gui':'')+'" title="Gửi đơn" onclick="_dgamTogSt('+o.id+',\'status_gui_don\','+!o.status_gui_don+')">📤</button>'
            +'<button class="dgam-icon-btn'+(o.status_hoan_hang?' on-hoan':'')+'" title="Hoàn hàng" onclick="_dgamTogSt('+o.id+',\'status_hoan_hang\','+!o.status_hoan_hang+')">🔄</button>'
            +'<button class="dgam-icon-btn'+(o.status_kiem_tra?' on-ktra':'')+'" title="Kiểm tra" onclick="_dgamTogSt('+o.id+',\'status_kiem_tra\','+!o.status_kiem_tra+')">🔍</button>'
            +'</td>'
            +'<td>'+fmtDF(o.order_date)+'</td>'
            +'<td style="font-weight:700;color:'+remColor+'">'+_dgamFmt(remaining)+'</td>'
            +'<td>'+(o.payer||'—')+'</td>'
            +'<td><strong style="color:'+(remaining>0?'#c2410c':'#0f766e')+'">'+(o.sample_order_code||'—')+'</strong></td>'
            +'<td>'+(o.category||'—')+'</td>'
            +'<td>'+(o.customer_name||'—')+'</td>'
            +'<td>'+(o.product_name||'—')+'</td>'
            +'<td>'+(o.customer_phone?'<a href="tel:'+o.customer_phone+'" style="color:var(--info)">'+o.customer_phone+'</a>':'—')+'</td>'
            +'<td>'+(o.shipping_method||'—')+'</td>'
            +'<td style="text-align:center;font-weight:800">'+(o.quantity||0)+'</td>'
            +'<td style="text-align:right">'+_dgamFmt(o.price)+'</td>'
            +'<td style="color:var(--success);font-weight:800;text-align:right">'+_dgamFmt(o.total_amount)+'</td>'
            +'<td>'+(o.deposit_code||'—')+'</td>'
            +'<td>'+fmtDF(o.ship_date)+'</td>'
            +'<td><span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;background:'+st.bg+';color:'+st.color+'">'+st.label+'</span></td>'
            +'<td>'+(o.payment_method||'—')+'</td>'
            +'<td style="text-align:right">'+_dgamFmt(o.shipping_fee)+'</td>'
            +'<td style="text-align:right">'+_dgamFmt(o.return_shipping_fee)+'</td>'
            +'<td>'+(o.return_payer||'—')+'</td>'
            +'<td>'+(o.return_payment_method||'—')+'</td>'
            +'</tr>';
    }).join('');
}

async function _dgamTogSt(id, field, val) {
    await apiCall('/api/don-gui-ao-mau/' + id + '/status', 'PATCH', { field: field, value: val });
    for (var i = 0; i < _dgam.orders.length; i++) { if (_dgam.orders[i].id === id) { _dgam.orders[i][field] = val; break; } }
    _dgamRenderTable();
}

function _dgamRenderPagination(totalItems, totalPages) {
    var html = '';
    if (totalPages <= 1) {
        html = '<div style="text-align:center;font-size:11px;color:#64748b;padding:4px"><span style="font-weight:700">' + totalItems + ' đơn</span></div>';
    } else {
        html = '<div style="display:flex;align-items:center;justify-content:center;gap:4px;flex-wrap:wrap;padding:6px 0">';
        html += '<button onclick="_dgamGoPage(' + (_dgam.page-1) + ')" ' + (_dgam.page<=1?'disabled':'') + ' style="padding:4px 10px;border-radius:6px;border:1px solid #cbd5e1;background:'+(_dgam.page<=1?'#f1f5f9':'#fff')+';color:'+(_dgam.page<=1?'#94a3b8':'#0369a1')+';font-size:11px;font-weight:700;cursor:'+(_dgam.page<=1?'not-allowed':'pointer')+'">◀ Trước</button>';
        var pages = []; pages.push(1);
        var s2 = Math.max(2, _dgam.page-2), e2 = Math.min(totalPages-1, _dgam.page+2);
        if (s2 > 2) pages.push('...');
        for (var p = s2; p <= e2; p++) pages.push(p);
        if (e2 < totalPages-1) pages.push('...');
        if (totalPages > 1) pages.push(totalPages);
        for (var i = 0; i < pages.length; i++) {
            var pg = pages[i];
            if (pg === '...') { html += '<span style="padding:4px 6px;color:#94a3b8;font-size:11px">...</span>'; }
            else { var isA = pg === _dgam.page; html += '<button onclick="_dgamGoPage('+pg+')" style="min-width:30px;padding:4px 8px;border-radius:6px;border:1px solid '+(isA?'#0369a1':'#cbd5e1')+';background:'+(isA?'#0369a1':'#fff')+';color:'+(isA?'#fff':'#334155')+';font-size:11px;font-weight:'+(isA?'800':'600')+';cursor:pointer">'+pg+'</button>'; }
        }
        html += '<button onclick="_dgamGoPage('+(_dgam.page+1)+')" '+(_dgam.page>=totalPages?'disabled':'')+' style="padding:4px 10px;border-radius:6px;border:1px solid #cbd5e1;background:'+(_dgam.page>=totalPages?'#f1f5f9':'#fff')+';color:'+(_dgam.page>=totalPages?'#94a3b8':'#0369a1')+';font-size:11px;font-weight:700;cursor:'+(_dgam.page>=totalPages?'not-allowed':'pointer')+'">Sau ▶</button>';
        html += ' <span style="font-size:11px;color:#64748b;font-weight:600;margin-left:8px">Trang '+_dgam.page+'/'+totalPages+' — '+totalItems+' đơn</span></div>';
    }
    var top = document.getElementById('dgamPaginationTop'), bot = document.getElementById('dgamPaginationBottom');
    if (top) top.innerHTML = html;
    if (bot) bot.innerHTML = html;
}

function _dgamGoPage(p) {
    var tp = Math.ceil((_dgam.orders||[]).length / _dgam.pageSize) || 1;
    if (p < 1 || p > tp) return;
    _dgam.page = p; _dgamRenderTable();
    var tbl = document.getElementById('dgamTable');
    if (tbl) tbl.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function _dgamRenderInfo(count, arr) {
    var el = document.getElementById('dgamFilterInfo'); if (!el) return;
    var f = _dgam.filter, parts = [];
    if (f.year) parts.push('<span style="color:#0ea5e9">📆</span> NĂM ' + f.year);
    if (f.month) parts.push('<span style="color:#60a5fa">🗓️</span> THÁNG ' + f.month);
    var label = parts.length > 0 ? parts.join(' <span style="opacity:0.5;margin:0 6px">•</span> ') : 'Tất cả';
    el.innerHTML = '<div style="display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,#1e293b,#334155);color:#fff;padding:6px 18px;border-radius:8px;font-size:13px;font-weight:700;letter-spacing:0.3px">'
        + label + ' <span style="opacity:0.5;margin:0 4px">—</span> <span style="color:#38bdf8;font-weight:900">' + count + '</span> đơn</div>';

    // Stat cards
    var totalAmount = 0, totalRemaining = 0;
    (arr||[]).forEach(function(o) { totalAmount += Number(o.total_amount)||0; totalRemaining += Number(o.remaining_amount)||0; });
    var sc = document.getElementById('dgamStatCards');
    if (sc) {
        sc.innerHTML = '<div style="background:linear-gradient(135deg,#2563eb,#3b82f6);color:#fff;padding:8px 18px;border-radius:10px;min-width:100px;text-align:center;box-shadow:0 4px 15px #2563eb30;position:relative;overflow:hidden">'
            +'<div style="position:absolute;top:0;left:-50%;width:200%;height:100%;background:linear-gradient(90deg,transparent 40%,rgba(255,255,255,0.15) 50%,transparent 60%);animation:dgamShimmer 2.5s infinite"></div>'
            +'<div style="font-size:9px;font-weight:600;opacity:0.85;letter-spacing:1px;margin-bottom:2px">📦 SỐ ĐƠN</div>'
            +'<div style="font-size:15px;font-weight:900">'+count+'</div></div>'
            +'<div style="background:linear-gradient(135deg,#059669,#10b981);color:#fff;padding:8px 18px;border-radius:10px;min-width:140px;text-align:center;box-shadow:0 4px 15px #05966930;position:relative;overflow:hidden">'
            +'<div style="position:absolute;top:0;left:-50%;width:200%;height:100%;background:linear-gradient(90deg,transparent 40%,rgba(255,255,255,0.15) 50%,transparent 60%);animation:dgamShimmer 2.5s infinite .3s"></div>'
            +'<div style="font-size:9px;font-weight:600;opacity:0.85;letter-spacing:1px;margin-bottom:2px">💰 TỔNG TIỀN</div>'
            +'<div style="font-size:15px;font-weight:900">'+_dgamFmt(totalAmount)+'đ</div></div>'
            +'<div style="background:linear-gradient(135deg,#dc2626,#ef4444);color:#fff;padding:8px 18px;border-radius:10px;min-width:140px;text-align:center;box-shadow:0 4px 15px #dc262630;position:relative;overflow:hidden">'
            +'<div style="position:absolute;top:0;left:-50%;width:200%;height:100%;background:linear-gradient(90deg,transparent 40%,rgba(255,255,255,0.15) 50%,transparent 60%);animation:dgamShimmer 2.5s infinite .6s"></div>'
            +'<div style="font-size:9px;font-weight:600;opacity:0.85;letter-spacing:1px;margin-bottom:2px">⚠️ CÒN LẠI</div>'
            +'<div style="font-size:15px;font-weight:900">'+_dgamFmt(totalRemaining)+'đ</div></div>';
    }
}

function _dgamShowAdd() { if (typeof showToast === 'function') showToast('Tính năng thêm đơn sẽ được phát triển sau', 'info'); }
