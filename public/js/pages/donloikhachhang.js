// ========== ĐƠN LỖI KHÁCH & NỘI BỘ — Bộ Phận Văn Phòng ==========
var _ceo = { items: [], tree: [], total: 0, year: null, month: null, editId: null, filter: null, allUsers: [] };
var CEO_ERR_TYPES=['Sai màu','Sai size','Sai chất liệu','Lỗi in','Lỗi may','Lỗi ép','Thiếu số lượng','Giao trễ','Sai thông tin KH','Khác'];

function renderDonloikhachhangPage(content) {
    var now = vnNow();
    _ceo.year = now.getFullYear();
    _ceo.month = now.getMonth() + 1;
    content.innerHTML = '<div id="ceoRoot" style="display:flex;gap:0;min-height:calc(100vh - 80px)">' +
        '<div id="ceoSidebar" style="width:200px;min-width:200px;background:#fff;border-right:1px solid #e5e7eb;padding:0;overflow-y:auto"></div>' +
        '<div id="ceoMain" style="flex:1;padding:0;overflow-x:auto;background:#fafbfc"></div></div>';
    _ceoLoadTree();
    _ceoLoadData();
}

// ===== SIDEBAR TREE =====
async function _ceoLoadTree() {
    try {
        var data = await apiCall('/api/customer-errors/tree');
        _ceo.tree = data.tree || [];
        _ceo.total = data.total || 0;
        _ceoRenderTree();
    } catch(e) { console.error('[CEO] Tree error:', e); }
}

function _ceoRenderTree() {
    var sb = document.getElementById('ceoSidebar');
    if (!sb) return;
    var h = '<div style="padding:12px 14px;font-size:13px;font-weight:800;color:#1e293b;border-bottom:1px solid #e5e7eb;cursor:pointer;display:flex;justify-content:space-between;align-items:center" onclick="_ceoFilterAll()">' +
        '<span>All</span><span style="background:#f59e0b;color:#fff;padding:1px 8px;border-radius:10px;font-size:11px;font-weight:700">' + _ceo.total + '</span></div>';
    // Group by year
    var years = {};
    _ceo.tree.forEach(function(r) {
        if (!years[r.year]) years[r.year] = [];
        years[r.year].push(r);
    });
    var sortedYears = Object.keys(years).sort(function(a,b){return b-a;});
    sortedYears.forEach(function(yr) {
        var months = years[yr].sort(function(a,b){return b.month-a.month;});
        var yrTotal = months.reduce(function(s,m){return s+m.count;},0);
        var isOpen = _ceo.year == yr;
        h += '<div style="border-bottom:1px solid #f1f5f9">';
        h += '<div onclick="_ceoToggleYear(this,' + yr + ')" style="padding:8px 14px;font-size:12px;font-weight:700;color:#374151;cursor:pointer;display:flex;align-items:center;gap:6px;user-select:none">' +
            '<span class="ceo-arrow" style="transition:transform .2s;transform:rotate(' + (isOpen?'90':'0') + 'deg);font-size:10px">▶</span>' +
            '<span>Năm ' + yr + '</span>' +
            '<span style="margin-left:auto;background:#e5e7eb;color:#374151;padding:1px 6px;border-radius:8px;font-size:10px;font-weight:700">' + yrTotal + '</span></div>';
        h += '<div class="ceo-months" style="display:' + (isOpen?'block':'none') + '">';
        months.forEach(function(m) {
            var isActive = _ceo.year == yr && _ceo.month == m.month;
            h += '<div onclick="_ceoFilterMonth(' + yr + ',' + m.month + ')" style="padding:6px 14px 6px 32px;font-size:12px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;' +
                (isActive ? 'background:#fff7ed;color:#ea580c;font-weight:700;border-left:3px solid #f59e0b' : 'color:#6b7280;font-weight:500') + '">' +
                '<span>Tháng ' + String(m.month).padStart(2,'0') + '</span>' +
                '<span style="background:' + (isActive?'#f59e0b':'#e5e7eb') + ';color:' + (isActive?'#fff':'#374151') + ';padding:1px 6px;border-radius:8px;font-size:10px;font-weight:700">' + m.count + '</span></div>';
        });
        h += '</div></div>';
    });
    sb.innerHTML = h;
}

function _ceoToggleYear(el, yr) {
    var months = el.nextElementSibling;
    var arrow = el.querySelector('.ceo-arrow');
    if (months.style.display === 'none') { months.style.display = 'block'; arrow.style.transform = 'rotate(90deg)'; }
    else { months.style.display = 'none'; arrow.style.transform = 'rotate(0deg)'; }
}
function _ceoFilterAll() { _ceo.year = null; _ceo.month = null; _ceoLoadData(); _ceoRenderTree(); }
function _ceoFilterMonth(yr, mo) { _ceo.year = yr; _ceo.month = mo; _ceoLoadData(); _ceoRenderTree(); }

// ===== DATA TABLE =====
async function _ceoLoadData() {
    try {
        var params = [];
        if (_ceo.year) params.push('year=' + _ceo.year);
        if (_ceo.month) params.push('month=' + _ceo.month);
        var qs = params.length ? '?' + params.join('&') : '';
        var data = await apiCall('/api/customer-errors' + qs);
        _ceo.items = data.items || [];
        _ceoRenderTable();
    } catch(e) { console.error('[CEO] Load error:', e); }
}

function _ceoRenderTable() {
    var main = document.getElementById('ceoMain');
    if (!main) return;
    var allItems = _ceo.items;
    // Apply client-side filter
    var items = allItems;
    if (_ceo.filter === 'chua_xl') items = allItems.filter(function(i){ return !i.violation_month; });
    else if (_ceo.filter === 'chua_phat') items = allItems.filter(function(i){ return !i.penalty_month; });
    else if (_ceo.filter === 'hoan_thanh') items = allItems.filter(function(i){ return i.violation_month && i.penalty_month; });
    var title = _ceo.year && _ceo.month ? 'Tháng ' + _ceo.month + '/' + _ceo.year : _ceo.year ? 'Năm ' + _ceo.year : 'Tất Cả';
    var cXL = allItems.filter(function(i){return !i.violation_month;}).length;
    var cPhat = allItems.filter(function(i){return !i.penalty_month;}).length;
    var cDone = allItems.filter(function(i){return i.violation_month && i.penalty_month;}).length;
    // Build order lists
    var xlOrders = allItems.filter(function(i){return !i.violation_month;});
    var phatOrders = allItems.filter(function(i){return !i.penalty_month;});
    var doneOrders = allItems.filter(function(i){return i.violation_month && i.penalty_month;});

    var h = '<div style="padding:12px 16px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e5e7eb;background:#fff">' +
        '<div style="font-size:14px;font-weight:800;color:#1e293b">⚠️ ĐƠN LỖI KHÁCH & NỘI BỘ — ' + title + ' <span style="color:#9ca3af;font-weight:500;font-size:12px">(' + items.length + '/' + allItems.length + ')</span></div>' +
        '<div style="display:flex;gap:8px">' +
        '<button onclick="_ceoSetFilter(null)" style="padding:8px 14px;background:' + (!_ceo.filter ? '#1e293b' : '#f1f5f9') + ';color:' + (!_ceo.filter ? '#fff' : '#64748b') + ';border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer">Tất Cả</button>' +
        '<button onclick="_ceoOpenUpdatePicker()" style="padding:8px 16px;background:linear-gradient(135deg,#3b82f6,#1d4ed8);color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer">🔄 Cập Nhật Lỗi</button>' +
        '<button onclick="_ceoOpenForm()" style="padding:8px 16px;background:linear-gradient(135deg,#f59e0b,#ea580c);color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer">+ Thêm Đơn Lỗi</button>' +
        '</div></div>';

    // === 3 STAT CARDS (filter only) ===
    h += '<div style="padding:12px 16px;display:flex;gap:12px;background:#fff;border-bottom:1px solid #e5e7eb">';
    // Card 1: Chưa Xử Lý
    h += '<div onclick="_ceoSetFilter(\'chua_xl\')" style="flex:1;padding:16px 20px;background:linear-gradient(135deg,#fef2f2,#fee2e2);border:2px solid ' + (_ceo.filter==='chua_xl'?'#dc2626':'#fecaca') + ';border-radius:12px;cursor:pointer;display:flex;align-items:center;gap:14px;transition:all .2s;user-select:none" onmouseover="this.style.boxShadow=\'0 4px 16px rgba(220,38,38,0.2)\'" onmouseout="this.style.boxShadow=\'' + (_ceo.filter==='chua_xl'?'0 4px 16px rgba(220,38,38,0.15)':'none') + '\'">';
    h += '<div style="font-size:32px">🔴</div>';
    h += '<div><div style="font-size:20px;font-weight:900;color:#dc2626">' + cXL + '</div>';
    h += '<div style="font-size:13px;font-weight:700;color:#991b1b">Chưa Xử Lý</div></div></div>';
    // Card 2: Chưa Phạt
    h += '<div onclick="_ceoSetFilter(\'chua_phat\')" style="flex:1;padding:16px 20px;background:linear-gradient(135deg,#fef3c7,#fde68a);border:2px solid ' + (_ceo.filter==='chua_phat'?'#d97706':'#fde68a') + ';border-radius:12px;cursor:pointer;display:flex;align-items:center;gap:14px;transition:all .2s;user-select:none" onmouseover="this.style.boxShadow=\'0 4px 16px rgba(217,119,6,0.2)\'" onmouseout="this.style.boxShadow=\'' + (_ceo.filter==='chua_phat'?'0 4px 16px rgba(217,119,6,0.15)':'none') + '\'">';
    h += '<div style="font-size:32px">🟡</div>';
    h += '<div><div style="font-size:20px;font-weight:900;color:#d97706">' + cPhat + '</div>';
    h += '<div style="font-size:13px;font-weight:700;color:#92400e">Chưa Phạt</div></div></div>';
    // Card 3: Hoàn Thành
    h += '<div onclick="_ceoSetFilter(\'hoan_thanh\')" style="flex:1;padding:16px 20px;background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:2px solid ' + (_ceo.filter==='hoan_thanh'?'#16a34a':'#bbf7d0') + ';border-radius:12px;cursor:pointer;display:flex;align-items:center;gap:14px;transition:all .2s;user-select:none" onmouseover="this.style.boxShadow=\'0 4px 16px rgba(22,163,74,0.2)\'" onmouseout="this.style.boxShadow=\'' + (_ceo.filter==='hoan_thanh'?'0 4px 16px rgba(22,163,74,0.15)':'none') + '\'">';
    h += '<div style="font-size:32px">🟢</div>';
    h += '<div><div style="font-size:20px;font-weight:900;color:#16a34a">' + cDone + '</div>';
    h += '<div style="font-size:13px;font-weight:700;color:#166534">Hoàn Thành</div></div></div>';
    h += '</div>';



    h += '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px;min-width:2000px">';
    h += '<thead><tr style="background:#1e3a4f;border-bottom:2px solid #0f2a3a">';
    var cols = ['Đơn Lỗi','Lỗi Thường Gặp','Ngày','Mã Đơn','SL SX','SL Lỗi','Nội Dung Lỗi','Video','Hình Ảnh','Cách Xử Lý Lỗi',
        'Chi Phí SX (Cắt/In/Ép/May)','Phí Ship (Về/Đi/Lần 3)','Xử Lý Tháng','Đã Phạt Tháng','Người Vi Phạm','Cam Kết Người Vi Phạm','Cách Khắc Phục',''];
    cols.forEach(function(c) {
        h += '<th style="padding:8px 6px;text-align:left;font-size:11px;font-weight:700;color:#ffffff;white-space:nowrap;border-right:1px solid rgba(255,255,255,0.1)">' + c + '</th>';
    });
    h += '</tr></thead><tbody>';

    if (items.length === 0) {
        h += '<tr><td colspan="18" style="padding:40px;text-align:center;color:#9ca3af">Chưa có đơn lỗi nào</td></tr>';
    } else {
        items.forEach(function(item) {
            var imgs = [];
            try { imgs = typeof item.error_images === 'string' ? JSON.parse(item.error_images || '[]') : (item.error_images || []); } catch(e) {}
            var imgHtml = imgs.length ? imgs.slice(0,3).map(function(url) {
                return '<img src="' + url + '" style="width:32px;height:32px;object-fit:cover;border-radius:4px;cursor:pointer;border:1px solid #e5e7eb" onclick="_ceoViewImage(\'' + url + '\')">';
            }).join('') + (imgs.length > 3 ? '<span style="font-size:10px;color:#9ca3af">+' + (imgs.length-3) + '</span>' : '') : '<span style="color:#d1d5db">—</span>';
            var rd = item.report_date ? new Date(item.report_date).toLocaleDateString('vi-VN') : '—';
            var fmtMoney = function(v) { return Number(v||0) > 0 ? Number(v).toLocaleString('vi-VN') : ''; };

            // Đơn Lỗi type badge
            var errorType = item.dht_order_id ? 'Khách Hàng' : 'Nội Bộ';
            var etColor = item.dht_order_id ? '#dc2626' : '#2563eb';
            var etBg = item.dht_order_id ? '#fee2e2' : '#dbeafe';

            // Video column
            var videoHtml = item.error_video ? '<a href="' + item.error_video + '" target="_blank" style="color:#2563eb;font-weight:700;font-size:11px" title="Xem video">🎬 Xem</a>' : '<span style="color:#d1d5db">—</span>';

            h += '<tr style="border-bottom:1px solid #f1f5f9;transition:background .15s;cursor:pointer" onmouseover="this.style.background=\'#fffbeb\'" onmouseout="this.style.background=\'\'" onclick="_ceoViewDetail(' + item.id + ')">';
            h += '<td style="padding:6px;white-space:nowrap;border-right:1px solid #f8fafc"><span style="padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;color:' + etColor + ';background:' + etBg + ';border:1px solid ' + etColor + '22">' + errorType + '</span></td>';
            h += '<td style="padding:6px;border-right:1px solid #f8fafc">' + (item.common_error_type || '') + '</td>';
            h += '<td style="padding:6px;white-space:nowrap;border-right:1px solid #f8fafc">' + rd + '</td>';
            h += '<td style="padding:6px;font-weight:700;color:#ea580c;white-space:nowrap;border-right:1px solid #f8fafc">' + (item.order_code || '—') + '</td>';
            h += '<td style="padding:6px;text-align:center;font-weight:700;border-right:1px solid #f8fafc">' + (Number(item.production_quantity)||'') + '</td>';
            h += '<td style="padding:6px;text-align:center;font-weight:700;color:#dc2626;border-right:1px solid #f8fafc">' + (Number(item.error_quantity)||'') + '</td>';
            h += '<td style="padding:6px;max-width:200px;overflow:hidden;text-overflow:ellipsis;border-right:1px solid #f8fafc" title="' + (item.error_content||'').replace(/"/g,'&quot;') + '">' + (item.error_content || '') + '</td>';
            h += '<td style="padding:6px;border-right:1px solid #f8fafc;text-align:center">' + videoHtml + '</td>';
            h += '<td style="padding:6px;border-right:1px solid #f8fafc"><div style="display:flex;gap:2px;align-items:center">' + imgHtml + '</div></td>';
            h += '<td style="padding:6px;border-right:1px solid #f8fafc">' + (item.sale_resolution || '') + '</td>';
            h += '<td style="padding:6px;text-align:right;border-right:1px solid #f8fafc">' + fmtMoney(item.production_cost) + '</td>';
            h += '<td style="padding:6px;text-align:right;border-right:1px solid #f8fafc">' + fmtMoney(item.shipping_cost) + '</td>';
            h += '<td style="padding:6px;border-right:1px solid #f8fafc">' + (item.violation_month || '') + '</td>';
            h += '<td style="padding:6px;border-right:1px solid #f8fafc">' + (item.penalty_month || '') + '</td>';
            h += '<td style="padding:6px;border-right:1px solid #f8fafc">' + (item.violator_name || '') + '</td>';
            h += '<td style="padding:6px;border-right:1px solid #f8fafc">' + (item.violator_commitment || '') + '</td>';
            h += '<td style="padding:6px;border-right:1px solid #f8fafc">' + (item.fix_plan || '') + '</td>';
            h += '<td style="padding:6px;white-space:nowrap"><button onclick="event.stopPropagation();_ceoOpenForm(' + item.id + ')" style="padding:3px 8px;background:#3b82f6;color:#fff;border:none;border-radius:4px;font-size:10px;cursor:pointer;margin-right:2px">✏️</button>';
            if (currentUser && ['giam_doc','quan_ly_cap_cao','quan_ly'].includes(currentUser.role)) {
                h += '<button onclick="event.stopPropagation();_ceoDelete(' + item.id + ')" style="padding:3px 8px;background:#ef4444;color:#fff;border:none;border-radius:4px;font-size:10px;cursor:pointer">🗑</button>';
            }
            h += '</td></tr>';
        });
    }
    h += '</tbody></table></div>';
    main.innerHTML = h;
}

// ===== DETAIL VIEWER =====
function _ceoViewDetail(id) {
    var item = _ceo.items.find(function(x) { return x.id === id; });
    if (!item) return;

    var rd = item.report_date ? new Date(item.report_date).toLocaleDateString('vi-VN') : '—';
    var fmtMoney = function(v) { return Number(v||0) > 0 ? Number(v).toLocaleString('vi-VN') + 'đ' : '—'; };
    var errorType = item.dht_order_id ? 'Khách Hàng' : 'Nội Bộ';
    var etColor = item.dht_order_id ? '#dc2626' : '#2563eb';
    var etBg = item.dht_order_id ? '#fee2e2' : '#dbeafe';

    // Parse images
    var imgs = [];
    try { imgs = typeof item.error_images === 'string' ? JSON.parse(item.error_images || '[]') : (item.error_images || []); } catch(e) {}
    var imgHtml = imgs.length ? imgs.map(function(url) {
        return '<img src="' + url + '" style="width:120px;height:120px;object-fit:cover;border-radius:8px;cursor:pointer;border:2px solid #e5e7eb;transition:transform .2s" onclick="_ceoViewImage(\'' + url + '\')" onmouseover="this.style.transform=\'scale(1.05)\'" onmouseout="this.style.transform=\'scale(1)\'">';
    }).join('') : '<span style="color:#9ca3af;font-style:italic">Không có hình ảnh</span>';

    // Video
    var videoHtml = item.error_video
        ? '<video controls style="max-width:100%;max-height:300px;border-radius:8px;border:2px solid #e5e7eb"><source src="' + item.error_video + '"></video>'
        : '<span style="color:#9ca3af;font-style:italic">Không có video</span>';

    // Field helper
    var field = function(label, value, color) {
        return '<div style="margin-bottom:12px">' +
            '<div style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px">' + label + '</div>' +
            '<div style="font-size:14px;font-weight:600;color:' + (color || '#1e293b') + '">' + (value || '—') + '</div>' +
            '</div>';
    };

    var ov = document.createElement('div');
    ov.id = 'ceoDetailModal';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:99998;display:flex;align-items:center;justify-content:center;padding:20px';
    ov.onclick = function(e) { if (e.target === ov) ov.remove(); };

    ov.innerHTML = '<div style="background:#fff;border-radius:16px;max-width:800px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 25px 60px rgba(0,0,0,0.3)" onclick="event.stopPropagation()">' +
        // Header
        '<div style="padding:20px 24px;background:linear-gradient(135deg,#1e3a5f,#0f2a3a);border-radius:16px 16px 0 0;display:flex;align-items:center;justify-content:space-between">' +
            '<div style="display:flex;align-items:center;gap:12px">' +
                '<span style="font-size:24px">📝</span>' +
                '<div>' +
                    '<div style="font-size:16px;font-weight:800;color:#fff">Đơn Lỗi — ' + (item.order_code || 'N/A') + '</div>' +
                    '<div style="font-size:12px;color:#94a3b8;margin-top:2px">' + rd + ' · Người tạo: ' + (item.created_by_name || '—') + '</div>' +
                '</div>' +
            '</div>' +
            '<div style="display:flex;align-items:center;gap:10px">' +
                '<span style="padding:4px 12px;border-radius:6px;font-size:11px;font-weight:700;color:' + etColor + ';background:' + etBg + ';border:1px solid ' + etColor + '33">' + errorType + '</span>' +
                '<button onclick="document.getElementById(\'ceoDetailModal\').remove()" style="background:rgba(255,255,255,0.15);border:none;color:#fff;width:32px;height:32px;border-radius:8px;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center">×</button>' +
            '</div>' +
        '</div>' +
        // Body
        '<div style="padding:24px">' +
            // Row 1: Info grid
            '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;padding:16px;background:#f8fafc;border-radius:10px;margin-bottom:20px">' +
                field('Mã Đơn', item.order_code, '#ea580c') +
                field('Lĩnh Vực', item.linh_vuc, '#7c3aed') +
                field('Lỗi Thường Gặp', item.common_error_type) +
                field('Tên Khách Hàng', item.customer_name) +
                field('CSKH', item.cskh_name) +
                field('Người Vi Phạm', item.violator_name, '#dc2626') +
            '</div>' +
            // Row 2: Quantities
            '<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:16px;margin-bottom:20px">' +
                '<div style="background:#f0fdf4;padding:14px;border-radius:10px;text-align:center;border:1px solid #bbf7d0">' +
                    '<div style="font-size:10px;font-weight:700;color:#166534;text-transform:uppercase">SL Sản Xuất</div>' +
                    '<div style="font-size:22px;font-weight:800;color:#166534;margin-top:4px">' + (Number(item.production_quantity) || 0) + '</div>' +
                '</div>' +
                '<div style="background:#fef2f2;padding:14px;border-radius:10px;text-align:center;border:1px solid #fecaca">' +
                    '<div style="font-size:10px;font-weight:700;color:#991b1b;text-transform:uppercase">SL Lỗi</div>' +
                    '<div style="font-size:22px;font-weight:800;color:#dc2626;margin-top:4px">' + (Number(item.error_quantity) || 0) + '</div>' +
                '</div>' +
                '<div style="background:#eff6ff;padding:14px;border-radius:10px;text-align:center;border:1px solid #bfdbfe">' +
                    '<div style="font-size:10px;font-weight:700;color:#1e40af;text-transform:uppercase">Chi Phí SX</div>' +
                    '<div style="font-size:16px;font-weight:800;color:#1e40af;margin-top:4px">' + fmtMoney(item.production_cost) + '</div>' +
                '</div>' +
                '<div style="background:#fefce8;padding:14px;border-radius:10px;text-align:center;border:1px solid #fde68a">' +
                    '<div style="font-size:10px;font-weight:700;color:#92400e;text-transform:uppercase">Phí Ship</div>' +
                    '<div style="font-size:16px;font-weight:800;color:#92400e;margin-top:4px">' + fmtMoney(item.shipping_cost) + '</div>' +
                '</div>' +
            '</div>' +
            // Row 3: Content
            '<div style="margin-bottom:20px">' +
                '<div style="font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">📌 Nội Dung Lỗi</div>' +
                '<div style="padding:14px;background:#fff7ed;border-radius:8px;border:1px solid #fed7aa;font-size:14px;color:#9a3412;line-height:1.6">' + (item.error_content || '—') + '</div>' +
            '</div>' +
            // Row 4: Resolution
            '<div style="margin-bottom:20px">' +
                '<div style="font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">✅ Cách Xử Lý Lỗi</div>' +
                '<div style="padding:14px;background:#f0fdf4;border-radius:8px;border:1px solid #bbf7d0;font-size:14px;color:#166534;line-height:1.6">' + (item.sale_resolution || '—') + '</div>' +
            '</div>' +
            // Row 5: Images
            '<div style="margin-bottom:20px">' +
                '<div style="font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">📷 Hình Ảnh Lỗi</div>' +
                '<div style="display:flex;gap:8px;flex-wrap:wrap">' + imgHtml + '</div>' +
            '</div>' +
            // Row 6: Video
            '<div style="margin-bottom:20px">' +
                '<div style="font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">🎬 Video Lỗi</div>' +
                videoHtml +
            '</div>' +
            // Row 7: Extra info
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:16px;background:#f8fafc;border-radius:10px">' +
                field('Xử Lý Tháng', item.violation_month) +
                field('Đã Phạt Tháng', item.penalty_month) +
                field('Cam Kết Người Vi Phạm', item.violator_commitment) +
                field('Cách Khắc Phục', item.fix_plan) +
            '</div>' +
        '</div>' +
    '</div>';

    document.body.appendChild(ov);
}

// ===== IMAGE VIEWER =====
function _ceoViewImage(url) {
    var ov = document.createElement('div');
    ov.id = 'ceoImgViewer';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:99999;display:flex;align-items:center;justify-content:center;cursor:pointer';
    ov.onclick = function() { ov.remove(); };
    ov.innerHTML = '<img src="' + url + '" style="max-width:90vw;max-height:90vh;border-radius:8px;box-shadow:0 10px 40px rgba(0,0,0,0.5)">';
    document.body.appendChild(ov);
}

// ===== CREATE/EDIT FORM =====
async function _ceoOpenForm(id) {
    _ceo.editId = id || null;
    var item = {};
    if (id) {
        try {
            var data = await apiCall('/api/customer-errors/' + id);
            item = data.item || {};
        } catch(e) {}
    }
    var imgs = [];
    try { imgs = JSON.parse(item.error_images || '[]'); } catch(e) {}
    var today = vnDateStr();

    var ov = document.createElement('div');
    ov.id = 'ceoFormOverlay';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';

    ov.innerHTML = '<div style="background:#fff;border-radius:16px;width:720px;max-width:95vw;max-height:90vh;overflow-y:auto;box-shadow:0 25px 80px rgba(0,0,0,0.3)">' +
        '<div style="background:linear-gradient(135deg,#f59e0b,#ea580c);padding:16px 20px;border-radius:16px 16px 0 0;display:flex;justify-content:space-between;align-items:center">' +
        '<h3 style="margin:0;color:#fff;font-size:16px;font-weight:800">⚠️ ' + (id ? 'Sửa Đơn Lỗi' : 'Thêm Đơn Lỗi Mới') + '</h3>' +
        '<span onclick="document.getElementById(\'ceoFormOverlay\').remove()" style="cursor:pointer;color:#fff;font-size:22px;font-weight:700;opacity:0.8">✕</span></div>' +
        '<form id="ceoForm" style="padding:20px">' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">' +
        _ceoField('Ngày Báo Cáo Lỗi *', 'ceoF_date', item.report_date ? item.report_date.split('T')[0] : today, 'date', true) +
        _ceoField('Lỗi Thường Gặp', 'ceoF_common', item.common_error_type, 'text', false) +
        '</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">' +
        _ceoField('Mã Đơn', 'ceoF_code', item.order_code, 'text', false) +
        _ceoField('CSKH (Sale/KD)', 'ceoF_cskh', item.cskh_name, 'text', false) +
        '</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">' +
        _ceoField('Số Lượng Lỗi', 'ceoF_qty', item.error_quantity, 'number', false) +
        '<div></div></div>' +
        '<div style="margin-bottom:12px">' + _ceoTextarea('Nội Dung Lỗi', 'ceoF_content', item.error_content) + '</div>' +
        '<div style="margin-bottom:12px">' + _ceoTextarea('Cách Xử Lý Lỗi Sale', 'ceoF_resolution', item.sale_resolution) + '</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">' +
        _ceoField('Người Vi Phạm', 'ceoF_violator', item.violator_name, 'text', false) +
        _ceoField('Chi Phí SX (Cắt/In/Ép/May)', 'ceoF_prodcost', item.production_cost, 'number', false) +
        '</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">' +
        _ceoField('Phí Ship (Về/Đi/Lần 3)', 'ceoF_shipcost', item.shipping_cost, 'number', false) +
        _ceoField('Xử Lý Vi Phạm Tháng Mấy?', 'ceoF_vmonth', item.violation_month, 'text', false) +
        '</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">' +
        _ceoField('Đã Trừ Phạt Tháng Mấy?', 'ceoF_pmonth', item.penalty_month, 'text', false) +
        '<div></div></div>' +
        '<div style="margin-bottom:12px">' + _ceoTextarea('Cam Kết Người Vi Phạm', 'ceoF_commit', item.violator_commitment) + '</div>' +
        '<div style="margin-bottom:12px">' + _ceoTextarea('Cách Khắc Phục Lần Sau', 'ceoF_fix', item.fix_plan) + '</div>' +
        // Image upload section
        '<div style="margin-bottom:16px"><label style="display:block;font-size:12px;font-weight:700;color:#334155;margin-bottom:6px">📷 Hình Ảnh Lỗi</label>' +
        '<div id="ceoImgPreview" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">' +
        imgs.map(function(url) {
            return '<div style="position:relative"><img src="' + url + '" style="width:60px;height:60px;object-fit:cover;border-radius:6px;border:1px solid #e5e7eb">' +
                '<span onclick="_ceoRemoveImg(this,\'' + url + '\')" style="position:absolute;top:-4px;right:-4px;background:#ef4444;color:#fff;width:16px;height:16px;border-radius:50%;font-size:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-weight:700">×</span></div>';
        }).join('') + '</div>' +
        '<input type="file" id="ceoF_images" multiple accept="image/*" style="font-size:12px"></div>' +
        '<div style="display:flex;gap:8px"><button type="submit" style="padding:10px 28px;background:linear-gradient(135deg,#f59e0b,#ea580c);color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer">' + (id ? '💾 Cập Nhật' : '✅ Tạo Mới') + '</button>' +
        '<button type="button" onclick="document.getElementById(\'ceoFormOverlay\').remove()" style="padding:10px 20px;background:#f1f5f9;color:#64748b;border:none;border-radius:10px;font-size:13px;cursor:pointer">Hủy</button></div></form></div>';

    document.body.appendChild(ov);
    document.getElementById('ceoForm').addEventListener('submit', _ceoSubmitForm);
}

function _ceoField(label, id, value, type, required) {
    return '<div><label style="display:block;font-size:12px;font-weight:700;color:#334155;margin-bottom:4px">' + label + '</label>' +
        '<input type="' + type + '" id="' + id + '" value="' + (value||'') + '" ' + (required?'required':'') +
        ' style="width:100%;padding:8px 12px;border:1.5px solid #d1d5db;border-radius:8px;font-size:13px;font-family:Inter,sans-serif" data-num-formatted="skip"></div>';
}
function _ceoTextarea(label, id, value) {
    return '<label style="display:block;font-size:12px;font-weight:700;color:#334155;margin-bottom:4px">' + label + '</label>' +
        '<textarea id="' + id + '" rows="2" style="width:100%;padding:8px 12px;border:1.5px solid #d1d5db;border-radius:8px;font-size:13px;font-family:Inter,sans-serif;resize:vertical">' + (value||'') + '</textarea>';
}

function _ceoRemoveImg(el, url) {
    el.parentElement.remove();
    // Track removed images
    if (!window._ceoRemovedImgs) window._ceoRemovedImgs = [];
    window._ceoRemovedImgs.push(url);
}

async function _ceoSubmitForm(e) {
    e.preventDefault();
    var body = {
        report_date: document.getElementById('ceoF_date').value,
        common_error_type: document.getElementById('ceoF_common').value.trim(),
        order_code: document.getElementById('ceoF_code').value.trim(),
        cskh_name: document.getElementById('ceoF_cskh').value.trim(),
        error_quantity: document.getElementById('ceoF_qty').value,
        error_content: document.getElementById('ceoF_content').value.trim(),
        sale_resolution: document.getElementById('ceoF_resolution').value.trim(),
        violator_name: document.getElementById('ceoF_violator').value.trim(),
        production_cost: document.getElementById('ceoF_prodcost').value,
        shipping_cost: document.getElementById('ceoF_shipcost').value,
        violation_month: document.getElementById('ceoF_vmonth').value.trim(),
        penalty_month: document.getElementById('ceoF_pmonth').value.trim(),
        violator_commitment: document.getElementById('ceoF_commit').value.trim(),
        fix_plan: document.getElementById('ceoF_fix').value.trim(),
        error_images: []
    };
    // Collect remaining images from preview
    var previews = document.querySelectorAll('#ceoImgPreview img');
    previews.forEach(function(img) { body.error_images.push(img.src.replace(location.origin, '')); });

    if (!body.report_date) { showToast('Vui lòng nhập ngày báo cáo lỗi', 'error'); return; }

    try {
        var result;
        if (_ceo.editId) {
            result = await apiCall('/api/customer-errors/' + _ceo.editId, 'PUT', body);
        } else {
            result = await apiCall('/api/customer-errors', 'POST', body);
        }
        if (result.error) { showToast(result.error, 'error'); return; }

        // Upload new images if any
        var fileInput = document.getElementById('ceoF_images');
        var targetId = _ceo.editId || result.id;
        if (fileInput && fileInput.files.length > 0 && targetId) {
            var fd = new FormData();
            for (var i = 0; i < fileInput.files.length; i++) fd.append('file_' + i, fileInput.files[i]);
            await fetch('/api/customer-errors/' + targetId + '/images', { method: 'POST', body: fd });
        }

        // Remove deleted images on server
        if (window._ceoRemovedImgs && window._ceoRemovedImgs.length && _ceo.editId) {
            for (var j = 0; j < window._ceoRemovedImgs.length; j++) {
                await apiCall('/api/customer-errors/' + _ceo.editId + '/images', 'DELETE', { image_url: window._ceoRemovedImgs[j] });
            }
        }
        window._ceoRemovedImgs = [];

        showToast('✅ ' + (_ceo.editId ? 'Đã cập nhật' : 'Đã tạo') + ' đơn lỗi thành công!');
        document.getElementById('ceoFormOverlay').remove();
        _ceoLoadTree();
        _ceoLoadData();
    } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
}

// ===== DELETE =====
async function _ceoDelete(id) {
    if (!confirm('Bạn có chắc muốn xóa đơn lỗi này?')) return;
    try {
        var r = await apiCall('/api/customer-errors/' + id, 'DELETE');
        if (r.error) { showToast(r.error, 'error'); return; }
        showToast('✅ Đã xóa đơn lỗi');
        _ceoLoadTree();
        _ceoLoadData();
    } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
}

// ===== FILTER =====
function _ceoSetFilter(f){_ceo.filter=(_ceo.filter===f)?null:f;_ceoRenderTable();}

// ===== UPDATE PICKER — chọn đơn chưa đầy đủ =====
function _ceoOpenUpdatePicker(){
  var incomplete=_ceo.items.filter(function(i){
    return !i.common_error_type||!i.violation_month||!i.penalty_month||!i.violator_name||!i.fix_plan||!i.violator_commitment||(!i.production_cost&&!i.shipping_cost);
  });
  var ov=document.createElement('div');ov.id='ceoPickerOv';
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:9998;display:flex;align-items:center;justify-content:center;padding:20px';
  ov.onclick=function(e){if(e.target===ov)ov.remove();};
  var h='<div style="background:#fff;border-radius:16px;width:700px;max-width:95vw;max-height:85vh;overflow-y:auto;box-shadow:0 25px 60px rgba(0,0,0,0.3)" onclick="event.stopPropagation()">';
  h+='<div style="padding:16px 20px;background:linear-gradient(135deg,#3b82f6,#1d4ed8);border-radius:16px 16px 0 0;display:flex;justify-content:space-between;align-items:center">';
  h+='<div style="color:#fff;font-size:15px;font-weight:800">🔄 Chọn Đơn Cần Cập Nhật</div>';
  h+='<span onclick="document.getElementById(\'ceoPickerOv\').remove()" style="color:#fff;font-size:20px;cursor:pointer;opacity:0.8">✕</span></div>';
  h+='<div style="padding:16px">';
  if(!incomplete.length){
    h+='<div style="padding:30px;text-align:center;color:#16a34a;font-weight:700">✅ Tất cả đơn đã cập nhật đầy đủ!</div>';
  }else{
    h+='<div style="font-size:12px;color:#6b7280;margin-bottom:10px">Có <b style="color:#dc2626">'+incomplete.length+'</b> đơn chưa đầy đủ thông tin:</div>';
    h+='<div style="display:flex;flex-direction:column;gap:6px">';
    incomplete.forEach(function(item){
      var rd=item.report_date?new Date(item.report_date).toLocaleDateString('vi-VN'):'';
      var missing=[];
      if(!item.common_error_type)missing.push('Loại Lỗi');
      if(!item.production_cost)missing.push('Chi Phí SX');
      if(!item.shipping_cost)missing.push('Phí Ship');
      if(!item.violation_month)missing.push('XL Tháng');
      if(!item.penalty_month)missing.push('Phạt Tháng');
      if(!item.violator_name)missing.push('Người VP');
      if(!item.violator_commitment)missing.push('Cam Kết');
      if(!item.fix_plan)missing.push('Khắc Phục');
      h+='<div onclick="document.getElementById(\'ceoPickerOv\').remove();_ceoOpenUpdateModal('+item.id+')" style="padding:10px 14px;border:1px solid #e5e7eb;border-radius:8px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;transition:all .15s" onmouseover="this.style.background=\'#eff6ff\';this.style.borderColor=\'#3b82f6\'" onmouseout="this.style.background=\'\';this.style.borderColor=\'#e5e7eb\'">';
      h+='<div><span style="font-weight:700;color:#ea580c">'+(item.order_code||'#'+item.id)+'</span> <span style="color:#9ca3af;font-size:11px">'+rd+'</span>';
      h+='<div style="font-size:10px;color:#dc2626;margin-top:2px">Thiếu: '+missing.join(', ')+'</div></div>';
      h+='<span style="font-size:16px">→</span></div>';
    });
    h+='</div>';
  }
  h+='</div></div>';
  ov.innerHTML=h;document.body.appendChild(ov);
}

// ===== UPDATE MODAL — cập nhật thông tin lỗi =====
async function _ceoOpenUpdateModal(id){
  var item=_ceo.items.find(function(x){return x.id===id;});
  if(!item){try{var d=await apiCall('/api/customer-errors/'+id);item=d.item;}catch(e){}}
  if(!item){showToast('Không tìm thấy đơn lỗi','error');return;}
  // Load users
  if(!_ceo.allUsers.length){try{var ud=await apiCall('/api/users');_ceo.allUsers=ud.users||ud||[];}catch(e){}}
  var ov=document.createElement('div');ov.id='ceoUpdateOv';
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
  var h='<div style="background:#fff;border-radius:16px;width:650px;max-width:95vw;max-height:90vh;overflow-y:auto;box-shadow:0 25px 60px rgba(0,0,0,0.3)" onclick="event.stopPropagation()">';
  h+='<div style="padding:16px 20px;background:linear-gradient(135deg,#3b82f6,#1d4ed8);border-radius:16px 16px 0 0;display:flex;justify-content:space-between;align-items:center">';
  h+='<div><div style="color:#fff;font-size:15px;font-weight:800">🔄 Cập Nhật Lỗi — '+(item.order_code||'#'+item.id)+'</div>';
  h+='<div style="color:#93c5fd;font-size:11px;margin-top:2px">Nội dung: '+(item.error_content||'').substring(0,60)+'</div></div>';
  h+='<span onclick="document.getElementById(\'ceoUpdateOv\').remove()" style="color:#fff;font-size:20px;cursor:pointer;opacity:0.8">✕</span></div>';
  h+='<div style="padding:20px">';
  // Lỗi Thường Gặp
  h+='<div style="margin-bottom:14px"><label style="display:block;font-size:12px;font-weight:700;color:#334155;margin-bottom:4px">Lỗi Thường Gặp</label>';
  h+='<select id="ceoU_errtype" style="width:100%;padding:8px 12px;border:1.5px solid #d1d5db;border-radius:8px;font-size:13px">';
  h+='<option value="">-- Chọn loại lỗi --</option>';
  CEO_ERR_TYPES.forEach(function(t){h+='<option value="'+t+'"'+(item.common_error_type===t?' selected':'')+'>'+t+'</option>';});
  h+='</select></div>';
  // Chi Phí SX + Phí Ship
  h+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">';
  h+='<div><label style="display:block;font-size:12px;font-weight:700;color:#334155;margin-bottom:4px">Chi Phí SX (Cắt/In/Ép/May)</label>';
  h+='<div style="position:relative"><input type="text" id="ceoU_prodcost" value="'+(Number(item.production_cost)||'')+'" placeholder="0" style="width:100%;padding:8px 30px 8px 12px;border:1.5px solid #d1d5db;border-radius:8px;font-size:13px" oninput="_ceoFmtMoney(this)" data-num-formatted="skip"><span style="position:absolute;right:10px;top:50%;transform:translateY(-50%);color:#9ca3af;font-size:12px;font-weight:700">đ</span></div></div>';
  h+='<div><label style="display:block;font-size:12px;font-weight:700;color:#334155;margin-bottom:4px">Phí Ship (Về/Đi/Lần 3)</label>';
  h+='<div style="position:relative"><input type="text" id="ceoU_shipcost" value="'+(Number(item.shipping_cost)||'')+'" placeholder="0" style="width:100%;padding:8px 30px 8px 12px;border:1.5px solid #d1d5db;border-radius:8px;font-size:13px" oninput="_ceoFmtMoney(this)" data-num-formatted="skip"><span style="position:absolute;right:10px;top:50%;transform:translateY(-50%);color:#9ca3af;font-size:12px;font-weight:700">đ</span></div></div>';
  h+='</div>';
  // XL Tháng + Phạt Tháng
  h+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">';
  h+='<div><label style="display:block;font-size:12px;font-weight:700;color:#334155;margin-bottom:4px">Xử Lý Tháng</label>';
  h+='<select id="ceoU_vmonth" style="width:100%;padding:8px 12px;border:1.5px solid #d1d5db;border-radius:8px;font-size:13px"><option value="">-- Chọn tháng --</option>';
  for(var i=1;i<=12;i++){h+='<option value="Tháng '+String(i).padStart(2,'0')+'"'+(item.violation_month===('Tháng '+String(i).padStart(2,'0'))?' selected':'')+'>Tháng '+String(i).padStart(2,'0')+'</option>';}
  h+='</select></div>';
  h+='<div><label style="display:block;font-size:12px;font-weight:700;color:#334155;margin-bottom:4px">Đã Phạt Tháng</label>';
  h+='<select id="ceoU_pmonth" style="width:100%;padding:8px 12px;border:1.5px solid #d1d5db;border-radius:8px;font-size:13px"><option value="">-- Chọn tháng --</option>';
  for(var j=1;j<=12;j++){h+='<option value="Tháng '+String(j).padStart(2,'0')+'"'+(item.penalty_month===('Tháng '+String(j).padStart(2,'0'))?' selected':'')+'>Tháng '+String(j).padStart(2,'0')+'</option>';}
  h+='</select></div></div>';
  // Người Vi Phạm — searchable dropdown
  h+='<div style="margin-bottom:14px"><label style="display:block;font-size:12px;font-weight:700;color:#334155;margin-bottom:4px">Người Vi Phạm</label>';
  h+='<input type="text" id="ceoU_violator_search" value="'+(item.violator_name||'')+'" placeholder="Tìm nhân viên..." oninput="_ceoFilterUsers()" onfocus="_ceoFilterUsers()" style="width:100%;padding:8px 12px;border:1.5px solid #d1d5db;border-radius:8px;font-size:13px" autocomplete="off">';
  h+='<div id="ceoU_userDropdown" style="display:none;max-height:150px;overflow-y:auto;border:1px solid #d1d5db;border-radius:8px;margin-top:4px;background:#fff;box-shadow:0 4px 12px rgba(0,0,0,0.1)"></div></div>';
  // Cam Kết NV Vi Phạm — auto-numbered textarea
  h+='<div style="margin-bottom:14px"><label style="display:block;font-size:12px;font-weight:700;color:#334155;margin-bottom:4px">Cam Kết Người Vi Phạm <span style="color:#9ca3af;font-size:10px">(Enter = thêm dòng mới có số)</span></label>';
  h+='<textarea id="ceoU_commit" rows="4" onkeydown="_ceoAutoNumber(event,this)" style="width:100%;padding:8px 12px;border:1.5px solid #d1d5db;border-radius:8px;font-size:13px;resize:vertical;line-height:1.6">'+(item.violator_commitment||'1. ')+'</textarea></div>';
  // Cách Khắc Phục — auto-numbered textarea
  h+='<div style="margin-bottom:16px"><label style="display:block;font-size:12px;font-weight:700;color:#334155;margin-bottom:4px">Cách Khắc Phục <span style="color:#9ca3af;font-size:10px">(Enter = thêm dòng mới có số)</span></label>';
  h+='<textarea id="ceoU_fix" rows="4" onkeydown="_ceoAutoNumber(event,this)" style="width:100%;padding:8px 12px;border:1.5px solid #d1d5db;border-radius:8px;font-size:13px;resize:vertical;line-height:1.6">'+(item.fix_plan||'1. ')+'</textarea></div>';
  // Buttons
  h+='<div style="display:flex;gap:8px"><button onclick="_ceoSubmitUpdate('+item.id+')" style="padding:10px 28px;background:linear-gradient(135deg,#3b82f6,#1d4ed8);color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer">💾 Lưu Cập Nhật</button>';
  h+='<button onclick="document.getElementById(\'ceoUpdateOv\').remove()" style="padding:10px 20px;background:#f1f5f9;color:#64748b;border:none;border-radius:10px;font-size:13px;cursor:pointer">Hủy</button></div>';
  h+='</div></div>';
  ov.innerHTML=h;document.body.appendChild(ov);
  // Close on overlay click
  ov.onclick=function(e){if(e.target===ov)ov.remove();};
}

// ===== AUTO-NUMBER TEXTAREA =====
function _ceoAutoNumber(e,ta){
  if(e.key!=='Enter')return;
  e.preventDefault();
  var val=ta.value;var pos=ta.selectionStart;
  var before=val.substring(0,pos);var after=val.substring(pos);
  var lines=before.split('\n');var lastLine=lines[lines.length-1];
  var match=lastLine.match(/^(\d+)\.\s/);
  var nextNum=match?parseInt(match[1])+1:lines.length+1;
  var insert='\n'+nextNum+'. ';
  ta.value=before+insert+after;
  ta.selectionStart=ta.selectionEnd=pos+insert.length;
}

// ===== SEARCHABLE USER DROPDOWN =====
function _ceoFilterUsers(){
  var input=document.getElementById('ceoU_violator_search');
  var dd=document.getElementById('ceoU_userDropdown');
  if(!input||!dd)return;
  var q=input.value.toLowerCase().trim();
  var filtered=_ceo.allUsers.filter(function(u){return u.full_name&&u.full_name.toLowerCase().indexOf(q)>=0;});
  if(!filtered.length||!q){dd.style.display='none';return;}
  dd.style.display='block';
  var h='';
  filtered.slice(0,10).forEach(function(u){
    h+='<div onclick="_ceoSelectUser(\''+u.full_name.replace(/'/g,"\\'")+'\')" style="padding:8px 12px;cursor:pointer;font-size:12px;border-bottom:1px solid #f1f5f9;transition:background .1s" onmouseover="this.style.background=\'#eff6ff\'" onmouseout="this.style.background=\'\'"><span style="font-weight:700">'+u.full_name+'</span> <span style="color:#9ca3af;font-size:10px">'+(u.role||'')+'</span></div>';
  });
  dd.innerHTML=h;
}
function _ceoSelectUser(name){
  document.getElementById('ceoU_violator_search').value=name;
  document.getElementById('ceoU_userDropdown').style.display='none';
}
// Hide dropdown on outside click
document.addEventListener('click',function(e){var dd=document.getElementById('ceoU_userDropdown');if(dd&&!e.target.closest('#ceoU_violator_search')&&!e.target.closest('#ceoU_userDropdown'))dd.style.display='none';});

// ===== FORMAT MONEY =====
function _ceoFmtMoney(el){
  var v=el.value.replace(/[^\d]/g,'');
  el.value=v?Number(v).toLocaleString('vi-VN'):'';}

// ===== SUBMIT UPDATE =====
async function _ceoSubmitUpdate(id){
  var fields={
    common_error_type:document.getElementById('ceoU_errtype').value,
    production_cost:Number((document.getElementById('ceoU_prodcost').value||'0').replace(/[^\d]/g,''))||0,
    shipping_cost:Number((document.getElementById('ceoU_shipcost').value||'0').replace(/[^\d]/g,''))||0,
    violation_month:document.getElementById('ceoU_vmonth').value,
    penalty_month:document.getElementById('ceoU_pmonth').value,
    violator_name:document.getElementById('ceoU_violator_search').value.trim(),
    violator_commitment:document.getElementById('ceoU_commit').value.trim(),
    fix_plan:document.getElementById('ceoU_fix').value.trim()
  };
  try{
    var keys=Object.keys(fields);
    for(var i=0;i<keys.length;i++){
      var k=keys[i],v=fields[k];
      if(v!==''&&v!==0&&v!==null){
        await apiCall('/api/customer-errors/'+id+'/field','PATCH',{field:k,value:v});
      }
    }
    showToast('✅ Đã cập nhật lỗi thành công!');
    document.getElementById('ceoUpdateOv').remove();
    _ceoLoadTree();_ceoLoadData();
  }catch(e){showToast('Lỗi: '+e.message,'error');}
}


// ===== CARD CLICK = FILTER + TOGGLE =====
function _ceoCardClick(filterName, dropId){
  _ceo.filter = (_ceo.filter === filterName) ? null : filterName;
  _ceoRenderTable();
  if (_ceo.filter === filterName) {
    var dd = document.getElementById(dropId);
    if (dd) dd.style.display = "block";
  }
}
function _ceoToggleCardDrop(id){
  var dd=document.getElementById(id);if(!dd)return;
  var allDrops=['ceoDropXL','ceoDropPhat','ceoDropDone'];
  allDrops.forEach(function(d){if(d!==id){var el=document.getElementById(d);if(el)el.style.display='none';}});
  dd.style.display=dd.style.display==='none'?'block':'none';
}
document.addEventListener("click",function(e){
  if(!e.target.closest('#ceoCardXL')&&!e.target.closest('#ceoCardPhat')&&!e.target.closest('#ceoCardDone')){
    var d1=document.getElementById('ceoDropXL'),d2=document.getElementById('ceoDropPhat'),d3=document.getElementById('ceoDropDone');
    if(d1)d1.style.display='none';if(d2)d2.style.display='none';if(d3)d3.style.display='none';
  }
});
