// ========== ĐƠN GỬI ÁO MẪU — Bộ Phận Văn Phòng ==========
var _dgam = { tree: [], orders: [], filter: {}, page: 1, pageSize: 100 };
var _dgamOpen = {};
const DGAM_VN_PROVINCES = [
    'An Giang','Bà Rịa - Vũng Tàu','Bắc Giang','Bắc Kạn','Bạc Liêu','Bắc Ninh','Bến Tre','Bình Định','Bình Dương',
    'Bình Phước','Bình Thuận','Cà Mau','Cần Thơ','Cao Bằng','Đà Nẵng','Đắk Lắk','Đắk Nông','Điện Biên','Đồng Nai',
    'Đồng Tháp','Gia Lai','Hà Giang','Hà Nam','Hà Nội','Hà Tĩnh','Hải Dương','Hải Phòng','Hậu Giang','Hòa Bình',
    'Hưng Yên','Khánh Hòa','Kiên Giang','Kon Tum','Lai Châu','Lâm Đồng','Lạng Sơn','Lào Cai','Long An','Nam Định',
    'Nghệ An','Ninh Bình','Ninh Thuận','Phú Thọ','Phú Yên','Quảng Bình','Quảng Nam','Quảng Ngãi','Quảng Ninh','Quảng Trị',
    'Sóc Trăng','Sơn La','Tây Ninh','Thái Bình','Thái Nguyên','Thanh Hóa','Thừa Thiên Huế','Tiền Giang','TP. Hồ Chí Minh',
    'Trà Vinh','Tuyên Quang','Vĩnh Long','Vĩnh Phúc','Yên Bái'
];
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
        +'<th>Trạng Thái</th>'
        +'<th>Ngày LĐ</th>'
        +'<th>Còn Lại</th>'
        +'<th>Mã Đơn Áo Mẫu</th>'
        +'<th>Tên SP</th>'
        +'<th>Ảnh Mẫu</th>'
        +'<th>Loại SP</th>'
        +'<th>Tên Khách</th>'
        +'<th>SĐT Khách</th>'
        +'<th>Thành Phố</th>'
        +'<th>CSKH</th>'
        +'<th>Số Lượng</th>'
        +'<th>Giá</th>'
        +'<th>Đặt Cọc</th>'
        +'<th>Lịch Sử CN</th>'
        +'</tr></thead><tbody id="dgamTbody"><tr><td colspan="15" style="text-align:center;padding:40px">⏳</td></tr></tbody></table></div></div>'
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
        tbody.innerHTML = '<tr><td colspan="15"><div class="empty-state"><div class="icon">👕</div><h3>Chưa có đơn gửi áo mẫu nào</h3><p>Chọn thời gian ở sidebar hoặc thêm đơn mới</p></div></td></tr>';
        return;
    }
    var fmtHM_DM = function(d) {
        if (!d) return '—';
        var dt = new Date(d);
        var hr = String(dt.getHours()).padStart(2, '0');
        var min = String(dt.getMinutes()).padStart(2, '0');
        var date = dt.getDate();
        var month = dt.getMonth() + 1;
        return hr + ':' + min + ' ' + date + '/' + month;
    };

    tbody.innerHTML = paged.map(function(o) {
        var st = _dgamStatusMap[o.order_status] || { label: o.order_status || '—', bg: '#f1f5f9', color: '#475569' };
        var remaining = Number(o.remaining_amount) || 0;
        var remColor = remaining > 0 ? 'var(--danger)' : 'var(--success)';

        var statusHtml = '<td style="text-align:center" onclick="event.stopPropagation()">'
            +'<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px">'
            +'<div><span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;background:'+st.bg+';color:'+st.color+';white-space:nowrap;">'+st.label+'</span></div>'
            +'<div style="display:flex;gap:2px;justify-content:center">'
            +'<button class="dgam-icon-btn'+(o.status_duyet?' on-duyet':'')+'" title="Duyệt" onclick="_dgamTogSt('+o.id+',\'status_duyet\','+!o.status_duyet+')">✅</button>'
            +'<button class="dgam-icon-btn'+(o.status_gui_don?' on-gui':'')+'" title="Gửi đơn" onclick="_dgamTogSt('+o.id+',\'status_gui_don\','+!o.status_gui_don+')">📤</button>'
            +'<button class="dgam-icon-btn'+(o.status_hoan_hang?' on-hoan':'')+'" title="Hoàn hàng" onclick="_dgamTogSt('+o.id+',\'status_hoan_hang\','+!o.status_hoan_hang+')">🔄</button>'
            +'<button class="dgam-icon-btn'+(o.status_kiem_tra?' on-ktra':'')+'" title="Kiểm tra" onclick="_dgamTogSt('+o.id+',\'status_kiem_tra\','+!o.status_kiem_tra+')">🔍</button>'
            +'</div>'
            +'</div>'
            +'</td>';

        var prodDisplay = o.product_name || '—';
        if (o.linh_vuc) {
            prodDisplay = '<span style="background:#fef3c7;color:#d97706;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;margin-right:4px">' + o.linh_vuc + '</span>' + prodDisplay;
        }
        if (o.sale_note_for_accountant) {
            prodDisplay += '<div style="font-size:10px;color:#d97706;font-style:italic;max-width:180px;white-space:normal;margin-top:2px">📝 ' + o.sale_note_for_accountant + '</div>';
        }

        var imgDisplay = '—';
        if (o.sample_image) {
            imgDisplay = '<img src="' + o.sample_image + '" style="max-height:45px;max-width:45px;border-radius:6px;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,0.15);object-fit:cover;" onclick="event.stopPropagation();_dgamShowImagePreview(\'' + o.sample_image + '\')">';
        }

        var updaterText = '—';
        if (o.updated_by_name) {
            updaterText = '<span style="font-weight:700;color:var(--primary)">' + o.updated_by_name + '</span><br><span style="font-size:10px;color:var(--gray-500)">' + fmtHM_DM(o.updated_at) + '</span>';
        } else if (o.created_by_name) {
            updaterText = '<span style="font-weight:700;color:var(--gray-600)">' + o.created_by_name + '</span><br><span style="font-size:10px;color:var(--gray-500)">' + fmtHM_DM(o.created_at) + '</span>';
        }

        return '<tr style="cursor:pointer" onclick="_dgamShowDetail('+o.id+')">'
            +statusHtml
            +'<td>'+fmtHM_DM(o.created_at)+'</td>'
            +'<td style="font-weight:700;color:'+remColor+'">'+_dgamFmt(remaining)+'</td>'
            +'<td><strong style="color:'+(remaining>0?'#c2410c':'#0f766e')+'">'+(o.sample_order_code||'—')+'</strong></td>'
            +'<td>'+prodDisplay+'</td>'
            +'<td style="text-align:center">'+imgDisplay+'</td>'
            +'<td>'+(o.category||'—')+'</td>'
            +'<td>'+(o.customer_name||'—')+'</td>'
            +'<td>'+(o.customer_phone?'<a href="tel:'+o.customer_phone+'" style="color:var(--info)" onclick="event.stopPropagation()">'+o.customer_phone+'</a>':'—')+'</td>'
            +'<td>'+(o.province||'—')+'</td>'
            +'<td>'+(o.created_by_name||'—')+'</td>'
            +'<td style="text-align:center;font-weight:800">'+(o.quantity||0)+'</td>'
            +'<td style="text-align:right">'+_dgamFmt(o.price)+'</td>'
            +'<td style="color:var(--success);font-weight:800;text-align:right">'+_dgamFmt(o.deposit_amount || 0)+'</td>'
            +'<td>'+updaterText+'</td>'
            +'</tr>';
    }).join('');
}

async function _dgamTogSt(id, field, val) {
    await apiCall('/api/don-gui-ao-mau/' + id + '/status', 'PATCH', { field: field, value: val });
    await _dgamLoadOrders();
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

var _dgamDraftsList = [];
var _dgamDhtCategories = [];
var _dgamDhtCarriers = [];

// Helper to resize pasted image proof
function _dgamResizeAndStoreImage(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const maxDim = 800;
                if (width > maxDim || height > maxDim) {
                    if (width > height) {
                        height = Math.round((height * maxDim) / width);
                        width = maxDim;
                    } else {
                        width = Math.round((width * maxDim) / height);
                        height = maxDim;
                    }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
                resolve(compressedBase64);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

async function _dgamPasteSampleImg(e) {
    const items = (e.clipboardData || e.originalEvent?.clipboardData)?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
            const blob = items[i].getAsFile();
            const compressed = await _dgamResizeAndStoreImage(blob);
            _dgam.sampleImgBase64 = compressed;
            const img = document.getElementById('dgamAddSampleImg');
            const ph = document.getElementById('dgamAddSampleImgPlaceholder');
            const btn = document.getElementById('dgamAddSampleImgDeleteBtn');
            if (img) { img.src = compressed; img.style.display = 'block'; }
            if (ph) ph.style.display = 'none';
            if (btn) btn.style.display = 'block';
            const zone = document.getElementById('dgamAddSampleImgZone');
            if (zone) { zone.style.borderColor = '#059669'; zone.style.background = '#f0fdf4'; }
            if (typeof showToast === 'function') {
                showToast('✅ Đã dán ảnh mẫu thành công!');
            }
            e.preventDefault();
            return;
        }
    }
    if (typeof showToast === 'function') {
        showToast('Không tìm thấy hình ảnh trong clipboard!', 'error');
    }
}

function _dgamDeleteSampleImg() {
    _dgam.sampleImgBase64 = null;
    const img = document.getElementById('dgamAddSampleImg');
    const ph = document.getElementById('dgamAddSampleImgPlaceholder');
    const btn = document.getElementById('dgamAddSampleImgDeleteBtn');
    const zone = document.getElementById('dgamAddSampleImgZone');
    if (img) { img.src = ''; img.style.display = 'none'; }
    if (ph) ph.style.display = 'block';
    if (btn) btn.style.display = 'none';
    if (zone) {
        zone.style.borderColor = '#cbd5e1';
        zone.style.background = '#f8fafc';
    }
    if (typeof showToast === 'function') {
        showToast('Đã xóa ảnh mẫu, vui lòng dán lại ảnh mới!');
    }
}

function _dgamValidateShipDate(dateStr) {
    if (!dateStr) return { valid: false, error: 'Vui lòng chọn Ngày Gửi Hàng!' };
    
    const nowVN = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
    const yyyy = nowVN.getFullYear();
    const mm = String(nowVN.getMonth() + 1).padStart(2, '0');
    const dd = String(nowVN.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;
    
    if (dateStr < todayStr) {
        return { valid: false, error: 'Không được chọn ngày trong quá khứ!' };
    }
    
    const dateObj = new Date(dateStr + 'T00:00:00');
    if (dateObj.getDay() === 0) {
        return { valid: false, error: 'Không được chọn ngày Chủ Nhật!' };
    }
    
    if (_dgam.holidaysList && _dgam.holidaysList.includes(dateStr)) {
        const hol = _dgam.holidaysRaw ? _dgam.holidaysRaw.find(h => h.holiday_date === dateStr) : null;
        const name = hol ? hol.holiday_name : 'Ngày nghỉ lễ';
        return { valid: false, error: `Ngày này trùng với ngày nghỉ lễ (${name})!` };
    }
    
    return { valid: true };
}

function _dgamOnShipDateChange() {
    const el = document.getElementById('dgamAddShipDate');
    if (!el) return;
    const dateStr = el.value;
    if (!dateStr) return;
    
    const res = _dgamValidateShipDate(dateStr);
    if (!res.valid) {
        showToast(res.error, 'error');
        el.style.borderColor = '#ef4444';
        el.style.boxShadow = '0 0 0 4px rgba(239, 68, 68, 0.12)';
        
        const nowVN = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
        const yyyy = nowVN.getFullYear();
        const mm = String(nowVN.getMonth() + 1).padStart(2, '0');
        const dd = String(nowVN.getDate()).padStart(2, '0');
        el.value = `${yyyy}-${mm}-${dd}`;
        
        const todayRes = _dgamValidateShipDate(el.value);
        if (!todayRes.valid) {
            let nextDate = new Date(nowVN);
            for (let i = 0; i < 30; i++) {
                nextDate.setDate(nextDate.getDate() + 1);
                const ny = nextDate.getFullYear();
                const nm = String(nextDate.getMonth() + 1).padStart(2, '0');
                const nd = String(nextDate.getDate()).padStart(2, '0');
                const nextDateStr = `${ny}-${nm}-${nd}`;
                if (_dgamValidateShipDate(nextDateStr).valid) {
                    el.value = nextDateStr;
                    break;
                }
            }
        }
    } else {
        el.style.borderColor = '#cbd5e1';
        el.style.boxShadow = 'none';
    }
}

function _dgamOnShippingPriorityChange() {
    const priority = document.getElementById('dgamAddShippingPriority')?.value;
    const timeContainer = document.getElementById('dgamShipTimeContainer');
    const hourInput = document.getElementById('dgamAddShipHour');
    const minuteInput = document.getElementById('dgamAddShipMinute');
    if (timeContainer) {
        if (priority === 'CHUẨN') {
            timeContainer.style.display = 'block';
            if (hourInput && hourInput.value === '' && minuteInput && minuteInput.value === '') {
                const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
                hourInput.value = String(now.getHours()).padStart(2, '0');
                minuteInput.value = String(now.getMinutes()).padStart(2, '0');
            }
        } else {
            timeContainer.style.display = 'none';
            if (hourInput) hourInput.value = '';
            if (minuteInput) minuteInput.value = '';
        }
    }
}

async function _dgamShowAdd() {
    try {
        const [draftsRes, catsRes, carriersRes, holidaysRes] = await Promise.all([
            apiCall('/api/don-gui-ao-mau/drafts'),
            apiCall('/api/dht/categories'),
            apiCall('/api/dht/carriers'),
            apiCall('/api/penalty/holidays').catch(() => ({ holidays: [] }))
        ]);
        _dgamDraftsList = draftsRes.drafts || [];
        _dgamDhtCategories = catsRes.categories || [];
        _dgamDhtCarriers = carriersRes.carriers || [];
        _dgam.holidaysRaw = holidaysRes.holidays || [];
        _dgam.holidaysList = (holidaysRes.holidays || []).map(h => h.holiday_date);
    } catch (e) {
        _dgamDraftsList = [];
        _dgamDhtCategories = [];
        _dgamDhtCarriers = [];
        _dgam.holidaysRaw = [];
        _dgam.holidaysList = [];
    }

    if (_dgamDraftsList.length === 0) {
        if (typeof showToast === 'function') {
            showToast('Không có mã đơn áo mẫu nào đang chờ tạo đơn! Vui lòng tạo mã đơn từ mục chăm sóc tư vấn trước.', 'warning');
        } else {
            alert('Không có mã đơn áo mẫu nào đang chờ tạo đơn!');
        }
        return;
    }

    _dgam.selectedDepositAmount = 0;
    _dgam.sampleImgBase64 = null;

    const draftOptions = _dgamDraftsList.map(d => 
        `<option value="${d.id}">${d.sample_order_code} (${d.customer_name || 'Không tên'})</option>`
    ).join('');

    const bodyHTML = `
        <style>
            .dgam-modal-content {
                font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
                color: #334155;
            }
            .dgam-modal-content .form-group {
                margin-bottom: 16px;
            }
            .dgam-modal-content label {
                font-size: 12.5px;
                font-weight: 700;
                color: #475569;
                margin-bottom: 6px !important;
                display: inline-block;
            }
            .dgam-modal-content .form-control {
                border-radius: 8px !important;
                border: 1.5px solid #cbd5e1 !important;
                padding: 10px 14px !important;
                font-size: 13.5px !important;
                height: auto !important;
                transition: all 0.2s ease-in-out !important;
                background-color: #fff;
                box-shadow: inset 0 1px 2px rgba(0,0,0,0.02);
            }
            .dgam-modal-content .form-control:focus {
                border-color: #0ea5e9 !important;
                box-shadow: 0 0 0 4px rgba(14, 165, 233, 0.12) !important;
                outline: none !important;
            }
            .dgam-modal-content .dgam-readonly {
                background-color: #f1f5f9 !important;
                border-color: #e2e8f0 !important;
                color: #475569 !important;
                font-weight: 600;
                cursor: not-allowed !important;
            }
            .dgam-section-title {
                font-size: 12px;
                font-weight: 800;
                color: #64748b;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin: 20px 0 12px 0;
                padding-bottom: 6px;
                border-bottom: 1px solid #e2e8f0;
            }
        </style>
        <div class="dgam-modal-content">
            <div class="form-group">
                <label>Chọn Mã Đơn Áo Mẫu <span style="color:var(--danger)">*</span></label>
                <select id="dgamAddDraftSelect" class="form-control" onchange="_dgamOnDraftSelect()" style="border:2.5px solid #eab308 !important;font-weight:700;color:#1e3a8a;">
                    <option value="">-- Chọn mã đơn --</option>
                    ${draftOptions}
                </select>
            </div>
            
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                <div class="form-group">
                    <label>Tên Khách Hàng</label>
                    <input type="text" id="dgamAddCustName" class="form-control dgam-readonly" readonly placeholder="Tên khách hàng">
                </div>
                <div class="form-group">
                    <label>Số Điện Thoại</label>
                    <input type="text" id="dgamAddCustPhone" class="form-control dgam-readonly" readonly placeholder="Số điện thoại" maxlength="10">
                </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                <div class="form-group">
                    <label>Địa Chỉ <span style="color:var(--danger)">*</span></label>
                    <input type="text" id="dgamAddAddress" class="form-control" placeholder="Địa chỉ giao hàng">
                </div>
                <div class="form-group">
                    <label>Tỉnh, Thành Phố <span style="color:var(--danger)">*</span></label>
                    <select id="dgamAddProvince" class="form-control">
                        <option value="">-- Chọn tỉnh/thành --</option>
                        ${DGAM_VN_PROVINCES.map(p => `<option value="${p}">${p}</option>`).join('')}
                    </select>
                </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                <div class="form-group">
                    <label>Mã Tiền Đặt Cọc</label>
                    <input type="text" id="dgamAddDepositCode" class="form-control dgam-readonly" readonly placeholder="Không có cọc">
                </div>
                <div class="form-group">
                    <label>Phân Loại <span style="color:var(--danger)">*</span></label>
                    <select id="dgamAddCategory" class="form-control" onchange="_dgamOnCategoryChange()" style="border:1.5px solid #0284c7 !important;font-weight:700;color:#0369a1;">
                        <option value="">-- Chọn phân loại --</option>
                        <option value="Gửi mẫu áo">Gửi mẫu áo</option>
                        <option value="Gửi mẫu vải">Gửi mẫu vải</option>
                        <option value="Gửi Tem">Gửi Tem</option>
                        <option value="Gửi Pet">Gửi Pet</option>
                        <option value="Gửi Khác">Gửi Khác</option>
                        <option value="Gửi mẫu quần">Gửi mẫu quần</option>
                        <option value="Gửi mẫu váy">Gửi mẫu váy</option>
                    </select>
                </div>
            </div>

            <div id="dgamDynamicFieldsContainer" style="margin-top:8px;"></div>
        </div>
    `;

    const footerHTML = `
        <button class="btn btn-secondary" onclick="closeModal()">Đóng</button>
        <button class="btn btn-primary" onclick="_dgamSubmitAdd()" style="width:auto;background:linear-gradient(135deg,#0369a1,#0ea5e9);border:none;">💾 Tạo Đơn</button>
    `;

    openModal('➕ THÀNH LẬP ĐƠN GỬI ÁO MẪU', bodyHTML, footerHTML);
}

function _dgamOnCategoryChange() {
    const cat = document.getElementById('dgamAddCategory').value;
    const container = document.getElementById('dgamDynamicFieldsContainer');
    if (!container) return;

    if (!cat) {
        container.innerHTML = '';
        return;
    }

    const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    const isGarment = ['Gửi mẫu áo', 'Gửi mẫu quần', 'Gửi mẫu váy'].includes(cat);

    let html = `<div class="dgam-section-title">Chi Tiết Đơn Hàng Mẫu</div>`;

    if (isGarment) {
        html += `
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                <div class="form-group">
                    <label>Lĩnh Vực <span style="color:var(--danger)">*</span></label>
                    <select id="dgamAddLinhVuc" class="form-control">
                        <option value="">-- Chọn lĩnh vực --</option>
                        ${_dgamDhtCategories.map(c => `<option value="${c.name}">${c.name}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Tên Sản Phẩm <span style="color:var(--danger)">*</span></label>
                    <input type="text" id="dgamAddProductName" class="form-control" placeholder="Tên sản phẩm mẫu">
                </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                <div class="form-group">
                    <label>Số Lượng <span style="color:var(--danger)">*</span></label>
                    <input type="number" id="dgamAddQuantity" class="form-control" value="1" min="1" oninput="_dgamCalcRemaining()">
                </div>
                <div class="form-group">
                    <label>Giá Thành <span style="color:var(--danger)">*</span></label>
                    <input type="text" id="dgamAddPrice" class="form-control" placeholder="0" oninput="if (typeof formatDepositInput === 'function') formatDepositInput(this); _dgamCalcRemaining()">
                </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;">
                <div class="form-group">
                    <label>Tổng Tiền Đơn Mẫu</label>
                    <input type="text" id="dgamAddTotalAmount" class="form-control dgam-readonly" readonly style="color:#10b981;font-weight:700;" value="0">
                </div>
                <div class="form-group">
                    <label>Số Tiền Đặt Cọc</label>
                    <input type="text" id="dgamAddDepositAmountField" class="form-control dgam-readonly" readonly style="color:#0ea5e9;font-weight:700;" value="0">
                </div>
                <div class="form-group">
                    <label>Số Tiền Còn Lại</label>
                    <input type="text" id="dgamAddRemainingAmount" class="form-control dgam-readonly" readonly style="color:#ef4444;font-weight:800;" value="0">
                </div>
            </div>
        `;
    } else {
        html += `
            <div class="form-group">
                <label>Tên Sản Phẩm <span style="color:var(--danger)">*</span></label>
                <input type="text" id="dgamAddProductName" class="form-control" placeholder="Tên sản phẩm mẫu">
            </div>
        `;
    }

    html += `
        <div class="form-group">
            <label>Hình Ảnh Mẫu <span style="color:var(--danger)">*</span> <span style="font-size:11px;color:#64748b;font-weight:normal;">(Nhấn vào khung bên dưới rồi nhấn Ctrl+V để dán hình ảnh mẫu)</span></label>
            <div id="dgamAddSampleImgZone" tabindex="0" style="border:2px dashed #cbd5e1;border-radius:12px;padding:24px;text-align:center;cursor:pointer;background:#f8fafc;transition:all .2s;min-height:110px;display:flex;align-items:center;justify-content:center;flex-direction:column;position:relative;" onpaste="_dgamPasteSampleImg(event)" onclick="this.focus()" onfocus="this.style.borderColor='#0ea5e9';this.style.background='#f0f9ff'" onblur="this.style.borderColor='#cbd5e1';this.style.background='#f8fafc'">
                <div id="dgamAddSampleImgPlaceholder" style="color:#64748b;font-size:13px;"><span style="font-size:28px">📸</span><br>Click vào đây rồi <b>Ctrl+V</b> để dán hình ảnh mẫu</div>
                <img id="dgamAddSampleImg" style="display:none;max-width:100%;max-height:180px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.08)">
                <button id="dgamAddSampleImgDeleteBtn" type="button" style="display:none;position:absolute;top:8px;right:8px;background:#ef4444;color:#fff;border:none;border-radius:6px;padding:5px 12px;font-size:11px;font-weight:600;cursor:pointer;box-shadow:0 2px 6px rgba(239,68,68,0.25);z-index:10;transition:all 0.2s;" onclick="event.stopPropagation(); _dgamDeleteSampleImg();" onmouseover="this.style.background='#dc2626'" onmouseout="this.style.background='#ef4444'">✕ Xóa & dán lại</button>
            </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;">
            <div class="form-group">
                <label>Ngày Lên Đơn</label>
                <input type="text" id="dgamAddOrderDate" class="form-control dgam-readonly" readonly value="${new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' })).toLocaleDateString('vi-VN')}">
            </div>
            <div class="form-group">
                <label>Ngày Gửi Hàng <span style="color:var(--danger)">*</span></label>
                <input type="date" id="dgamAddShipDate" class="form-control" min="${todayStr}" onchange="_dgamOnShipDateChange()">
            </div>
            <div class="form-group">
                <label>Tiêu Chuẩn Gửi <span style="color:var(--danger)">*</span></label>
                <select id="dgamAddShippingPriority" class="form-control" onchange="_dgamOnShippingPriorityChange()">
                    <option value="CHUẨN">CHUẨN</option>
                    <option value="GỬI">GỬI</option>
                    <option value="GẤP" selected>GẤP</option>
                </select>
            </div>
        </div>

        <div id="dgamShipTimeContainer" style="display:none; margin-bottom: 16px;">
            <label style="display:block; margin-bottom:6px; font-weight:700; color:#475569; font-size:12.5px;">⏰ Yêu Cầu Chuẩn Giờ Hàng Ra (24h) <span style="color:var(--danger)">*</span></label>
            <div style="display:flex; align-items:center; gap:8px;">
                <input type="number" id="dgamAddShipHour" class="form-control" placeholder="Giờ" min="0" max="23" style="width:100px; text-align:center;">
                <span style="font-size:18px; font-weight:bold; color:#64748b;">:</span>
                <input type="number" id="dgamAddShipMinute" class="form-control" placeholder="Phút" min="0" max="59" style="width:100px; text-align:center;">
            </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
            <div class="form-group">
                <label>Nhà Vận Chuyển <span style="color:var(--danger)">*</span></label>
                <select id="dgamAddCarrier" class="form-control">
                    <option value="">-- Chọn nhà vận chuyển --</option>
                    ${_dgamDhtCarriers.filter(c => c.name && c.name.toLowerCase() !== 'nhà xe').map(c => `<option value="${c.name}">${c.name}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Gửi Zalo OA</label>
                <div style="border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 10px 14px; display: flex; align-items: center; gap: 8px; height: 43.5px;">
                    <input type="checkbox" id="dgamAddZaloOASent" style="width: 18px; height: 18px; accent-color: #10b981; cursor: pointer;" checked>
                    <label for="dgamAddZaloOASent" style="margin: 0 !important; font-weight: 600; color: #475569; cursor: pointer; user-select: none;">Gửi Zalo OA</label>
                </div>
            </div>
        </div>

        <div class="form-group">
            <label>📝 Nội Dung Sale Dặn Kế Toán Gửi Hàng <span style="color:var(--danger)">*</span></label>
            <textarea id="dgamAddSaleNote" class="form-control" rows="3" placeholder="Nhập nội dung dặn dò chi tiết cho kế toán khi đóng hàng/gửi hàng..." style="border:1.5px solid #f59e0b !important;"></textarea>
        </div>
    `;

    container.innerHTML = html;

    _dgam.sampleImgBase64 = null;

    let initDateStr = todayStr;
    const initialRes = _dgamValidateShipDate(initDateStr);
    if (!initialRes.valid) {
        let nextDate = new Date(d);
        for (let i = 0; i < 30; i++) {
            nextDate.setDate(nextDate.getDate() + 1);
            const ny = nextDate.getFullYear();
            const nm = String(nextDate.getMonth() + 1).padStart(2, '0');
            const nd = String(nextDate.getDate()).padStart(2, '0');
            const nextDateStr = `${ny}-${nm}-${nd}`;
            if (_dgamValidateShipDate(nextDateStr).valid) {
                initDateStr = nextDateStr;
                break;
            }
        }
    }
    const shipDateEl = document.getElementById('dgamAddShipDate');
    if (shipDateEl) shipDateEl.value = initDateStr;

    if (isGarment) {
        const depAmtField = document.getElementById('dgamAddDepositAmountField');
        if (depAmtField) depAmtField.value = (_dgam.selectedDepositAmount || 0).toLocaleString('vi-VN');
        _dgamCalcRemaining();
    }
}

function _dgamOnDraftSelect() {
    const draftId = document.getElementById('dgamAddDraftSelect').value;
    if (!draftId) {
        document.getElementById('dgamAddCustName').value = '';
        document.getElementById('dgamAddCustPhone').value = '';
        document.getElementById('dgamAddDepositCode').value = '';
        document.getElementById('dgamAddAddress').value = '';
        document.getElementById('dgamAddProvince').value = '';
        _dgam.selectedDepositAmount = 0;
        const depAmtField = document.getElementById('dgamAddDepositAmountField');
        if (depAmtField) depAmtField.value = '0';
        return;
    }
    const draft = _dgamDraftsList.find(d => d.id == draftId);
    if (draft) {
        document.getElementById('dgamAddCustName').value = draft.customer_name || '';
        document.getElementById('dgamAddCustPhone').value = draft.customer_phone || '';
        document.getElementById('dgamAddDepositCode').value = draft.deposit_code || 'Không có cọc';
        document.getElementById('dgamAddAddress').value = draft.address || '';
        document.getElementById('dgamAddProvince').value = draft.province || '';
        _dgam.selectedDepositAmount = Number(draft.deposit_amount) || 0;
        const depAmtField = document.getElementById('dgamAddDepositAmountField');
        if (depAmtField) depAmtField.value = _dgam.selectedDepositAmount.toLocaleString('vi-VN');

        const cat = document.getElementById('dgamAddCategory').value;
        if (['Gửi mẫu áo', 'Gửi mẫu quần', 'Gửi mẫu váy'].includes(cat)) {
            _dgamCalcRemaining();
        }
    }
}

function _dgamCalcRemaining() {
    const qty = Number(document.getElementById('dgamAddQuantity')?.value) || 0;
    const priceStr = document.getElementById('dgamAddPrice')?.value || '0';
    const price = Number(priceStr.replace(/\./g, '')) || 0;
    const total = qty * price;
    
    const totalEl = document.getElementById('dgamAddTotalAmount');
    if (totalEl) totalEl.value = total.toLocaleString('vi-VN');

    const remaining = total - (_dgam.selectedDepositAmount || 0);
    const remainingEl = document.getElementById('dgamAddRemainingAmount');
    if (remainingEl) remainingEl.value = remaining.toLocaleString('vi-VN');
}

async function _dgamSubmitAdd() {
    const draftId = document.getElementById('dgamAddDraftSelect').value;
    if (!draftId) {
        showToast('Vui lòng chọn Mã Đơn Áo Mẫu!', 'error');
        return;
    }
    const draft = _dgamDraftsList.find(d => d.id == draftId);
    if (!draft) return;

    const category = document.getElementById('dgamAddCategory').value;
    if (!category) {
        showToast('Vui lòng chọn Phân Loại!', 'error');
        return;
    }

    const address = document.getElementById('dgamAddAddress').value.trim();
    if (!address) {
        showToast('Vui lòng nhập Địa Chỉ!', 'error');
        return;
    }
    const province = document.getElementById('dgamAddProvince').value;
    if (!province) {
        showToast('Vui lòng chọn Tỉnh, Thành Phố!', 'error');
        return;
    }

    const zaloOASent = document.getElementById('dgamAddZaloOASent')?.checked || false;

    let body = {
        sample_order_code: draft.sample_order_code,
        customer_name: document.getElementById('dgamAddCustName').value.trim() || draft.customer_name,
        customer_phone: document.getElementById('dgamAddCustPhone').value.trim() || draft.customer_phone,
        deposit_code: document.getElementById('dgamAddDepositCode').value === 'Không có cọc' ? null : (document.getElementById('dgamAddDepositCode').value || null),
        category,
        address,
        province,
        order_date: new Date().toISOString().slice(0, 10),
        deposit_amount: _dgam.selectedDepositAmount || 0,
        zalo_oa_sent: zaloOASent
    };

    if (['Gửi mẫu áo', 'Gửi mẫu quần', 'Gửi mẫu váy'].includes(category)) {
        const linhVuc = document.getElementById('dgamAddLinhVuc').value;
        if (!linhVuc) {
            showToast('Vui lòng chọn Lĩnh Vực!', 'error');
            return;
        }

        const productName = document.getElementById('dgamAddProductName').value.trim();
        if (!productName) {
            showToast('Vui lòng nhập Tên Sản Phẩm!', 'error');
            return;
        }

        const qty = Number(document.getElementById('dgamAddQuantity').value) || 0;
        if (qty <= 0) {
            showToast('Số lượng phải lớn hơn 0!', 'error');
            return;
        }

        const priceStr = document.getElementById('dgamAddPrice').value || '0';
        const price = Number(priceStr.replace(/\./g, '')) || 0;
        const totalAmount = qty * price;
        const remainingAmount = totalAmount - (_dgam.selectedDepositAmount || 0);

        if (!_dgam.sampleImgBase64) {
            showToast('Vui lòng dán Hình Ảnh Mẫu!', 'error');
            return;
        }

        const shipDate = document.getElementById('dgamAddShipDate').value || null;
        if (!shipDate) {
            showToast('Vui lòng nhập Ngày Gửi Hàng!', 'error');
            return;
        }
        
        const shipDateRes = _dgamValidateShipDate(shipDate);
        if (!shipDateRes.valid) {
            showToast(shipDateRes.error, 'error');
            return;
        }

        const shippingPriority = document.getElementById('dgamAddShippingPriority').value;
        let shipTime = null;
        if (shippingPriority === 'CHUẨN') {
            const hrVal = document.getElementById('dgamAddShipHour')?.value || '';
            const minVal = document.getElementById('dgamAddShipMinute')?.value || '';
            if (hrVal === '' || minVal === '') {
                showToast('Vui lòng nhập Giờ và Phút Gửi Hàng cho đơn CHUẨN!', 'error');
                return;
            }
            const hrNum = parseInt(hrVal, 10);
            const minNum = parseInt(minVal, 10);
            if (isNaN(hrNum) || hrNum < 0 || hrNum > 23 || isNaN(minNum) || minNum < 0 || minNum > 59) {
                showToast('Giờ (0-23) hoặc Phút (0-59) không hợp lệ!', 'error');
                return;
            }
            shipTime = `${String(hrNum).padStart(2, '0')}:${String(minNum).padStart(2, '0')}`;
        }

        const carrier = document.getElementById('dgamAddCarrier').value;
        if (!carrier) {
            showToast('Vui lòng chọn Nhà Vận Chuyển!', 'error');
            return;
        }

        const saleNote = document.getElementById('dgamAddSaleNote').value.trim();
        if (!saleNote) {
            showToast('Vui lòng nhập Nội Dung Sale Dặn Kế Toán Gửi Hàng!', 'error');
            return;
        }

        body = {
            ...body,
            linh_vuc: linhVuc,
            product_name: productName,
            quantity: qty,
            price,
            total_amount: totalAmount,
            remaining_amount: remainingAmount,
            sample_image: _dgam.sampleImgBase64,
            ship_date: shipDate,
            ship_time: shipTime,
            shipping_priority: shippingPriority,
            shipping_method: carrier,
            sale_note_for_accountant: saleNote,
            order_status: 'cho_duyet'
        };
    } else {
        const productName = document.getElementById('dgamAddProductName').value.trim();
        if (!productName) {
            showToast('Vui lòng nhập Tên Sản Phẩm!', 'error');
            return;
        }

        if (!_dgam.sampleImgBase64) {
            showToast('Vui lòng dán Hình Ảnh Mẫu!', 'error');
            return;
        }

        const shipDate = document.getElementById('dgamAddShipDate').value || null;
        if (!shipDate) {
            showToast('Vui lòng nhập Ngày Gửi Hàng!', 'error');
            return;
        }
        
        const shipDateRes = _dgamValidateShipDate(shipDate);
        if (!shipDateRes.valid) {
            showToast(shipDateRes.error, 'error');
            return;
        }

        const shippingPriority = document.getElementById('dgamAddShippingPriority').value;
        let shipTime = null;
        if (shippingPriority === 'CHUẨN') {
            const hrVal = document.getElementById('dgamAddShipHour')?.value || '';
            const minVal = document.getElementById('dgamAddShipMinute')?.value || '';
            if (hrVal === '' || minVal === '') {
                showToast('Vui lòng nhập Giờ và Phút Gửi Hàng cho đơn CHUẨN!', 'error');
                return;
            }
            const hrNum = parseInt(hrVal, 10);
            const minNum = parseInt(minVal, 10);
            if (isNaN(hrNum) || hrNum < 0 || hrNum > 23 || isNaN(minNum) || minNum < 0 || minNum > 59) {
                showToast('Giờ (0-23) hoặc Phút (0-59) không hợp lệ!', 'error');
                return;
            }
            shipTime = `${String(hrNum).padStart(2, '0')}:${String(minNum).padStart(2, '0')}`;
        }

        const carrier = document.getElementById('dgamAddCarrier').value;
        if (!carrier) {
            showToast('Vui lòng chọn Nhà Vận Chuyển!', 'error');
            return;
        }

        const saleNote = document.getElementById('dgamAddSaleNote').value.trim();
        if (!saleNote) {
            showToast('Vui lòng nhập Nội Dung Sale Dặn Kế Toán Gửi Hàng!', 'error');
            return;
        }

        body = {
            ...body,
            linh_vuc: null,
            product_name: productName,
            quantity: 1,
            price: 0,
            total_amount: 0,
            remaining_amount: 0 - (_dgam.selectedDepositAmount || 0),
            sample_image: _dgam.sampleImgBase64,
            ship_date: shipDate,
            ship_time: shipTime,
            shipping_priority: shippingPriority,
            shipping_method: carrier,
            sale_note_for_accountant: saleNote,
            order_status: 'cho_duyet'
        };
    }

    try {
        const res = await apiCall('/api/don-gui-ao-mau', 'POST', body);
        if (res.success) {
            showToast('✅ Đã tạo đơn gửi áo mẫu thành công!');
            closeModal();
            _dgamLoadTree();
            _dgamLoadOrders();
        } else {
            showToast(res.error || 'Lỗi tạo đơn', 'error');
        }
    } catch (e) {
        showToast('Lỗi kết nối server!', 'error');
    }
}

async function _dgamShowDetail(id) {
    try {
        const data = await apiCall(`/api/don-gui-ao-mau/${id}/detail`);
        if (!data || !data.order) {
            showToast('Không tìm thấy thông tin đơn mẫu', 'error');
            return;
        }
        const o = data.order;
        const payments = data.payments || [];
        const fmt = n => Number(n || 0).toLocaleString('vi-VN');

        const titleText = `👕 Đơn Mẫu: ${o.sample_order_code} — Còn lại: ${fmt(o.remaining_amount)}đ`;

        // 1. Thao tác nhanh
        let actionsHTML = `<div style="display:flex;justify-content:space-between;align-items:center;background:#fff;border-radius:12px;border:1px solid #e2e8f0;padding:12px 16px;margin-bottom:16px;box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            <div style="display:flex;align-items:center;gap:12px;">
                <span style="font-weight:800;font-size:14px;color:var(--navy)">Trạng thái gửi Zalo:</span>
                <span style="background:#e0f2fe;color:#0369a1;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700;">📨 Luôn tự động gửi Zalo OA</span>
            </div>
            <div>
                <button class="btn btn-secondary" onclick="window.print()" style="padding:6px 16px;font-size:12px;font-weight:700;">🖨️ In Phiếu</button>
            </div>
        </div>`;

        // 2. Dòng tiền mini-bar
        let histHTML = '';
        if (o.total_amount > 0 || o.deposit_amount > 0) {
            histHTML += `<div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">`;
            histHTML += `<div style="flex:1;min-width:120px;background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:1px solid #86efac;border-radius:10px;padding:10px 12px;text-align:center">
                <div style="font-size:10px;font-weight:700;color:#059669;text-transform:uppercase;letter-spacing:0.5px">💰 Tổng Tiền Đơn</div>
                <div style="font-size:16px;font-weight:900;color:#059669;margin-top:2px">${fmt(o.total_amount)}đ</div>
            </div>`;
            histHTML += `<div style="flex:1;min-width:120px;background:linear-gradient(135deg,#eff6ff,#dbeafe);border:1px solid #93c5fd;border-radius:10px;padding:10px 12px;text-align:center">
                <div style="font-size:10px;font-weight:700;color:#1e40af;text-transform:uppercase;letter-spacing:0.5px">💳 Đặt Cọc</div>
                <div style="font-size:16px;font-weight:900;color:#1e40af;margin-top:2px">${fmt(o.deposit_amount)}đ</div>
            </div>`;
            const remainColor = o.remaining_amount > 0 ? '#dc2626' : '#059669';
            histHTML += `<div style="flex:1;min-width:120px;background:linear-gradient(135deg,#f8fafc,#f1f5f9);border:1px solid #cbd5e1;border-radius:10px;padding:10px 12px;text-align:center">
                <div style="font-size:10px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.5px">📊 Còn Lại</div>
                <div style="font-size:16px;font-weight:900;color:${remainColor};margin-top:2px">${fmt(o.remaining_amount)}đ</div>
            </div>`;
            histHTML += `</div>`;
        }

        // 3. Chi tiết sản phẩm gửi
        const typeLabels = {
            'gui_mau_ao': 'Gửi mẫu áo',
            'gui_mau_vai': 'Gửi mẫu vải',
            'gui_tem': 'Gửi Tem',
            'gui_pet': 'Gửi Pet',
            'gui_khac': 'Gửi Khác'
        };
        const categoryLabel = typeLabels[o.category] || o.category || '—';
        const linhVucBadge = o.linh_vuc ? `<span style="background:#fef3c7;color:#d97706;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;margin-right:6px">${o.linh_vuc}</span>` : '';

        let prodHTML = `<div style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;padding:16px;margin-bottom:16px;box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
            <div style="font-weight:800;font-size:14px;color:var(--navy);margin-bottom:12px">👕 Chi Tiết Sản Phẩm Gửi</div>
            <table class="table" style="width:100%;border-collapse:collapse;margin-bottom:12px;">
                <thead>
                    <tr style="background:#f8fafc;border-bottom:1.5px solid #e2e8f0">
                        <th style="padding:10px;text-align:left;font-size:11px;font-weight:700;color:#64748b">PHÂN LOẠI</th>
                        <th style="padding:10px;text-align:left;font-size:11px;font-weight:700;color:#64748b">SẢN PHẨM / NỘI DUNG</th>
                        <th style="padding:10px;text-align:center;font-size:11px;font-weight:700;color:#64748b;width:80px">SL</th>
                        <th style="padding:10px;text-align:right;font-size:11px;font-weight:700;color:#64748b;width:120px">ĐƠN GIÁ</th>
                        <th style="padding:10px;text-align:right;font-size:11px;font-weight:700;color:#64748b;width:120px">TỔNG TIỀN</th>
                    </tr>
                </thead>
                <tbody>
                    <tr style="border-bottom:1px solid #f1f5f9">
                        <td style="padding:10px;font-size:13px;font-weight:700;color:#1e293b">${categoryLabel}</td>
                        <td style="padding:10px;font-size:13px;font-weight:700;color:#1e293b">${linhVucBadge}${o.product_name || '—'}</td>
                        <td style="padding:10px;text-align:center;font-size:13px;font-weight:700;color:#1e293b">${o.quantity || 0}</td>
                        <td style="padding:10px;text-align:right;font-size:13px;font-weight:700;color:#1e293b">${fmt(o.price)}đ</td>
                        <td style="padding:10px;text-align:right;font-size:13px;font-weight:700;color:var(--success)">${fmt(o.total_amount)}đ</td>
                    </tr>
                </tbody>
            </table>`;

        if (o.sample_image) {
            prodHTML += `<div style="text-align:center;margin-top:16px;background:#f8fafc;padding:16px;border-radius:8px;border:1px dashed #cbd5e1">
                <div style="font-size:11px;font-weight:700;color:#64748b;margin-bottom:8px">🖼️ HÌNH ẢNH MẪU CHỤP</div>
                <img src="${o.sample_image}" style="max-width:240px;max-height:220px;border-radius:8px;border:1px solid #e2e8f0;cursor:pointer;object-fit:contain;box-shadow:0 4px 12px rgba(0,0,0,0.1)" onclick="window.open('${o.sample_image}', '_blank')" title="Click để xem ảnh gốc">
            </div>`;
        }
        prodHTML += `</div>`;

        // 4. Chỉ thị gửi hàng & Vận chuyển
        const priorityBg = o.shipping_priority === 'GẤP' ? '#fee2e2' : (o.shipping_priority === 'CHUẨN' ? '#dbeafe' : '#f1f5f9');
        const priorityColor = o.shipping_priority === 'GẤP' ? '#991b1b' : (o.shipping_priority === 'CHUẨN' ? '#1e40af' : '#475569');

        let saleKtHTML = `<div style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;padding:16px;margin-bottom:16px;box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
            <div style="font-weight:800;font-size:14px;color:var(--navy);margin-bottom:12px">📋 Chỉ Thị Gửi Hàng & Vận Chuyển</div>
            <div style="font-size:12px;color:#1e293b;display:grid;grid-template-columns:140px 1fr;gap:8px 12px;align-items:start">
                <span style="color:#64748b;font-weight:600">🚛 Nhà Vận Chuyển:</span>
                <span style="font-weight:700;color:#1e293b">${o.shipping_method || '—'}</span>

                <span style="color:#64748b;font-weight:600">⏰ Tiêu chuẩn gửi:</span>
                <span><span style="background:${priorityBg};color:${priorityColor};padding:2px 8px;border-radius:4px;font-size:10px;font-weight:800">${o.shipping_priority || 'CHUẨN'}</span></span>

                <span style="color:#64748b;font-weight:600">📅 Ngày gửi dự kiến:</span>
                <span style="font-weight:700">${o.ship_date ? new Date(o.ship_date).toLocaleDateString('vi-VN') : '—'}</span>

                <span style="color:#64748b;font-weight:600">⏰ Giờ gửi hàng:</span>
                <span style="font-weight:700">${o.ship_time || '—'}</span>

                <span style="color:#64748b;font-weight:600">📝 Sale dặn kế toán:</span>
                <span style="font-weight:700;color:#c2410c;white-space:pre-line">${o.sale_note_for_accountant || '—'}</span>
            </div>`;

        if (o.status_hoan_hang || o.return_shipping_fee > 0) {
            saleKtHTML += `<div style="margin-top:12px;padding-top:12px;border-top:1.5px solid #f1f5f9;font-size:12px;color:#1e293b;display:grid;grid-template-columns:140px 1fr;gap:8px 12px;align-items:start">
                <span style="color:#dc2626;font-weight:700">🔄 THÔNG TIN HOÀN HÀNG:</span>
                <span style="font-weight:700;color:#dc2626">Đã kích hoạt trạng thái Hoàn Hàng</span>

                <span style="color:#64748b;font-weight:600">💵 Cước hoàn thực tế:</span>
                <span style="font-weight:700;color:#dc2626">${fmt(o.return_shipping_fee)}đ</span>

                <span style="color:#64748b;font-weight:600">💳 Người trả ship hoàn:</span>
                <span style="font-weight:700">${o.return_payer === 'hv' ? 'HV trả' : o.return_payer === 'khach' ? 'Khách trả' : o.return_payer || '—'}</span>

                <span style="color:#64748b;font-weight:600">💳 H.thức thanh toán hoàn:</span>
                <span style="font-weight:700">${o.return_payment_method || '—'}</span>
            </div>`;
        }
        saleKtHTML += `</div>`;

        // 5. Thông tin khách hàng & Người lên đơn
        let infoHTML = `<div style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;padding:16px;margin-bottom:16px;box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
            <div style="font-weight:800;font-size:14px;color:var(--navy);margin-bottom:12px">👤 Thông Tin Đơn Hàng & Khách Hàng</div>
            <div style="font-size:12px;color:#1e293b;display:grid;grid-template-columns:140px 1fr;gap:8px 12px;align-items:start">
                <span style="color:#64748b;font-weight:600">👤 Tên Khách Hàng:</span>
                <span style="font-weight:700">${o.customer_name || '—'}</span>

                <span style="color:#64748b;font-weight:600">📞 Số Điện Thoại:</span>
                <span><a href="tel:${o.customer_phone || ''}" style="font-weight:700;color:var(--info)" onclick="event.stopPropagation()">${o.customer_phone || '—'}</a></span>

                <span style="color:#64748b;font-weight:600">📍 Địa chỉ nhận mẫu:</span>
                <span style="font-weight:700">${o.address || '—'}</span>

                <span style="color:#64748b;font-weight:600">🏙️ Tỉnh / Thành Phố:</span>
                <span style="font-weight:700">${o.province || '—'}</span>

                <span style="color:#64748b;font-weight:600">✍️ Người lên đơn:</span>
                <span style="font-weight:700">${o.created_by_name || '—'}</span>

                <span style="color:#64748b;font-weight:600">📅 Ngày lên đơn:</span>
                <span style="font-weight:700">${o.order_date ? new Date(o.order_date).toLocaleDateString('vi-VN') : '—'}</span>

                <span style="color:#64748b;font-weight:600">💳 Người trả ship:</span>
                <span style="font-weight:700">${o.payer === 'hv' ? 'HV trả' : o.payer === 'khach' ? 'Khách trả' : o.payer || '—'}</span>

                <span style="color:#64748b;font-weight:600">💵 Tiền ship dự kiến:</span>
                <span style="font-weight:700">${fmt(o.shipping_fee)}đ (${o.payment_method || '—'})</span>
            </div>
        </div>`;

        // 6. Lịch sử cọc
        let paymentHTML = `<div style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;padding:16px;margin-bottom:16px;box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
            <div style="font-weight:800;font-size:14px;color:var(--navy);margin-bottom:12px">💵 Lịch Sử Cọc / Thanh Toán</div>`;

        if (payments && payments.length > 0) {
            paymentHTML += `<table class="table" style="width:100%;border-collapse:collapse">
                <thead>
                    <tr style="background:#f8fafc;border-bottom:1.5px solid #e2e8f0">
                        <th style="padding:8px;text-align:left;font-size:11px;font-weight:700;color:#64748b">MÃ TIỀN</th>
                        <th style="padding:8px;text-align:left;font-size:11px;font-weight:700;color:#64748b">HÌNH THỨC</th>
                        <th style="padding:8px;text-align:left;font-size:11px;font-weight:700;color:#64748b">NGÂN HÀNG</th>
                        <th style="padding:8px;text-align:right;font-size:11px;font-weight:700;color:#64748b">SỐ TIỀN</th>
                        <th style="padding:8px;text-align:left;font-size:11px;font-weight:700;color:#64748b">NỘI DUNG CHUYỂN</th>
                        <th style="padding:8px;text-align:center;font-size:11px;font-weight:700;color:#64748b">NGÀY GD</th>
                    </tr>
                </thead>
                <tbody>`;
            for (const p of payments) {
                const typeLabels = { dat_coc: 'Đặt cọc', thanh_toan: 'Thanh toán' };
                const typeBadge = `<span style="background:#e0f2fe;color:#0369a1;padding:2px 6px;border-radius:4px;font-size:9px;font-weight:700;margin-left:6px">${typeLabels[p.payment_type] || p.payment_type || ''}</span>`;

                paymentHTML += `<tr style="border-bottom:1px solid #f1f5f9">
                    <td style="padding:8px;font-size:12px;font-weight:700;color:#1e293b">${p.payment_code || '—'}${typeBadge}</td>
                    <td style="padding:8px;font-size:12px;color:#1e293b">${p.payment_method || '—'}</td>
                    <td style="padding:8px;font-size:12px;color:#1e293b">${p.bank_name || '—'}</td>
                    <td style="padding:8px;font-size:12px;font-weight:700;color:#0284c7;text-align:right">${fmt(p.amount)}đ</td>
                    <td style="padding:8px;font-size:12px;color:#64748b;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${p.transfer_note || ''}">${p.transfer_note || '—'}</td>
                    <td style="padding:8px;font-size:12px;color:#1e293b;text-align:center">${p.payment_date ? new Date(p.payment_date).toLocaleDateString('vi-VN') : '—'}</td>
                </tr>`;
            }
            paymentHTML += `</tbody></table>`;
        } else {
            paymentHTML += `<div style="text-align:center;padding:12px;color:#94a3b8;font-size:12px;font-style:italic">Chưa ghi nhận giao dịch cọc nào cho đơn mẫu này</div>`;
        }
        paymentHTML += `</div>`;

        const bodyHTML = actionsHTML + histHTML + prodHTML + saleKtHTML + infoHTML + paymentHTML;
        const footerHTML = `<button class="btn btn-secondary" onclick="closeModal()" style="padding:10px 28px">Đóng</button>`;

        openModal(titleText, bodyHTML, footerHTML);

        // Widen modal
        setTimeout(() => {
            const mc = document.querySelector('.modal-content');
            if (mc) { mc.style.maxWidth = '1000px'; mc.style.width = '95vw'; }
        }, 30);
    } catch (e) {
        console.error('Error opening sample order details:', e);
        showToast('Lỗi tải chi tiết đơn mẫu', 'error');
    }
}

function _dgamShowImagePreview(src) {
    let preview = document.getElementById('dgamImagePreviewOverlay');
    if (!preview) {
        preview = document.createElement('div');
        preview.id = 'dgamImagePreviewOverlay';
        preview.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.65);z-index:99999;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity 0.2s;';
        preview.innerHTML = `
            <div style="position:relative;background:#fff;padding:8px;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,0.4);max-width:90%;max-height:90%;margin:20px;">
                <button onclick="_dgamCloseImagePreview()" style="position:absolute;top:-15px;right:-15px;width:32px;height:32px;border-radius:50%;background:#ef4444;color:#fff;border:none;font-size:16px;font-weight:bold;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.3);transition:all 0.15s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">✕</button>
                <img id="dgamImagePreviewImg" src="" style="max-width:100%;max-height:80vh;border-radius:8px;display:block;object-fit:contain;">
            </div>
        `;
        preview.onclick = function(e) {
            if (e.target === preview) _dgamCloseImagePreview();
        };
        document.body.appendChild(preview);
    }
    
    document.getElementById('dgamImagePreviewImg').src = src;
    preview.style.display = 'flex';
    setTimeout(() => { preview.style.opacity = '1'; }, 10);
}

function _dgamCloseImagePreview() {
    const preview = document.getElementById('dgamImagePreviewOverlay');
    if (preview) {
        preview.style.opacity = '0';
        setTimeout(() => { preview.style.display = 'none'; }, 200);
    }
}
