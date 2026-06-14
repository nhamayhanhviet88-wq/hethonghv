// ========== ĐƠN HÀNG TỔNG — Bộ Phận Văn Phòng ==========
var _dht = { tree: [], categories: [], staff: [], orders: [], filter: {}, activeFilters: {}, sortCol: null, sortDir: null, page: 1, pageSize: 100 };
function _dhtFmt(n) { return Number(n||0).toLocaleString('vi-VN') + 'đ'; }
function _dhtFmtCount(n) { return Number(n||0).toLocaleString('vi-VN') + ' đơn'; }

function formatDetailedQuantity(items, totalQuantity, orderCode) {
    if (!items || !Array.isArray(items) || items.length === 0) {
        return totalQuantity || 0;
    }

    const code = (orderCode || '').toUpperCase();
    const isPetTem = code.indexOf('GCPET') >= 0 || code.indexOf('GCTEM') >= 0 || 
                     code.indexOf('SUAGCPET') >= 0 || code.indexOf('SUAGCTEM') >= 0 || 
                     code.indexOf('SUAPET') >= 0 || code.indexOf('SUATEM') >= 0 || 
                     code.indexOf('PET') >= 0 || code.indexOf('TEM') >= 0;

    const parts = items.map(item => {
        const qty = Number(item.quantity) || 0;
        if (qty <= 0) return null;

        // Skip "Thiết Kế"
        const nameLower = (item.product_name || item.description || '').toLowerCase();
        if (nameLower.indexOf('thiết kế') >= 0 || nameLower.indexOf('thiet ke') >= 0) {
            return null;
        }
        if (item.cutting_category_name === 'Thiết Kế') {
            return null;
        }

        if (isPetTem) {
            const prod = (item.product_name || item.description || '').toLowerCase();
            if (prod.indexOf('tờ') >= 0 || prod.indexOf('to') >= 0) {
                return `<span style="color:#d97706;font-weight:800;">${qty} Tờ</span>`; // Amber/Orange for Tờ
            }
            if (prod.indexOf('mét') >= 0 || prod.indexOf('met') >= 0) {
                return `<span style="color:#059669;font-weight:800;">${qty} Mét</span>`; // Green for Mét
            }
            const name = item.product_name || item.description || '';
            const shortName = name.length > 12 ? name.slice(0, 10) + '..' : name;
            return shortName ? `<span style="color:#475569;font-weight:800;">${qty} ${shortName}</span>` : `<span style="color:#475569;font-weight:800;">${qty}</span>`;
        } else {
            let cat = item.cutting_category_name;
            if (!cat) {
                const descLower = (item.product_name || item.description || '').toLowerCase();
                if (descLower.includes('áo gió')) cat = 'Áo Gió';
                else if (descLower.includes('áo')) cat = 'Áo';
                else if (descLower.includes('quần')) cat = 'Quần';
                else if (descLower.includes('váy')) cat = 'Váy';
                else if (descLower.includes('tạp dề')) cat = 'Tạp Dề';
                else if (descLower.includes('túi')) cat = 'Túi';
            }
            if (cat) {
                return `<span style="color:#4f46e5;font-weight:800;">${qty} ${cat}</span>`; // Indigo for garments
            }
            const name = item.product_name || item.description || '';
            const shortName = name.length > 12 ? name.slice(0, 10) + '..' : name;
            return shortName ? `<span style="color:#475569;font-weight:800;">${qty} ${shortName}</span>` : `<span style="color:#475569;font-weight:800;">${qty}</span>`;
        }
    }).filter(Boolean);

    if (parts.length === 0) {
        return totalQuantity || 0;
    }

    return parts.join(' , ');
}

function formatCurrentStep(stepName, doneCount, totalCount, orderCode, categoryName, isShipped) {
    const code = (orderCode || '').toUpperCase();
    const cat = (categoryName || '').toUpperCase();
    const isPetTem = cat === 'PET' || cat === 'TEM' ||
                     code.includes('PET') || code.includes('TEM');

    if (isPetTem) {
        if (isShipped) {
            return '<span style="color:#059669;font-weight:800;font-size:10px;">✅ Gửi Hàng</span>';
        }
        if (stepName === 'Kế toán gửi hàng') {
            return '<span style="color:#2563eb;font-weight:800;font-size:10px;">Kế Toán Gửi Hàng</span>';
        }
        return '<span style="color:#ea580c;font-weight:800;font-size:10px;">Chờ In</span>';
    }

    if (totalCount > 0 && doneCount >= totalCount) {
        return '<span style="color:#059669;font-weight:800;font-size:10px;">✅ XONG</span>';
    }
    if (!stepName) {
        return '<span style="color:#64748b;font-weight:700;font-size:10px;">Chờ SX</span>';
    }

    let displayName = stepName;
    if (stepName === 'Chuẩn Bị QLX') {
        displayName = isPetTem ? 'Gọi Vật Liệu' : 'Gọi Vải';
    } else if (stepName === 'Kiểm Tra Chất Lượng') {
        displayName = 'Kiểm Tra';
    } else if (stepName === 'Cắt Chi & Hoàn Thiện') {
        displayName = 'Hoàn Thiện';
    }

    const colors = {
        'Gọi Vải': '#64748b',
        'Gọi Vật Liệu': '#64748b',
        'Cắt': '#0891b2',
        'In': '#2563eb',
        'Ép': '#d97706',
        'May': '#c026d3',
        'Kiểm Tra': '#0d9488',
        'Hoàn Thiện': '#ea580c'
    };
    const color = colors[displayName] || '#4f46e5';

    return `<span style="color:${color};font-weight:800;font-size:10px;">${displayName}</span>`;
}

// ========== FILTER CHIPS ==========
var _dhtFilterDefs = [
    { key: 'vat',  label: 'VAT',         bg: '#fef3c7', color: '#92400e', activeBg: '#f59e0b', activeColor: '#fff' },
    { key: 'gg',   label: 'Giảm Giá',    bg: '#d1fae5', color: '#065f46', activeBg: '#059669', activeColor: '#fff' },
    { key: 'za',   label: 'Đã Zalo',     bg: '#dbeafe', color: '#1e40af', activeBg: '#2563eb', activeColor: '#fff' },
    { key: 'noza', label: 'Chưa Zalo',   bg: '#f1f5f9', color: '#64748b', activeBg: '#475569', activeColor: '#fff' },
    { key: 'loi',  label: 'Báo Lỗi',     bg: '#fee2e2', color: '#dc2626', activeBg: '#dc2626', activeColor: '#fff' },
    { key: 'sua',  label: 'Lên Đơn Sửa', bg: '#ede9fe', color: '#6d28d9', activeBg: '#7c3aed', activeColor: '#fff' },
    { key: 'no',   label: 'Còn Nợ',      bg: '#ffedd5', color: '#c2410c', activeBg: '#ea580c', activeColor: '#fff' }
];

function _dhtRenderFilterChips() {
    var el = document.getElementById('dhtFilterChips'); if (!el) return;
    var af = _dht.activeFilters || {};
    var anyActive = Object.values(af).some(function(v){ return v; });
    el.innerHTML = _dhtFilterDefs.map(function(f) {
        var active = af[f.key];
        var bg = active ? f.activeBg : f.bg;
        var clr = active ? f.activeColor : f.color;
        var border = active ? 'border:1.5px solid ' + f.activeBg : 'border:1px solid ' + f.color + '33';
        var shadow = active ? 'box-shadow:0 2px 6px ' + f.activeBg + '40;' : '';
        return '<button onclick="_dhtToggleFilter(\'' + f.key + '\')" style="'
            + 'background:' + bg + ';color:' + clr + ';' + border + ';'
            + 'padding:4px 12px;border-radius:20px;font-size:10px;font-weight:700;cursor:pointer;'
            + 'transition:all .15s;' + shadow + '">'
            + (active ? '✓ ' : '') + f.label + '</button>';
    }).join('')
    + (anyActive ? ' <button onclick="_dhtClearFilters()" style="background:none;border:1px solid #e2e8f0;color:#94a3b8;padding:4px 10px;border-radius:20px;font-size:10px;cursor:pointer;font-weight:600">✕ Xóa lọc</button>' : '');
}

function _dhtToggleFilter(key) {
    _dht.activeFilters = _dht.activeFilters || {};
    // Mutually exclusive: za & noza
    if (key === 'za' && _dht.activeFilters.noza) _dht.activeFilters.noza = false;
    if (key === 'noza' && _dht.activeFilters.za) _dht.activeFilters.za = false;
    _dht.activeFilters[key] = !_dht.activeFilters[key];
    // Show discount popup when activating 'gg'
    if (key === 'gg' && _dht.activeFilters.gg) _dhtShowDiscountPopup();
    _dht.page = 1;
    _dhtRenderTable();
}

function _dhtShowDiscountPopup() {
    var orders = (_dht.orders || []).filter(function(o) { return Number(o.discount_amount) > 0; });
    var fmt = function(n) { return Number(n||0).toLocaleString('vi-VN'); };
    var totalDiscount = orders.reduce(function(s, o) { return s + (Number(o.discount_amount)||0); }, 0);
    var rows = orders.map(function(o, i) {
        return '<tr style="'+(i%2===0?'':'background:#f0fdf4')+'">'
            +'<td style="padding:8px 12px;font-size:12px">'+(i+1)+'</td>'
            +'<td style="padding:8px 12px;font-weight:700;font-size:12px;color:#1e293b">'+o.order_code+'</td>'
            +'<td style="padding:8px 12px;font-size:12px">'+( o.customer_name||'—')+'</td>'
            +'<td style="padding:8px 12px;text-align:right;font-size:12px">'+fmt(o.total_amount)+'đ</td>'
            +'<td style="padding:8px 12px;text-align:right;font-weight:900;font-size:13px;color:#059669">-'+fmt(o.discount_amount)+'đ</td>'
            +'</tr>';
    }).join('');
    if (orders.length === 0) {
        rows = '<tr><td colspan="5" style="text-align:center;padding:30px;color:#94a3b8;font-style:italic">Không có đơn giảm giá</td></tr>';
    }
    var body = '<div style="max-height:60vh;overflow-y:auto">'
        +'<div style="display:flex;justify-content:center;margin-bottom:16px"><div style="background:linear-gradient(135deg,#059669,#10b981);color:#fff;padding:12px 28px;border-radius:12px;text-align:center;box-shadow:0 4px 15px #05966940">'
        +'<div style="font-size:10px;font-weight:600;opacity:0.85;letter-spacing:1px;margin-bottom:4px">💰 TỔNG GIẢM GIÁ</div>'
        +'<div style="font-size:22px;font-weight:900">-'+fmt(totalDiscount)+'đ</div>'
        +'</div></div>'
        +'<table style="width:100%;border-collapse:collapse">'
        +'<thead><tr style="background:#065f46;color:#fff"><th style="padding:8px 12px;font-size:10px;text-align:left">#</th><th style="padding:8px 12px;font-size:10px;text-align:left">MÃ ĐƠN</th><th style="padding:8px 12px;font-size:10px;text-align:left">KHÁCH HÀNG</th><th style="padding:8px 12px;font-size:10px;text-align:right">TỔNG TIỀN</th><th style="padding:8px 12px;font-size:10px;text-align:right">GIẢM GIÁ</th></tr></thead>'
        +'<tbody>'+rows+'</tbody>'
        +'</table></div>';
    var footer = '<button class="btn btn-secondary" onclick="closeModal()" style="padding:8px 24px">Đóng</button>';
    openModal('🏷️ Chi Tiết Giảm Giá — ' + orders.length + ' đơn', body, footer);
}

function _dhtClearFilters() {
    _dht.activeFilters = {};
    _dhtRenderTable();
}

// ========== DATE FILTER ==========
function _dhtDateFilterToday() {
    var d = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
    _dht.filter.year = d.getFullYear();
    _dht.filter.month = d.getMonth()+1;
    _dht.filter.day = d.getDate();
    _dhtSyncDateInputs();
    _dhtLoadOrders();
}
function _dhtDateFilterMonth(offset) {
    var d = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
    d.setMonth(d.getMonth() + (offset || 0));
    _dht.filter.year = d.getFullYear();
    _dht.filter.month = d.getMonth()+1;
    delete _dht.filter.day;
    _dhtSyncDateInputs();
    _dhtLoadOrders();
}
function _dhtDateFilterMonthPick() {
    var v = document.getElementById('dhtMonthPick')?.value;
    if (!v) return;
    var parts = v.split('-');
    _dht.filter.year = Number(parts[0]);
    _dht.filter.month = Number(parts[1]);
    delete _dht.filter.day;
    _dhtSyncDateInputs();
    _dhtLoadOrders();
}
function _dhtDateFilterYear() {
    var v = document.getElementById('dhtYearPick')?.value;
    if (!v) return;
    _dht.filter.year = Number(v);
    delete _dht.filter.month;
    delete _dht.filter.day;
    _dhtSyncDateInputs();
    _dhtLoadOrders();
}
function _dhtDateFilterCskh() {
    var v = document.getElementById('dhtCskhPick')?.value;
    _dht.cskhFilter = v ? Number(v) : null;
    _dhtRenderTable();
}
function _dhtDateFilterClear() {
    _dht.filter = {};
    _dht.cskhFilter = null;
    var mp = document.getElementById('dhtMonthPick'); if(mp) mp.value = '';
    var yp = document.getElementById('dhtYearPick'); if(yp) yp.value = '';
    var cp = document.getElementById('dhtCskhPick'); if(cp) cp.value = '';
    _dhtLoadOrders();
}
function _dhtSyncDateInputs() {
    var mp = document.getElementById('dhtMonthPick');
    var yp = document.getElementById('dhtYearPick');
    if (mp && _dht.filter.year && _dht.filter.month) {
        mp.value = _dht.filter.year + '-' + String(_dht.filter.month).padStart(2,'0');
    } else if (mp) { mp.value = ''; }
    if (yp && _dht.filter.year && !_dht.filter.month) {
        yp.value = String(_dht.filter.year);
    } else if (yp) { yp.value = ''; }
}
function _dhtPopulateCskhDropdown() {
    var sel = document.getElementById('dhtCskhPick'); if (!sel) return;
    var curVal = sel.value;
    var map = {};
    (_dht.orders || []).forEach(function(o) {
        if (o.cskh_user_id && o.cskh_name) map[o.cskh_user_id] = o.cskh_name;
    });
    var keys = Object.keys(map).sort(function(a,b){ return map[a].localeCompare(map[b], 'vi'); });
    var opts = '<option value="">Tất cả</option>';
    keys.forEach(function(k){ opts += '<option value="'+k+'">'+map[k]+'</option>'; });
    sel.innerHTML = opts;
    if (curVal) sel.value = curVal;
}

// ========== SORT DEFINITIONS ==========
var _dhtSortDefs = [
    { key: 'category_name',    label: 'Lĩnh Vực',      type: 'text' },
    { key: 'order_date',       label: 'Ngày LĐ',       type: 'date' },
    { key: 'shipped_at',       label: '🚛Ngày Gửi',    type: 'date' },
    { key: null,               label: 'Tiến Độ',        type: 'none' },
    { key: 'remaining_amount', label: 'Còn Lại',        type: 'num' },
    { key: 'order_code',       label: 'Mã Đơn',        type: 'text' },
    { key: 'customer_name',    label: 'Tên Khách',      type: 'text' },
    { key: 'customer_phone',   label: 'SĐT',            type: 'text' },
    { key: 'province',         label: 'Thành Phố',      type: 'text' },
    { key: 'cskh_name',        label: 'CSKH',           type: 'text' },
    { key: 'source',           label: 'Nguồn',          type: 'text' },
    { key: 'total_quantity',   label: 'Tổng SL',        type: 'num' },
    { key: 'discount_amount',  label: 'Ưu Đãi',        type: 'num' },
    { key: 'deposit_amount',   label: 'Đặt Cọc',       type: 'num' },
    { key: 'shipping_priority',label: 'TC Gửi',         type: 'text' },
    { key: 'last_updated_at',  label: 'Lịch Sử CN',    type: 'date' },
    { key: null,               label: '',                type: 'none' }
];

function _dhtSortCol(key) {
    if (_dht.sortCol === key) {
        // Cycle: asc → desc → none
        if (_dht.sortDir === 'asc') { _dht.sortDir = 'desc'; }
        else { _dht.sortCol = null; _dht.sortDir = null; }
    } else {
        _dht.sortCol = key;
        _dht.sortDir = 'asc';
    }
    _dhtRenderTable();
}

function _dhtRenderTable() {
    // Re-render from cached data without API call
    _dhtRenderFilterChips();
    var filtered = _dht.orders.slice();
    var af = _dht.activeFilters || {};
    if (af.vat) filtered = filtered.filter(function(o){ return o.has_vat; });
    if (af.gg) filtered = filtered.filter(function(o){ return Number(o.discount_amount) > 0; });
    if (af.za) filtered = filtered.filter(function(o){ return o.zalo_oa_sent; });
    if (af.noza) filtered = filtered.filter(function(o){ return !o.zalo_oa_sent; });
    if (af.loi) filtered = filtered.filter(function(o){ return o.has_error; });
    if (af.sua) filtered = filtered.filter(function(o){ return o.has_repair_order; });
    if (af.no) filtered = filtered.filter(function(o){ return (Number(o.remaining_amount) || 0) > 0; });
    // CSKH filter
    if (_dht.cskhFilter) {
        filtered = filtered.filter(function(o) { return Number(o.cskh_user_id) === _dht.cskhFilter; });
    }
    // ★ Stat card filter
    var sf = _dht.statFilter || '';
    if (sf === 'remaining') {
        filtered = filtered.filter(function(o) { return (Number(o.remaining_amount) || 0) > 0; });
        filtered.sort(function(a, b) { return (Number(b.remaining_amount)||0) - (Number(a.remaining_amount)||0); });
    } else if (sf === 'revenue') {
        filtered.sort(function(a, b) { return (Number(b.total_amount)||0) - (Number(a.total_amount)||0); });
    } else if (sf === 'no_sx_print') {
        // Chưa In Phiếu: exclude PET(8), TEM(9)
        var _SX_EXCLUDE_CATS = [8, 9];
        filtered = filtered.filter(function(o) {
            if (_SX_EXCLUDE_CATS.indexOf(Number(o.category_id)) !== -1) return false;
            return !o.sx_print_confirmed;
        });
    }

    // Apply sorting
    if (_dht.sortCol && _dht.sortDir) {
        var def = _dhtSortDefs.find(function(d){ return d.key === _dht.sortCol; });
        if (def) {
            var dir = _dht.sortDir === 'asc' ? 1 : -1;
            filtered.sort(function(a, b) {
                var va = a[_dht.sortCol], vb = b[_dht.sortCol];
                if (def.type === 'num') {
                    return (Number(va || 0) - Number(vb || 0)) * dir;
                } else if (def.type === 'date') {
                    var da = va ? new Date(va).getTime() : 0;
                    var db = vb ? new Date(vb).getTime() : 0;
                    return (da - db) * dir;
                } else {
                    var sa = (va || '').toString().toLowerCase();
                    var sb = (vb || '').toString().toLowerCase();
                    return sa.localeCompare(sb, 'vi') * dir;
                }
            });
        }
    }

    // Paginate
    var totalFiltered = filtered.length;
    var totalPages = Math.ceil(totalFiltered / _dht.pageSize) || 1;
    if (_dht.page > totalPages) _dht.page = totalPages;
    if (_dht.page < 1) _dht.page = 1;
    var startIdx = (_dht.page - 1) * _dht.pageSize;
    var paged = filtered.slice(startIdx, startIdx + _dht.pageSize);

    // Re-render header sort indicators
    _dhtRenderSortHeaders();
    _dhtRenderOrderRows(paged);
    _dhtRenderPagination(totalFiltered, totalPages);
}

function _dhtRenderSortHeaders() {
    var thead = document.querySelector('#dhtTable thead tr');
    if (!thead) return;
    var ths = '';
    for (var i = 0; i < _dhtSortDefs.length; i++) {
        var d = _dhtSortDefs[i];
        if (d.type === 'none') { ths += '<th>' + (d.label || '') + '</th>'; continue; }
        var isActive = _dht.sortCol === d.key;
        var arrow = '';
        if (isActive && _dht.sortDir === 'asc') arrow = ' ▲';
        else if (isActive && _dht.sortDir === 'desc') arrow = ' ▼';
        var align = d.align ? ';text-align:' + d.align : '';
        if (isActive) {
            ths += '<th class="dht-th-sort" onclick="_dhtSortCol(\'' + d.key + '\')" style="background:#ffd700;color:#122546;cursor:pointer;user-select:none' + align + '">' + d.label + '<span class="dht-sort-arrow">' + arrow + '</span></th>';
        } else {
            ths += '<th class="dht-th-sort" onclick="_dhtSortCol(\'' + d.key + '\')" style="cursor:pointer;user-select:none' + align + '">' + d.label + '</th>';
        }
    }
    thead.innerHTML = ths;
}

function _dhtRenderPagination(totalItems, totalPages) {
    var html = '';
    if (totalPages <= 1) {
        // No pagination needed, but show count
        html = '<div style="text-align:center;font-size:11px;color:#64748b;padding:4px">'
            + '<span style="font-weight:700">' + totalItems + ' đơn</span></div>';
    } else {
        html = '<div style="display:flex;align-items:center;justify-content:center;gap:4px;flex-wrap:wrap;padding:6px 0">';
        // Prev button
        html += '<button onclick="_dhtGoPage(' + (_dht.page - 1) + ')" ' + (_dht.page <= 1 ? 'disabled' : '')
            + ' style="padding:4px 10px;border-radius:6px;border:1px solid #cbd5e1;background:' + (_dht.page <= 1 ? '#f1f5f9' : '#fff')
            + ';color:' + (_dht.page <= 1 ? '#94a3b8' : '#0369a1') + ';font-size:11px;font-weight:700;cursor:' + (_dht.page <= 1 ? 'not-allowed' : 'pointer')
            + '">◀ Trước</button>';

        // Page numbers — show max 7 around current
        var pages = [];
        pages.push(1);
        var start = Math.max(2, _dht.page - 2);
        var end = Math.min(totalPages - 1, _dht.page + 2);
        if (start > 2) pages.push('...');
        for (var p = start; p <= end; p++) pages.push(p);
        if (end < totalPages - 1) pages.push('...');
        if (totalPages > 1) pages.push(totalPages);

        for (var i = 0; i < pages.length; i++) {
            var pg = pages[i];
            if (pg === '...') {
                html += '<span style="padding:4px 6px;color:#94a3b8;font-size:11px">...</span>';
            } else {
                var isActive = pg === _dht.page;
                html += '<button onclick="_dhtGoPage(' + pg + ')" style="min-width:30px;padding:4px 8px;border-radius:6px;border:1px solid '
                    + (isActive ? '#0369a1' : '#cbd5e1') + ';background:' + (isActive ? '#0369a1' : '#fff')
                    + ';color:' + (isActive ? '#fff' : '#334155') + ';font-size:11px;font-weight:' + (isActive ? '800' : '600')
                    + ';cursor:pointer">' + pg + '</button>';
            }
        }

        // Next button
        html += '<button onclick="_dhtGoPage(' + (_dht.page + 1) + ')" ' + (_dht.page >= totalPages ? 'disabled' : '')
            + ' style="padding:4px 10px;border-radius:6px;border:1px solid #cbd5e1;background:' + (_dht.page >= totalPages ? '#f1f5f9' : '#fff')
            + ';color:' + (_dht.page >= totalPages ? '#94a3b8' : '#0369a1') + ';font-size:11px;font-weight:700;cursor:' + (_dht.page >= totalPages ? 'not-allowed' : 'pointer')
            + '">Sau ▶</button>';

        // Summary
        var from = (_dht.page - 1) * _dht.pageSize + 1;
        var to = Math.min(_dht.page * _dht.pageSize, totalItems);
        html += '<span style="margin-left:8px;font-size:11px;color:#64748b;font-weight:600">'
            + 'Trang ' + _dht.page + '/' + totalPages + ' — hiển thị ' + from + '-' + to + ' / ' + totalItems + ' đơn</span>';
        html += '</div>';
    }
    var top = document.getElementById('dhtPaginationTop');
    var bot = document.getElementById('dhtPaginationBottom');
    if (top) top.innerHTML = html;
    if (bot) bot.innerHTML = html;
}

function _dhtGoPage(p) {
    var totalPages = Math.ceil((_dht.orders || []).length / _dht.pageSize) || 1;
    if (p < 1 || p > totalPages) return;
    _dht.page = p;
    _dhtRenderTable();
    // Scroll to top of table
    var tbl = document.getElementById('dhtTable');
    if (tbl) tbl.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
async function renderDonhangtongPage(content) {
    if (!document.getElementById('dhtStyles')) {
        var st = document.createElement('style'); st.id = 'dhtStyles';
        st.textContent = '.dht-wrap{display:flex;height:calc(100vh - 60px);overflow:hidden}'
            +'.dht-sidebar{width:270px;min-width:270px;background:#fff;border-right:1px solid var(--gray-200);overflow-y:auto;position:relative}'
            +'.dht-main{flex:1;min-width:0;display:flex;flex-direction:column;overflow-y:auto;padding:16px}.dht-main>*{flex-shrink:0}.dht-main .card{overflow:visible}'
            +'.dht-sb-title{font-size:13px;font-weight:800;padding:16px;border-bottom:1px solid var(--gray-200);text-align:center;position:relative;overflow:hidden}'
            +'.dht-sb-title::before{content:"";position:absolute;top:-50%;left:-50%;width:200%;height:200%;background:linear-gradient(45deg,transparent 30%,rgba(250,210,76,0.08) 50%,transparent 70%);animation:dhtShimmer 3s infinite}'
            +'@keyframes dhtShimmer{0%{transform:translateX(-100%) rotate(0)}100%{transform:translateX(100%) rotate(0)}}'
            +'.dht-sb-total{background:linear-gradient(135deg,#b8860b,#daa520,#ffd700);color:#fff;padding:12px 16px;font-size:13px;font-weight:800;display:flex;justify-content:space-between;cursor:pointer;position:relative;overflow:hidden}'
            +'.dht-sb-total::after{content:"";position:absolute;top:0;left:-100%;width:60%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent);animation:dhtGlow 2.5s infinite}'
            +'@keyframes dhtGlow{0%{left:-100%}100%{left:150%}}'
            +'.dht-sb-year{padding:8px 16px;font-weight:800;font-size:12px;color:var(--navy);cursor:pointer;display:flex;justify-content:space-between;align-items:center;background:#f8fafc;border-bottom:1px solid var(--gray-200)}'
            +'.dht-sb-cat{padding:6px 16px 6px 28px;font-size:11px;font-weight:700;cursor:pointer;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #f0f0f0;color:#b8860b}'
            +'.dht-sb-cat:hover{background:#fffbeb}.dht-sb-cat.active{background:#fef3c7;font-weight:800}'
            +'.dht-sb-month{padding:5px 16px 5px 44px;font-size:11px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #fafafa}'
            +'.dht-sb-month:hover{background:#fffbeb}.dht-sb-month.active{background:#fef3c7;font-weight:700}'
            +'.dht-sb-day{padding:4px 16px 4px 60px;font-size:10px;cursor:pointer;display:flex;justify-content:space-between;align-items:center}'
            +'.dht-sb-day:hover{background:#fffdf5}.dht-sb-day.active{background:#fef9c3;font-weight:700}'
            +'.dht-th-sort{transition:all .15s;white-space:nowrap}'
            +'.dht-th-sort:hover{filter:brightness(1.3)}'
            +'.dht-sort-arrow{font-size:10px;margin-left:3px;opacity:0.9}'
            +'@keyframes dhtErrorPulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.2);opacity:0.7}}'
            +'.dht-error-icon{display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;background:#dc2626;color:#fff;font-size:10px;font-weight:900;margin-right:4px;animation:dhtErrorPulse 1.5s ease-in-out infinite;box-shadow:0 0 6px rgba(220,38,38,0.6),0 0 12px rgba(220,38,38,0.3);vertical-align:middle;line-height:1}'
            +'.dht-don-sua-glow{animation:dhtDonSuaGlow 2s ease-in-out infinite}@keyframes dhtDonSuaGlow{0%,100%{box-shadow:0 0 4px rgba(180,83,9,0.4)}50%{box-shadow:0 0 12px rgba(180,83,9,0.8),0 0 20px rgba(180,83,9,0.3)}}';
        document.head.appendChild(st);
    }
    const [catRes, staffRes] = await Promise.all([apiCall('/api/dht/categories'), apiCall('/api/dht/staff')]);
    _dht.categories = catRes.categories || [];
    _dht.staff = staffRes.staff || [];
    content.innerHTML = '<div class="dht-wrap"><div class="dht-sidebar" id="dhtSidebar"><div style="padding:20px;text-align:center;color:var(--gray-400);font-size:12px">Đang tải...</div></div><div class="dht-main"><div style="display:flex;gap:10px;margin-bottom:8px;flex-wrap:wrap;align-items:center"><div id="dhtSearchWrap" style="position:relative;display:flex;align-items:center;gap:0"><input type="text" id="dhtSearch" class="form-control" placeholder="🔍 Tìm mã đơn hàng, SĐT, tên khách..." style="width:320px;font-size:13px;padding:8px 36px 8px 14px;border-radius:10px 0 0 10px;border:2px solid #daa520;border-right:none;transition:all .2s" onfocus="this.style.borderColor=&apos;#b8860b&apos;;this.style.boxShadow=&apos;0 0 0 3px rgba(184,134,11,0.15)&apos;" onblur="this.style.borderColor=&apos;#daa520&apos;;this.style.boxShadow=&apos;none&apos;"><button onclick="_dhtDoSearch()" style="background:linear-gradient(135deg,#b8860b,#daa520);color:#fff;border:none;padding:8px 16px;border-radius:0 10px 10px 0;font-size:13px;font-weight:800;cursor:pointer;white-space:nowrap;height:100%;transition:all .15s" onmouseover="this.style.filter=&apos;brightness(1.1)&apos;" onmouseout="this.style.filter=&apos;&apos;">Tìm</button><button id="dhtSearchClear" onclick="_dhtClearSearch()" style="display:none;background:#fee2e2;color:#dc2626;border:1px solid #fca5a5;padding:4px 10px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;margin-left:6px;white-space:nowrap" title="Xóa tìm kiếm">✕</button></div><div id="dhtSearchBadge" style="display:none;background:linear-gradient(135deg,#fef3c7,#fde68a);border:1px solid #f59e0b;padding:4px 12px;border-radius:8px;font-size:11px;font-weight:700;color:#92400e"></div><div id="dhtFilterInfo" style="font-size:12px"></div>'
        +'<div id="dhtStatCards" style="display:flex;gap:10px;flex:1;justify-content:center"></div>'
        +'<div style="margin-left:auto;display:flex;align-items:center;gap:8px"><button class="btn btn-secondary" onclick="_dhtExport()" style="font-size:12px;padding:5px 12px">📥 Xuất File</button><div id="dhtNextCode" style="font-size:11px;color:#94a3b8">⏳ Đang tải mã đơn...</div><button class="btn" id="dhtCreateFreBtn" onclick="_dhtShowCreateFree()" style="font-size:13px;padding:9px 20px;background:linear-gradient(135deg,#059669,#10b981);color:#fff;border:none;border-radius:10px;font-weight:900;cursor:pointer;box-shadow:0 3px 12px rgba(5,150,105,0.35);transition:all .2s" onmouseover="this.style.transform=\'scale(1.05)\'" onmouseout="this.style.transform=\'scale(1)\'">🐾 Tạo PET/TEM</button><button class="btn" id="dhtCreateBtn" onclick="_dhtShowCreate()" style="font-size:13px;padding:9px 20px;background:linear-gradient(135deg,#b8860b,#daa520,#f0c040);color:#fff;border:none;border-radius:10px;font-weight:900;cursor:pointer;box-shadow:0 3px 12px rgba(184,134,11,0.4);transition:all .2s;text-shadow:0 1px 2px rgba(0,0,0,0.2)" onmouseover="this.style.transform=\'scale(1.05)\';this.style.boxShadow=\'0 5px 18px rgba(184,134,11,0.5)\'" onmouseout="this.style.transform=\'scale(1)\';this.style.boxShadow=\'0 3px 12px rgba(184,134,11,0.4)\'">✨ Tạo Đồng Phục</button></div></div>'
        +'<div id="dhtFilterChips" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px"></div>'
        +'<div id="dhtDateBar" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:10px;padding:10px 14px;background:linear-gradient(135deg,#f0f9ff,#e0f2fe);border:1px solid #bae6fd;border-radius:10px">'
        +'<button onclick="_dhtDateFilterToday()" style="background:#0369a1;color:#fff;border:none;border-radius:6px;padding:5px 14px;font-size:11px;font-weight:700;cursor:pointer">📅 Hôm Nay</button>'
        +'<button onclick="_dhtDateFilterMonth(0)" style="background:#0284c7;color:#fff;border:none;border-radius:6px;padding:5px 14px;font-size:11px;font-weight:700;cursor:pointer">📅 Tháng Này</button>'
        +'<span style="width:1px;height:24px;background:#93c5fd;margin:0 4px"></span>'
        +'<label style="font-size:11px;font-weight:700;color:#0c4a6e">🗓️ CHỌN THÁNG</label>'
        +'<input type="month" id="dhtMonthPick" class="form-control" style="width:160px;font-size:11px;padding:4px 8px" onchange="_dhtDateFilterMonthPick()">'
        +'<span style="width:1px;height:24px;background:#93c5fd;margin:0 4px"></span>'
        +'<label style="font-size:11px;font-weight:700;color:#0c4a6e">📆 CHỌN NĂM</label>'
        +'<select id="dhtYearPick" class="form-control" style="width:90px;font-size:11px;padding:4px 8px" onchange="_dhtDateFilterYear()"><option value="">Tất cả</option></select>'
        +'<span style="width:1px;height:24px;background:#93c5fd;margin:0 4px"></span>'
        +'<label style="font-size:11px;font-weight:700;color:#0c4a6e">👤 CSKH</label>'
        +'<select id="dhtCskhPick" class="form-control" style="width:150px;font-size:11px;padding:4px 8px" onchange="_dhtDateFilterCskh()"><option value="">Tất cả</option></select>'
        +'<button onclick="_dhtDateFilterClear()" style="background:none;border:1px solid #93c5fd;color:#0369a1;border-radius:6px;padding:4px 10px;font-size:11px;font-weight:700;cursor:pointer" title="Xóa lọc">✕ Xóa</button>'
        +'</div>'
        +'<div id="dhtPaginationTop" style="margin:8px 0"></div>'
        +'<div class="card"><div class="card-body" style="overflow-x:auto;padding:8px"><table class="table" style="font-size:12px;white-space:nowrap" id="dhtTable"><thead><tr style="background:var(--gray-800)"><th>Lĩnh Vực</th><th>Ngày LĐ</th><th>🚛Ngày Gửi</th><th>Tiến Độ</th><th>Còn Lại</th><th>Mã Đơn</th><th>Tên Khách</th><th>SĐT</th><th>Thành Phố</th><th>CSKH</th><th>Nguồn</th><th>Tổng SL</th><th>Ưu Đãi</th><th>Đặt Cọc</th><th>TC Gửi</th><th>Lịch Sử CN</th><th></th></tr></thead><tbody id="dhtTbody"><tr><td colspan="17" style="text-align:center;padding:40px">⏳</td></tr></tbody></table></div></div>'
        +'<div id="dhtPaginationBottom" style="margin:8px 0"></div>'
        +'</div></div>';
    let _st; document.getElementById('dhtSearch').addEventListener('input', () => { clearTimeout(_st); _st = setTimeout(() => _dhtDoSearch(), 500); });
    document.getElementById('dhtSearch').addEventListener('keydown', (e) => { if (e.key === 'Enter') { clearTimeout(_st); _dhtDoSearch(); } });
    // Default: load current year (no month pre-selected)
    var nowVN = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
    _dht.filter = { year: nowVN.getFullYear() };
    _dhtSyncDateInputs();
    // Populate year dropdown (current year ± 2)
    var ypEl = document.getElementById('dhtYearPick');
    if (ypEl) { var cy = nowVN.getFullYear(); for (var yi = cy+1; yi >= cy-3; yi--) { ypEl.innerHTML += '<option value="'+yi+'">'+yi+'</option>'; } }
    await _dhtLoadTree();
    await _dhtLoadOrders();
    _dhtShowNextCode();
}

// ========== AVAILABLE ORDER CODES DISPLAY ==========
async function _dhtShowNextCode() {
    var el = document.getElementById('dhtNextCode');
    var btn = document.getElementById('dhtCreateBtn');
    if (!el) return;
    try {
        var res = await apiCall('/api/dht/available-order-codes');
        var count = res.count || 0;
        if (count === 0) {
            el.innerHTML = '<span style="color:#94a3b8;font-size:11px">📋 Không có mã đơn chờ — Chốt Đơn ở CRM trước</span>';
            if (btn) { btn.disabled = true; btn.style.opacity = '0.5'; btn.style.cursor = 'not-allowed'; }
        } else {
            el.innerHTML = '📋 <span style="background:linear-gradient(135deg,#dc2626,#ef4444);color:#fff;padding:3px 14px;border-radius:6px;font-size:13px;font-weight:900">' + count + ' mã đơn chờ tạo</span>';
            if (btn) { btn.disabled = false; btn.style.opacity = '1'; btn.style.cursor = 'pointer'; }
        }
    } catch(e) {
        el.innerHTML = '<span style="color:#94a3b8;font-size:11px">—</span>';
    }
}

// ========== TREE ==========
var _dhtOpen = {}; // persist open/close state: {y2026:true, y2026c1:true, ...}

async function _dhtLoadTree() {
    var data = await apiCall('/api/dht/tree');
    _dht.tree = data.tree || [];
    _dht.summaryVisibility = data.summaryVisibility || 'none';
    var sb = document.getElementById('dhtSidebar'); if (!sb) return;
    var curYear = new Date().getFullYear();
    // Default: current year open
    if (!_dhtOpen._init) { _dhtOpen['y'+curYear] = true; _dhtOpen._init = true; }

    var isFull = _dht.summaryVisibility === 'full';
    var _sbVal = function(total, count) { return isFull ? _dhtFmt(total) : _dhtFmtCount(count); };
    var h = '<div class="dht-sb-title"><span style="color:var(--navy)">───</span> <span style="color:#b8860b;font-weight:900">✨ Đơn hàng tổng ✨</span> <span style="color:var(--navy)">───</span></div>';
    // Only show Tổng Doanh Số in sidebar for 'full' visibility (GĐ/QLCC)
    if (isFull) {
        h += '<div class="dht-sb-total" onclick="_dhtFilterOnly({})"><span>▼ Tổng Doanh Số</span><span>'+_dhtFmt(data.grandTotal||0)+'</span></div>';
    }
    var years = _dht.tree.length > 0 ? _dht.tree : [{year:curYear,total:0,count:0,categories:[]}];
    years.forEach(function(yr) {
        var yKey = 'y'+yr.year;
        var yOpen = !!_dhtOpen[yKey];
        h += '<div class="dht-sb-year" onclick="_dhtToggleKey(\''+yKey+'\')"><span>'+(yOpen?'▼':'▶')+' Năm '+yr.year+'</span><span style="background:linear-gradient(135deg,#ffd700,#daa520);color:#fff;padding:2px 10px;border-radius:10px;font-size:10px">'+_sbVal(yr.total, yr.count)+'</span></div>';
        h += '<div style="display:'+(yOpen?'block':'none')+'">';
        var cats = _dht.categories.map(function(cat) {
            var found = (yr.categories||[]).find(function(c){return c.id===cat.id;});
            return {id:cat.id,name:cat.name,total:found?found.total:0,count:found?found.count:0,months:found?found.months:[]};
        });
        (yr.categories||[]).forEach(function(c){if(c.id===0&&!cats.find(function(x){return x.id===0;}))cats.unshift(c);});
        if(cats.length===0)cats=[{id:0,name:'Chưa có lĩnh vực',total:0,months:[]}];
        cats.forEach(function(cat) {
            var cKey = yKey+'c'+cat.id;
            var cOpen = !!_dhtOpen[cKey];
            var cActive = _dht.filter.year==yr.year&&_dht.filter.category_id==cat.id&&!_dht.filter.month;
            h += '<div class="dht-sb-cat'+(cActive?' active':'')+'" onclick="_dhtToggleKey(\''+cKey+'\','+yr.year+','+cat.id+')"><span>'+(cOpen?'▼':'▶')+' 🏷️ '+cat.name+'</span><span style="color:#b8860b;font-weight:800">'+_sbVal(cat.total, cat.count)+'</span></div>';
            h += '<div style="display:'+(cOpen?'block':'none')+'">';
            for(var mi=12;mi>=1;mi--){
                var mData=(cat.months||[]).find(function(m){return m.month===mi;});
                var mTotal=mData?mData.total:0;
                var mCount=mData?mData.count:0;
                var mVal=isFull?mTotal:mCount;
                var mActive=_dht.filter.year==yr.year&&_dht.filter.category_id==cat.id&&_dht.filter.month==mi;
                h += '<div class="dht-sb-month'+(mActive?' active':'')+'" onclick="event.stopPropagation();_dhtFilterOnly({year:'+yr.year+',category_id:'+cat.id+',month:'+mi+'})"><span>▸ Tháng '+String(mi).padStart(2,'0')+'</span><span style="color:'+(mVal>0?'#b8860b':'#999')+';font-weight:'+(mVal>0?'800':'400')+'">'+_sbVal(mTotal, mCount)+'</span></div>';
            }
            h += '</div>';
        });
        h += '</div>';
    });
    var isGD = typeof currentUser!=='undefined'&&currentUser&&currentUser.role==='giam_doc';
    if(isGD){
        h += '<div style="padding:12px;border-top:1px solid var(--gray-200);display:flex;flex-direction:column;gap:6px">';
        h += '<button onclick="_dhtShowCatSetup()" style="background:linear-gradient(135deg,#b8860b,#daa520);color:#fff;border:none;padding:8px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer">⚙️ Quản Lý Lĩnh Vực</button>';
        h += '<button onclick="_dhtShowSourceSetup(\'pet\')" style="background:linear-gradient(135deg,#059669,#10b981);color:#fff;border:none;padding:8px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer">🐾 Quản Lý Nguồn PET</button>';
        h += '<button onclick="_dhtShowSourceSetup(\'tem\')" style="background:linear-gradient(135deg,#7c3aed,#8b5cf6);color:#fff;border:none;padding:8px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer">🏷️ Quản Lý Nguồn TEM</button>';
        h += '</div>';
    }
    sb.innerHTML = h;
}
// Toggle a key and re-render sidebar (preserves state)
function _dhtToggleKey(key, year, catId) {
    _dhtOpen[key] = !_dhtOpen[key];
    // If opening a category, also filter to it
    if (_dhtOpen[key] && year && catId) {
        _dht.filter = {year:year,category_id:catId};
        _dhtLoadOrders();
    }
    _dhtLoadTree();
}
// Filter only (update filter + orders + sidebar highlights, no toggle change)
function _dhtFilterOnly(filter) {
    _dht.filter = filter;
    _dhtLoadTree();
    _dhtLoadOrders();
}

// ========== SEARCH ==========
function _dhtDoSearch() {
    var q = (document.getElementById('dhtSearch')?.value || '').trim();
    var badge = document.getElementById('dhtSearchBadge');
    var clearBtn = document.getElementById('dhtSearchClear');
    if (q.length > 0) {
        // ★ When searching: bypass date/category filters → search ALL orders
        _dht._preSearchFilter = _dht._preSearchFilter || Object.assign({}, _dht.filter);
        _dht._isSearching = true;
        if (badge) { badge.style.display = ''; badge.textContent = '🔍 Đang tìm: "' + q + '" — Tất cả đơn hàng'; }
        if (clearBtn) clearBtn.style.display = '';
    } else {
        _dht._isSearching = false;
        if (badge) badge.style.display = 'none';
        if (clearBtn) clearBtn.style.display = 'none';
    }
    _dhtLoadOrders();
}
function _dhtClearSearch() {
    var el = document.getElementById('dhtSearch'); if (el) el.value = '';
    var badge = document.getElementById('dhtSearchBadge'); if (badge) badge.style.display = 'none';
    var clearBtn = document.getElementById('dhtSearchClear'); if (clearBtn) clearBtn.style.display = 'none';
    _dht._isSearching = false;
    // Restore previous filter
    if (_dht._preSearchFilter) { _dht.filter = _dht._preSearchFilter; _dht._preSearchFilter = null; }
    _dhtSyncDateInputs();
    _dhtLoadOrders();
}

// ========== ORDERS TABLE ==========
async function _dhtLoadOrders() {
    const f = _dht.filter;
    let url = '/api/dht/orders?';
    const search = (document.getElementById('dhtSearch')?.value || '').trim();
    if (search) {
        // ★ When searching: send ONLY search param (no date/category filter)
        url += `search=${encodeURIComponent(search)}&`;
    } else {
        // Normal mode: apply date/category filters
        if (f.year) url += `year=${f.year}&`;
        if (f.month) url += `month=${f.month}&`;
        if (f.day) url += `day=${f.day}&`;
        if (f.category_id) url += `category_id=${f.category_id}&`;
    }

    const data = await apiCall(url);
    _dht.orders = data.orders || [];
    _dht.page = 1;
    _dhtPopulateCskhDropdown();
    _dhtRenderTable();
}

function _dhtRenderOrderRows(filtered) {
    const tbody = document.getElementById('dhtTbody');
    if (!tbody) return;

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="17"><div class="empty-state"><div class="icon">📭</div><h3>Chưa có đơn hàng</h3></div></td></tr>';
        _dhtUpdateInfo(0, []); return;
    }

    const fmt = n => Number(n || 0).toLocaleString('vi-VN');
    const fmtD = d => { if (!d) return '—'; const dt = new Date(d); return `${dt.getDate()}/${dt.getMonth()+1}`; };
    const _todayVN = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
    _todayVN.setHours(0,0,0,0);

    tbody.innerHTML = filtered.map(o => {
        const remaining = Number(o.remaining_amount) || 0;
        const remColor = remaining > 0 ? 'var(--danger)' : 'var(--success)';
        const prodDone = Number(o.prod_done) || 0;
        const prodTotal = Number(o.prod_total) || 0;
        const nextStepName = o.next_step_name || '';
        const isShipped = o.shipping_status === 'shipped' || !!o.shipped_at;
        const prodBadge = '<button onclick="event.stopPropagation();_dhtShowProduction(' + o.id + ',\'' + (o.order_code||'').replace(/'/g, '') + '\')" '
            + 'style="border:none;background:#e0f2fe;color:#0284c7;width:32px;height:32px;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;transition:all 0.2s;box-shadow:0 1px 2px rgba(0,0,0,0.05);" '
            + 'title="Xem quy trình sản xuất" '
            + 'onmouseover="this.style.background=\'#bae6fd\';this.style.color=\'#0369a1\';" '
            + 'onmouseout="this.style.background=\'#e0f2fe\';this.style.color=\'#0284c7\';">'
            + '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">'
            + '<line x1="8" y1="6" x2="21" y2="6"></line>'
            + '<line x1="8" y1="12" x2="21" y2="12"></line>'
            + '<line x1="8" y1="18" x2="21" y2="18"></line>'
            + '<line x1="3" y1="6" x2="3.01" y2="6"></line>'
            + '<line x1="3" y1="12" x2="3.01" y2="12"></line>'
            + '<line x1="3" y1="18" x2="3.01" y2="18"></line>'
            + '</svg>'
            + '</button>';
        const priColors = { 'GẤP': 'background:#dc2626;color:#fff;', 'GỬI': 'background:#2563eb;color:#fff;', 'CHUẨN': 'background:#7c3aed;color:#fff;' };
        const priStyle = priColors[o.shipping_priority] || priColors['CHUẨN'];
        const lastUpdate = o.last_updated_at ? `${vnFormat(o.last_updated_at)}` : '—';
        const lastUser = o.last_updated_by_name ? `<br><span style="color:var(--info);font-size:10px;">${o.last_updated_by_name}</span>` : '';

        const priority = (o.shipping_priority || 'CHUẨN').toUpperCase();
        let priBadge = '';
        if (priority === 'GẤP') {
            priBadge = `<span style="margin-right: 6px; background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; font-size: 9px; padding: 1px 4px; border-radius: 3px; font-weight: bold; display: inline-block; vertical-align: middle;">Gấp</span>`;
        } else if (priority === 'GỬI') {
            priBadge = `<span style="margin-right: 6px; background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; font-size: 9px; padding: 1px 4px; border-radius: 3px; font-weight: bold; display: inline-block; vertical-align: middle;">Gửi</span>`;
        } else {
            priBadge = `<span style="margin-right: 6px; background: #f3e8ff; color: #7e22ce; border: 1px solid #d8b4fe; font-size: 9px; padding: 1px 4px; border-radius: 3px; font-weight: bold; display: inline-block; vertical-align: middle;">Chuẩn</span>`;
        }

        // Mini status badges
        let badges = '';
        const bStyle = 'display:inline-block;padding:1px 5px;border-radius:3px;font-size:8px;font-weight:800;letter-spacing:0.3px;line-height:14px;';
        if (o.has_vat) badges += `<span style="${bStyle}background:#fef3c7;color:#92400e;">VAT</span> `;
        if (Number(o.discount_amount) > 0) badges += `<span style="${bStyle}background:#d1fae5;color:#065f46;">GG</span> `;
        if (o.zalo_oa_sent) badges += `<span style="${bStyle}background:#dbeafe;color:#1e40af;">ZA</span> `;
        if (o.has_error) badges += `<span style="${bStyle}background:#fee2e2;color:#dc2626;">LỖI</span> `;
        if (o.has_repair_order) badges += `<span style="${bStyle}background:#ede9fe;color:#6d28d9;">SỬA</span> `;
        if (o.sx_print_confirmed) badges += `<span style="${bStyle}background:#d1fae5;color:#059669;">✅SX</span> `;
        const badgeRow = badges ? `<div style="margin-top:2px;">${badges}</div>` : '';

        // Category color badge
        const _catColors = ['#7c3aed','#0891b2','#059669','#d97706','#dc2626','#2563eb','#c026d3','#0d9488','#ea580c','#4f46e5'];
        const _catBgs = ['#ede9fe','#cffafe','#d1fae5','#fef3c7','#fee2e2','#dbeafe','#fae8ff','#ccfbf1','#ffedd5','#e0e7ff'];
        const _catHash = (o.category_name || '').split('').reduce(function(a,c){return a + c.charCodeAt(0);}, 0) % _catColors.length;
        let _catColor = _catColors[_catHash];
        let _catBg = _catBgs[_catHash];

        if (o.category_name === 'CÔNG TY') {
            _catColor = '#d97706'; // Amber/Yellow
            _catBg = '#fef3c7';
        } else if (o.category_name === 'PET') {
            _catColor = '#2563eb'; // Blue
            _catBg = '#dbeafe';
        } else if (o.category_name === 'TEM') {
            _catColor = '#7c3aed'; // Purple
            _catBg = '#ede9fe';
        }

        // ★ Tiến Độ calculation: today vs expected_ship_date
        let tienDo = '';
        if (o.expected_ship_date) {
            const shipExpected = new Date(o.expected_ship_date); shipExpected.setHours(0,0,0,0);
            const diffDays = Math.round((_todayVN.getTime() - shipExpected.getTime()) / 86400000);
            if (o.shipped_at || o.shipping_status === 'shipped') {
                // Already shipped
                const shipActual = o.shipped_at ? new Date(new Date(o.shipped_at).toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' })) : _todayVN;
                shipActual.setHours(0,0,0,0);
                const shipDiff = Math.round((shipExpected.getTime() - shipActual.getTime()) / 86400000);
                if (shipDiff > 0) {
                    tienDo = `<span style="color:#059669;font-size:10px;font-weight:700">⚡Nhanh ${shipDiff} ngày</span>`;
                } else if (shipDiff === 0) {
                    tienDo = `<span style="color:#059669;font-size:10px;font-weight:700">✅ Đúng hạn</span>`;
                } else {
                    tienDo = `<span style="color:#dc2626;font-size:10px;font-weight:700">⚠️ Trễ ${Math.abs(shipDiff)} ngày</span>`;
                }
            } else {
                // Not shipped yet — compare today vs expected
                if (diffDays < 0) {
                    tienDo = `<span style="color:#2563eb;font-size:10px;font-weight:700">⏳ Còn ${Math.abs(diffDays)} ngày</span>`;
                } else if (diffDays === 0) {
                    tienDo = `<span style="color:#f59e0b;font-size:10px;font-weight:800">📦 Hôm nay!</span>`;
                } else {
                    tienDo = `<span style="color:#dc2626;font-size:10px;font-weight:800;animation:dhtBlink 1s infinite">🔥 Quá hạn ${diffDays} ngày</span>`;
                }
            }
        }
        const shipDateFmt = o.shipped_at ? '🚛' + fmtD(o.shipped_at) : '—';

            return `<tr data-id="${o.id}" onclick="_dhtShowDetail(${o.id})" style="cursor:pointer;" title="Xem chi tiết">
            <td><span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:800;color:${_catColor};background:${_catBg};border:1px solid ${_catColor}22;white-space:nowrap">${o.category_name || '—'}</span></td>
            <td>${fmtD(o.order_date)}</td>
            <td style="font-weight:600;">${shipDateFmt}</td>
            <td>${tienDo}</td>
            <td style="font-weight:700;color:${remColor};">${fmt(remaining)}</td>
            <td>${o.has_error ? '<span class="dht-error-icon" title="Đơn báo lỗi">!</span>' : ''}${priBadge}<strong style="color:${remaining > 0 ? '#c2410c' : '#0f766e'};">${o.order_code}</strong>${badgeRow}</td>
            <td>${o.customer_name || '—'}</td>
            <td>${o.customer_phone ? '<a href="tel:'+o.customer_phone+'" style="color:var(--info);" onclick="event.stopPropagation()">'+o.customer_phone+'</a>' : '—'}</td>
            <td>${o.province || '—'}</td>
            <td>${o.cskh_name || '—'}</td>
            <td>${o.source || '—'}</td>
            <td style="text-align:center;font-weight:800;">${formatDetailedQuantity(o.items, o.total_quantity, o.order_code)}</td>
            <td style="color:var(--warning);font-weight:800;">${fmt(o.discount_amount)}</td>
            <td style="color:var(--success);font-weight:800;">${fmt(o.deposit_amount)}</td>
            <td><span style="padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;${priStyle}">${o.shipping_priority || 'CHUẨN'}</span></td>
            <td style="font-size:10px;">${lastUpdate}${lastUser}</td>
            <td>
                ${canDo('dht_sua_don', 'view') ? ((Number(o.remaining_amount) || 0) <= 0 ? `<button class="btn btn-sm" disabled title="Đã thu đủ tiền — không thể sửa đơn" style="opacity:0.35;cursor:not-allowed">✏️</button>` : `<button class="btn btn-sm" onclick="event.stopPropagation();_dhtEditOrderFull(${o.id})" title="Sửa">✏️</button>`) : ''}
                ${canDo('dht_xoa_don', 'view') ? `<button class="btn btn-sm" onclick="event.stopPropagation();_dhtDeleteOrder(${o.id})" title="Xóa" style="color:var(--danger);">🗑️</button>` : ''}
            </td>
        </tr>`;
    }).join('');

    _dhtUpdateInfo(filtered.length, filtered);
}

function _dhtUpdateInfo(count, filtered) {
    const el = document.getElementById('dhtFilterInfo');
    if (!el) return;
    var parts = [];
    if (_dht.filter.day) {
        var d = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
        parts.push('<span style="color:#fbbf24">📅</span> HÔM NAY ' + _dht.filter.day + '/' + (_dht.filter.month||d.getMonth()+1) + '/' + (_dht.filter.year||d.getFullYear()));
    } else {
        if (_dht.filter.year) parts.push('<span style="color:#fbbf24">📆</span> NĂM ' + _dht.filter.year);
        if (_dht.filter.month) parts.push('<span style="color:#60a5fa">🗓️</span> THÁNG ' + _dht.filter.month);
    }
    if (_dht.filter.category_id) {
        var cat = (_dht.categories||[]).find(function(c){ return c.id == _dht.filter.category_id; });
        if (cat) parts.push('<span style="color:#34d399">📁</span> ' + cat.name);
    }
    if (_dht.cskhFilter) {
        var cskhName = '';
        (_dht.orders||[]).forEach(function(o){ if(Number(o.cskh_user_id)===_dht.cskhFilter) cskhName = o.cskh_name; });
        if (cskhName) parts.push('<span style="color:#a78bfa">👤</span> ' + cskhName);
    }
    var label = parts.length > 0 ? parts.join(' <span style="opacity:0.5;margin:0 6px">•</span> ') : 'Tất cả';
    el.innerHTML = '<div style="display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,#1e293b,#334155);color:#fff;padding:6px 18px;border-radius:8px;font-size:13px;font-weight:700;letter-spacing:0.3px">'
        + label
        + ' <span style="opacity:0.5;margin:0 4px">—</span> <span style="color:#fbbf24;font-weight:900">' + count + '</span> đơn'
        + '</div>';
    // ── Stat Cards ──
    var arr = filtered || [];
    var totalRevenue = 0, totalRemaining = 0;
    arr.forEach(function(o) {
        totalRevenue += Number(o.total_amount) || 0;
        totalRemaining += Number(o.remaining_amount) || 0;
    });
    var fmt = function(n) { return Number(n||0).toLocaleString('vi-VN'); };
    var sc = document.getElementById('dhtStatCards');
    if (sc) {
        var vis = _dht.summaryVisibility || 'none';
        // 'none' = no cards at all (external roles)
        if (vis === 'none') {
            sc.innerHTML = '';
        } else {
            var sf = _dht.statFilter || '';
            var _ring = function(type) {
                return sf === type ? 'outline:3px solid #fff;outline-offset:2px;box-shadow:0 0 0 6px rgba(0,0,0,0.3);transform:scale(1.08);' : '';
            };
            var cardsHTML = '';
            // 'full' = GĐ/QLCC: show revenue card
            if (vis === 'full') {
                cardsHTML += '<div onclick="_dhtStatFilter(\'revenue\')" style="cursor:pointer;background:linear-gradient(135deg,#059669,#10b981);color:#fff;padding:8px 18px;border-radius:10px;min-width:140px;text-align:center;box-shadow:0 4px 15px #05966930;position:relative;overflow:hidden;transition:all .2s;'+_ring('revenue')+'">'
                    +'<div style="position:absolute;top:0;left:-50%;width:200%;height:100%;background:linear-gradient(90deg,transparent 40%,rgba(255,255,255,0.15) 50%,transparent 60%);animation:dhtShimmer 2.5s infinite"></div>'
                    +'<div style="font-size:9px;font-weight:600;opacity:0.85;letter-spacing:1px;margin-bottom:2px">💰 DOANH SỐ</div>'
                    +'<div style="font-size:15px;font-weight:900">'+fmt(totalRevenue)+'đ</div>'
                    +'</div>';
            }
            // 'full' + 'limited' = show count + remaining cards
            cardsHTML += '<div onclick="_dhtStatFilter(\'count\')" style="cursor:pointer;background:linear-gradient(135deg,#2563eb,#3b82f6);color:#fff;padding:8px 18px;border-radius:10px;min-width:100px;text-align:center;box-shadow:0 4px 15px #2563eb30;position:relative;overflow:hidden;transition:all .2s;'+_ring('count')+'">'
                +'<div style="position:absolute;top:0;left:-50%;width:200%;height:100%;background:linear-gradient(90deg,transparent 40%,rgba(255,255,255,0.15) 50%,transparent 60%);animation:dhtShimmer 2.5s infinite 0.3s"></div>'
                +'<div style="font-size:9px;font-weight:600;opacity:0.85;letter-spacing:1px;margin-bottom:2px">📦 SỐ ĐƠN</div>'
                +'<div style="font-size:15px;font-weight:900">'+count+'</div>'
                +'</div>'
                +'<div onclick="_dhtStatFilter(\'remaining\')" style="cursor:pointer;background:linear-gradient(135deg,#dc2626,#ef4444);color:#fff;padding:8px 18px;border-radius:10px;min-width:140px;text-align:center;box-shadow:0 4px 15px #dc262630;position:relative;overflow:hidden;transition:all .2s;'+_ring('remaining')+'">'
                +'<div style="position:absolute;top:0;left:-50%;width:200%;height:100%;background:linear-gradient(90deg,transparent 40%,rgba(255,255,255,0.15) 50%,transparent 60%);animation:dhtShimmer 2.5s infinite 0.6s"></div>'
                +'<div style="font-size:9px;font-weight:600;opacity:0.85;letter-spacing:1px;margin-bottom:2px">⚠️ CHƯA THU</div>'
                +'<div style="font-size:15px;font-weight:900">'+fmt(totalRemaining)+'đ</div>'
                +'</div>';
            // ★ Chưa In Phiếu SX card — exclude PET(8), TEM(9)
            var _SX_EXCLUDE = [8, 9];
            var noPrintCount = (filtered || arr).filter(function(o) {
                if (_SX_EXCLUDE.indexOf(Number(o.category_id)) !== -1) return false;
                return !o.sx_print_confirmed;
            }).length;
            cardsHTML += '<div onclick="_dhtStatFilter(\'no_sx_print\')" style="cursor:pointer;background:linear-gradient(135deg,'+(noPrintCount > 0 ? '#d97706,#f59e0b' : '#6b7280,#9ca3af')+');color:#fff;padding:8px 18px;border-radius:10px;min-width:120px;text-align:center;box-shadow:0 4px 15px '+(noPrintCount > 0 ? '#d9770630' : '#6b728030')+';position:relative;overflow:hidden;transition:all .2s;'+_ring('no_sx_print')+'">' 
                +'<div style="position:absolute;top:0;left:-50%;width:200%;height:100%;background:linear-gradient(90deg,transparent 40%,rgba(255,255,255,0.15) 50%,transparent 60%);animation:dhtShimmer 2.5s infinite 0.9s"></div>'
                +'<div style="font-size:9px;font-weight:600;opacity:0.85;letter-spacing:1px;margin-bottom:2px">🏭 CHƯA IN PHIẾU</div>'
                +'<div style="font-size:15px;font-weight:900">'+noPrintCount+' đơn</div>'
                +'</div>';
            sc.innerHTML = cardsHTML;
        }
        // Inject shimmer animation if not present
        if (!document.getElementById('dhtShimmerStyle')) {
            var st = document.createElement('style'); st.id = 'dhtShimmerStyle';
            st.textContent = '@keyframes dhtShimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} } @keyframes dhtBlink { 0%,100%{opacity:1} 50%{opacity:0.4} }';
            document.head.appendChild(st);
        }
    }
}

// ========== STAT CARD FILTER (toggle inline) ==========
function _dhtStatFilter(type) {
    // Toggle: click same card again → deactivate
    if (_dht.statFilter === type) {
        _dht.statFilter = '';
    } else {
        _dht.statFilter = type;
    }
    _dht.page = 1;
    _dhtRenderTable();
}

// ========== PRODUCTION WORKFLOW POPUP ==========
async function _dhtShowProduction(orderId, orderCode) {
    var data = await apiCall('/api/dht/orders/' + orderId + '/production');
    var steps = data.steps || [];
    var doneCount = steps.filter(function(s) { return s.is_completed; }).length;
    var pct = steps.length ? Math.round((doneCount / steps.length) * 100) : 0;
    var barColor = pct < 30 ? '#dc2626' : pct < 60 ? '#f59e0b' : pct >= 100 ? '#059669' : '#059669';

    var body = '<div style="padding:0">';
    // Progress header
    body += '<div style="background:linear-gradient(135deg,#0f172a,#1e293b);padding:16px 20px;border-radius:12px;margin-bottom:16px">';
    body += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">';
    body += '<span style="color:#94a3b8;font-size:11px;font-weight:600">TIẾN ĐỘ SẢN XUẤT</span>';
    body += '<span style="color:#fff;font-size:14px;font-weight:900">' + doneCount + '/' + steps.length + ' bước</span>';
    body += '</div>';
    body += '<div style="width:100%;height:8px;background:#334155;border-radius:4px;overflow:hidden">';
    body += '<div style="width:' + pct + '%;height:100%;background:' + barColor + ';border-radius:4px;transition:width .3s"></div>';
    body += '</div>';
    body += '<div style="text-align:right;margin-top:4px;font-size:11px;color:' + barColor + ';font-weight:700">' + pct + '%</div>';
    body += '</div>';

    // Steps list
    body += '<div style="display:flex;flex-direction:column;gap:6px">';
    var _stepColors = ['#7c3aed','#0891b2','#2563eb','#d97706','#c026d3','#059669','#ea580c','#dc2626'];
    
    function getDepartmentName(stepName) {
        switch(stepName) {
            case 'Chuẩn Bị QLX': return 'Quản Lý Xưởng';
            case 'Cắt': return 'Tổ Cắt';
            case 'In':
            case 'Chờ in': return 'Tổ In';
            case 'Ép': return 'Tổ Ép';
            case 'May': return 'Tổ May';
            case 'Kiểm Tra Chất Lượng': return 'Bộ phận Kiểm Tra (QC)';
            case 'Cắt Chi & Hoàn Thiện': return 'Tổ Hoàn Thiện';
            case 'Kế toán gửi hàng': return 'Phòng Kế Toán';
            default: return 'Bộ Phận Sản Xuất';
        }
    }

    for (var i = 0; i < steps.length; i++) {
        var s = steps[i];
        var isDone = s.is_completed;
        var stepColor = _stepColors[i % _stepColors.length];
        var bg = isDone ? '#f0fdf4' : '#f8fafc';
        var border = isDone ? '2px solid #059669' : '1px solid #e2e8f0';
        var icon = isDone ? '✅' : '<span style="display:inline-block;width:18px;height:18px;border-radius:50%;border:2px solid #cbd5e1;"></span>';
        var timeStr = '';
        if (isDone && s.completed_at) {
            timeStr = vnFormat(s.completed_at);
        }

        var deptName = getDepartmentName(s.name);
        var workerStr = isDone && s.completed_by_name ? s.completed_by_name : '—';
        var timeValue = isDone && timeStr ? timeStr : '—';

        body += '<div style="display:flex;align-items:center;gap:12px;padding:12px 14px;background:' + bg + ';border:' + border + ';border-radius:10px;transition:all .15s" '
            + 'onmouseover="this.style.boxShadow=\'0 2px 8px rgba(0,0,0,0.08)\'" onmouseout="this.style.boxShadow=\'none\'">';
        // Step number badge
        body += '<div style="min-width:28px;height:28px;border-radius:6px;background:' + stepColor + ';color:#fff;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800">' + s.short_name + '</div>';
        // Step name and details
        body += '<div style="flex:1">';
        body += '<div style="font-size:12px;font-weight:700;color:' + (isDone ? '#059669' : '#1e293b') + '">' + s.name + '</div>';
        body += '<div style="font-size:10px;color:#64748b;margin-top:4px;display:grid;grid-template-columns:80px 1fr;gap:2px 8px;">';
        body += '  <span>Bộ phận:</span> <strong style="color:#334155;">' + deptName + '</strong>';
        body += '  <span>Người làm:</span> <strong style="color:#334155;">👤 ' + workerStr + '</strong>';
        body += '  <span>Thời gian:</span> <strong style="color:#334155;">🕐 ' + timeValue + '</strong>';
        body += '</div>';
        body += '</div>';
        // Toggle button
        body += '<button onclick="_dhtToggleProdStep(' + orderId + ',' + s.step_id + ',\'' + orderCode + '\')" style="background:none;border:none;cursor:pointer;font-size:16px;padding:4px" title="' + (isDone ? 'Bỏ hoàn thành' : 'Đánh dấu hoàn thành') + '">' + icon + '</button>';
        body += '</div>';
    }
    body += '</div></div>';

    var footer = '<button class="btn btn-secondary" onclick="closeModal()" style="padding:8px 24px">Đóng</button>';
    openModal('⚙️ Quy Trình SX — ' + orderCode, body, footer);
}

async function _dhtToggleProdStep(orderId, stepId, orderCode) {
    await apiCall('/api/dht/orders/' + orderId + '/production/' + stepId, 'POST');
    // Refresh popup
    _dhtShowProduction(orderId, orderCode);
    // Also refresh the table to update badge
    _dhtLoadOrders();
}

// ========== TOGGLE SHIPPING ==========
async function _dhtToggleShip(id, current) {
    const newStatus = current === 'shipped' ? 'pending' : 'shipped';
    await apiCall(`/api/dht/orders/${id}`, 'PUT', { shipping_status: newStatus });
    await _dhtLoadOrders();
}

// ========== CREATE ORDER (2-step flow in dht_create.js) ==========
// _dhtShowCreate() is defined in public/js/pages/dht_create.js


// ========== DETAIL MODAL ==========
async function _dhtShowDetail(id) {
    try {
        const data = await apiCall(`/api/dht/orders/${id}/detail`);
        if (!data.order) { showToast('Không tìm thấy đơn hàng', 'error'); return; }
        const o = data.order;
        window._dhtCurrentOrder = o; // Store for sub-modals like Báo Đơn Lỗi
        const items = data.items || [];
        const payments = data.payments || [];
        const surcharges = data.surcharges || [];
        const auditLogs = data.audit_logs || [];
        const fmt = n => Number(n || 0).toLocaleString('vi-VN');
        const fmtD = d => { if (!d) return '—'; const dt = new Date(d); return `${dt.getDate()}/${dt.getMonth()+1}/${dt.getFullYear()}`; };
        const formatExpectedShipDateWithDay = (dateVal) => {
            if (!dateVal) return '<span style="color:#94a3b8;font-style:italic">Chưa có</span>';
            const dt = new Date(dateVal);
            const localDt = new Date(dt.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
            const day = localDt.getDate();
            const month = localDt.getMonth() + 1;
            const daysOfWeek = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
            const dayName = daysOfWeek[localDt.getDay()];
            return `${dayName} - Ngày ${day}/${month}`;
        };
        // Recalculate totals from items (source of truth)
        let calcBase = 0, calcVat = 0;
        for (const it of items) {
            try {
                const qs = typeof it.quantities === 'string' ? JSON.parse(it.quantities) : (it.quantities||[]);
                const base = qs.reduce((s,x) => s + (Number(x.qty)||0) * (Number(x.price)||0), 0);
                calcBase += base;
                calcVat += (Number(it.item_total) || 0) - base;
            } catch(e) { calcBase += Number(it.item_total) || 0; }
        }
        if (calcVat < 0) calcVat = 0;
        const deposit = Number(o.deposit_amount) || 0;
        const vat = calcVat;
        const discount = Number(o.discount_amount) || 0;
        const surchargeTotal = surcharges.reduce((s, x) => s + Number(x.amount || 0), 0);
        const total = calcBase + calcVat + surchargeTotal - discount;
        const remaining = total - deposit;
        const priColors = { 'GẤP': '#dc2626', 'GỬI': '#2563eb', 'CHUẨN': '#7c3aed' };
        const priColor = priColors[o.shipping_priority] || '#7c3aed';
        const typeLabels = { thanh_toan: 'TT', dat_coc: 'Cọc', tt_sll: 'TT SLL', pending: '⏳ Chờ', tra_lai_coc: 'Trả Lại Cọc' };

        // ── Section 1: Action Buttons (permission-aware) ──
        // Hide when opened from shipping page
        var actionsHTML = '';
        if (window._dhtDetailSource !== 'shipping') {
        // Mỗi nút có feature key riêng → GĐ tick từng nút trong trang Phân Quyền
        actionsHTML = `<div style="background:linear-gradient(135deg,#f8fafc,#f1f5f9);border-radius:14px;padding:16px;display:flex;flex-wrap:wrap;gap:8px;justify-content:center;border:1px solid #e2e8f0;margin-bottom:16px">`;
        const _isFullyPaid = remaining <= 0;
        const actionBtns = [
            { icon: '✏️', label: 'Sửa đơn', color: '#3b82f6', bg: '#dbeafe', fn: `closeModal();_dhtEditOrderFull(${id})`, perm: canDo('dht_sua_don', 'view'), disabled: _isFullyPaid, disabledTitle: 'Đã thu đủ tiền — không thể sửa đơn' },
            { icon: '🗑️', label: 'Xóa đơn', color: '#dc2626', bg: '#fee2e2', fn: `closeModal();_dhtDeleteOrder(${id})`, perm: canDo('dht_xoa_don', 'view') },
            { icon: '🚨', label: 'Báo đơn lỗi', color: '#ea580c', bg: '#ffedd5', fn: `_dhtReportError()`, perm: canDo('dht_bao_loi', 'view') },
            { icon: '🏷️', label: 'Giảm Giá', color: '#059669', bg: '#d1fae5', fn: `_dhtApplyDiscount(${id})`, perm: canDo('dht_giam_gia', 'view') },
            { icon: o.zalo_oa_sent ? '✅' : '📱', label: o.zalo_oa_sent ? 'Đã Gửi Zalo OA' : 'Chưa Gửi Zalo OA', color: o.zalo_oa_sent ? '#059669' : '#94a3b8', bg: o.zalo_oa_sent ? '#d1fae5' : '#f1f5f9', fn: `alert('Chức năng Zalo OA sẽ được kết nối sau!')`, perm: canDo('dht_zalo_oa', 'view') },
            { icon: '🖨️', label: 'In Phiếu', color: '#7c3aed', bg: '#ede9fe', fn: `_dhtPrintOrder(${id})`, perm: canDo('dht_in_phieu', 'view') },
            { icon: o.sx_print_confirmed ? '✅' : '🏭', label: o.sx_print_confirmed ? 'Đã In Phiếu SX' : 'In Phiếu SX', color: o.sx_print_confirmed ? '#059669' : '#0891b2', bg: o.sx_print_confirmed ? '#d1fae5' : '#cffafe', fn: `_dhtShowPhieuSX(${id})`, perm: true },
            { icon: '🔧', label: 'Lên Đơn Sửa', color: (o.has_error && o.all_errors_handed_over) ? '#b45309' : '#cbd5e1', bg: (o.has_error && o.all_errors_handed_over) ? '#fef3c7' : '#f1f5f9', fn: `_dhtCreateRepairOrder(${id})`, disabled: !(o.has_error && o.all_errors_handed_over), perm: canDo('dht_don_sua', 'view'), disabledTitle: !o.has_error ? 'Cần báo đơn lỗi trước' : 'Cần bàn giao Hàng Lỗi Về cho QLX trước', extraClass: (o.has_error && o.all_errors_handed_over) ? 'dht-don-sua-glow' : '' },
            { icon: '📦', label: 'Hàng Lỗi Về', color: o.has_error ? (o.all_errors_handed_over ? '#059669' : '#0369a1') : '#cbd5e1', bg: o.has_error ? (o.all_errors_handed_over ? '#d1fae5' : '#e0f2fe') : '#f1f5f9', fn: `_dhtErrorReturnHandover(${id})`, disabled: !o.has_error, perm: canDo('dht_bao_loi', 'view'), disabledTitle: 'Cần báo đơn lỗi trước', extraClass: o.has_error ? 'dht-hang-loi-ve-glow' : '' },
            { icon: '🚫', label: 'Hủy Đơn Trả Cọc', color: '#be123c', bg: '#ffe4e6', fn: `alert('Chức năng Hủy Đơn Trả Cọc đang phát triển!')`, perm: canDo('dht_huy_don_tra_coc', 'view') },
        ];
        for (const a of actionBtns) {
            const noPerm = a.perm === false;
            const isDisabled = a.disabled || noPerm;
            const disabledTitle = noPerm ? '🔒 Bạn không có quyền' : (a.disabledTitle || 'Cần báo đơn lỗi trước');
            if (isDisabled) {
                actionsHTML += `<div style="text-align:center;padding:10px 14px;border-radius:12px;min-width:80px;opacity:0.35;cursor:not-allowed;filter:grayscale(${noPerm ? '0.6' : '0'})" title="${disabledTitle}">`;
                actionsHTML += `<div style="width:42px;height:42px;border-radius:50%;background:${a.bg};display:flex;align-items:center;justify-content:center;margin:0 auto 5px;font-size:18px">${noPerm ? '🔒' : a.icon}</div>`;
                actionsHTML += `<div style="font-size:10px;font-weight:700;color:${a.color}">${a.label}</div></div>`;
            } else {
                actionsHTML += `<div onclick="${a.fn}" class="${a.extraClass || ''}" style="text-align:center;cursor:pointer;padding:10px 14px;border-radius:12px;transition:all .15s;min-width:80px" onmouseover="this.style.background='${a.bg}'" onmouseout="this.style.background='transparent'">`;
                actionsHTML += `<div style="width:42px;height:42px;border-radius:50%;background:${a.bg};display:flex;align-items:center;justify-content:center;margin:0 auto 5px;font-size:18px">${a.icon}</div>`;
                actionsHTML += `<div style="font-size:10px;font-weight:700;color:${a.color}">${a.label}</div></div>`;
            }
        }
        actionsHTML += `</div>`;
        } // end if not shipping

        // ── Section 2: Chi tiết đơn hàng (Items) ──
        // Store items globally for click-to-detail
        window._dhtDetailItems = items;
        var itemsHTML = '';
        if (items.length > 0) {
            itemsHTML = `<div style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;padding:8px;margin-bottom:16px;overflow:hidden">`;
            itemsHTML += `<div style="font-weight:800;font-size:14px;color:var(--navy);margin-bottom:12px">📦 Chi tiết đơn hàng <span style="background:var(--gold);color:#fff;padding:2px 8px;border-radius:10px;font-size:11px;margin-left:6px">${items.length}</span> <span style="font-size:11px;color:#94a3b8;font-weight:500;margin-left:4px">— Bấm vào dòng để xem chi tiết</span></div>`;
            itemsHTML += `<div><table style="width:100%;border-collapse:collapse;font-size:11px">`;
            itemsHTML += `<thead><tr style="background:var(--navy);color:#fff"><th style="padding:6px;text-align:left;font-size:10px">PHỐI</th><th style="padding:6px;text-align:left;font-size:10px">SẢN PHẨM</th><th style="padding:6px;text-align:left;font-size:10px">CHẤT LIỆU</th><th style="padding:6px;text-align:left;font-size:10px">MÀU</th><th style="padding:6px;text-align:center;font-size:10px">SL</th><th style="padding:6px;text-align:right;font-size:10px">ĐƠN GIÁ</th><th style="padding:6px;text-align:center;font-size:10px">VAT</th><th style="padding:6px;text-align:right;font-size:10px;white-space:nowrap">THÀNH TIỀN</th></tr></thead><tbody>`;
            const _phoiColors = ['#7c3aed','#2563eb','#059669','#d97706','#dc2626'];
            const _phoiBgs = ['#f5f3ff','#eff6ff','#ecfdf5','#fffbeb','#fef2f2'];
            for (let idx = 0; idx < items.length; idx++) {
                const it = items[idx];
                const saleText = (it.sale_type || '').toLowerCase();
                const isBan = saleText === 'bán' || saleText === 'ban';
                const saleBadge = isBan ? '<span style="background:#059669;color:#fff;padding:2px 8px;border-radius:6px;font-size:10px;font-weight:700">Bán</span>' : '<span style="background:#f59e0b;color:#fff;padding:2px 8px;border-radius:6px;font-size:10px;font-weight:700">Quà</span>';
                let itVat = 0;
                try { const qs = typeof it.quantities === 'string' ? JSON.parse(it.quantities) : (it.quantities||[]); const base = qs.reduce((s,x)=>s+(Number(x.qty)||0)*(Number(x.price)||0),0); if(base>0 && Number(it.item_total)>base) itVat=Math.round((Number(it.item_total)-base)/base*100); } catch(e){}
                let matPairs = [];
                try { matPairs = typeof it.material_pairs === 'string' ? JSON.parse(it.material_pairs) : (it.material_pairs || []); } catch(e){}
                // Fallback: if no material_pairs, use legacy material_name/color_name
                if (matPairs.length === 0) {
                    matPairs = [{ material_name: it.material_name || '—', color_name: it.color_name || '—' }];
                }
                const totalQty = it.quantity || 0;
                for (let pi = 0; pi < matPairs.length; pi++) {
                    const mp = matPairs[pi];
                    const isFirst = pi === 0;
                    const pColor = _phoiColors[idx % _phoiColors.length];
                    const pBg = _phoiBgs[idx % _phoiBgs.length];
                    const pLabel = matPairs.length > 1 ? `PHỐI ${pi+1}` : '';
                    const phieuLabel = `Phiếu ${idx+1}`;
                    const labelText = pLabel ? `${pLabel} — ${phieuLabel}` : phieuLabel;
                    itemsHTML += `<tr style="border-bottom:1px solid #f1f5f9;cursor:pointer;transition:background .15s;border-left:4px solid ${pColor};background:${isFirst ? '' : pBg}" onclick="_dhtShowItemDetail(${idx})" onmouseover="this.style.background='${pBg}'" onmouseout="this.style.background='${isFirst ? '' : pBg}'">`;
                    // Col 1: Phối label + Sale badge (only first row)
                    itemsHTML += `<td style="padding:6px"><div style="font-size:10px;font-weight:800;color:${pColor}">${labelText}</div>${isFirst ? '<div style="margin-top:3px">'+saleBadge+'</div>' : ''}</td>`;
                    // Col 2: Product name (only first row)
                    itemsHTML += `<td style="padding:6px;font-weight:700;color:var(--navy)">${isFirst ? (it.product_name || it.description || '—') + ' <span style="font-size:9px;color:#94a3b8">🔍</span>' : '<span style="color:#94a3b8;font-size:11px">↳ '+( it.product_name || '')+'</span>'}</td>`;
                    // Col 3: Material
                    itemsHTML += `<td style="padding:6px;font-weight:700;color:${pColor}">${mp.material_name || '—'}</td>`;
                    // Col 4: Color
                    itemsHTML += `<td style="padding:6px;font-weight:700;color:${pColor}">${mp.color_name || '—'}</td>`;
                    // Col 5-8: Qty, Price, VAT, Total (only first row shows financials)
                    if (isFirst) {
                        itemsHTML += `<td style="padding:6px;text-align:center;font-weight:700">${totalQty}</td>`;
                        itemsHTML += `<td style="padding:6px;text-align:right;white-space:nowrap">${fmt(it.unit_price)}đ</td>`;
                        itemsHTML += `<td style="padding:6px;text-align:center;font-weight:700;color:#6366f1">${itVat > 0 ? itVat+'%' : '0%'}</td>`;
                        itemsHTML += `<td style="padding:6px;text-align:right;font-weight:800;color:#dc2626;white-space:nowrap">${fmt(it.item_total || it.total)}đ</td>`;
                    } else {
                        itemsHTML += `<td style="padding:6px;text-align:center;color:#94a3b8;font-size:11px">${totalQty}</td>`;
                        itemsHTML += `<td colspan="3" style="padding:6px;text-align:center;color:#94a3b8;font-size:10px;font-style:italic">Cùng giá với Phối 1</td>`;
                    }
                    itemsHTML += `</tr>`;
                }
            }
            itemsHTML += `</tbody></table></div></div>`;
        }

        // ── Section 3: Chi tiết cọc & thanh toán (ALWAYS VISIBLE) ──
        // If no payment records but deposit exists from cache, add synthetic row
        var displayPayments = payments.slice();
        if (displayPayments.length === 0 && deposit > 0) {
            displayPayments.push({
                payment_code: '—',
                total_order_codes: o.order_code,
                amount: deposit,
                payment_date: o.order_date || o.created_at,
                payment_type: 'dat_coc',
                payment_method: null,
                transfer_note: 'Đặt cọc khi tạo đơn',
                _synthetic: true
            });
        }
        var payHTML = `<div style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;padding:16px;margin-bottom:16px">`;
        payHTML += `<div style="font-weight:800;font-size:14px;color:var(--navy);margin-bottom:12px">💳 Chi tiết cọc / thanh toán <span style="background:#10b981;color:#fff;padding:2px 8px;border-radius:10px;font-size:11px;margin-left:6px">${displayPayments.length}</span></div>`;
        if (displayPayments.length > 0) {
            payHTML += `<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px">`;
            payHTML += `<thead><tr style="background:var(--navy);color:#fff"><th style="padding:8px 10px;text-align:left;font-size:10px;font-weight:700">MÃ THANH TOÁN</th><th style="padding:8px 10px;text-align:right;font-size:10px;font-weight:700">SỐ TIỀN</th><th style="padding:8px 10px;text-align:center;font-size:10px;font-weight:700">NGÀY TT</th><th style="padding:8px 10px;text-align:center;font-size:10px;font-weight:700">LOẠI</th><th style="padding:8px 10px;text-align:left;font-size:10px;font-weight:700">NỘI DUNG</th></tr></thead><tbody>`;
            for (const p of displayPayments) {
                payHTML += `<tr style="border-bottom:1px solid #f1f5f9${p._synthetic ? ';background:#fffbeb' : ''}">`;
                payHTML += `<td style="padding:8px 10px;font-weight:700;color:#1e40af">${p.payment_code || '—'}</td>`;
                payHTML += `<td style="padding:8px 10px;text-align:right;font-weight:800;color:#dc2626">${fmt(p.amount)}đ</td>`;
                payHTML += `<td style="padding:8px 10px;text-align:center">${fmtD(p.payment_date)}</td>`;
                payHTML += `<td style="padding:8px 10px;text-align:center"><span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:6px;font-size:10px;font-weight:700">${typeLabels[p.payment_type] || p.payment_type || '—'}</span></td>`;
                payHTML += `<td style="padding:8px 10px;color:#64748b;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${(p.transfer_note||'').replace(/"/g,'&quot;')}">${p.transfer_note || '—'}</td>`;
                payHTML += `</tr>`;
            }
            payHTML += `</tbody></table></div>`;
        } else {
            payHTML += `<div style="text-align:center;padding:16px;color:#94a3b8;font-size:13px">Chưa có thanh toán / cọc nào được ghi nhận</div>`;
        }
        payHTML += `</div>`;

        // ── Section 4: Phụ phí ──
        var surHTML = '';
        if (surcharges.length > 0) {
            surHTML = `<div style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;padding:16px;margin-bottom:16px">`;
            surHTML += `<div style="font-weight:800;font-size:14px;color:var(--navy);margin-bottom:12px">📋 Phụ phí <span style="background:#f59e0b;color:#fff;padding:2px 8px;border-radius:10px;font-size:11px;margin-left:6px">${surcharges.length}</span></div>`;
            for (const sc of surcharges) {
                surHTML += `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f1f5f9">`;
                surHTML += `<span style="font-weight:600;color:#334155">${sc.name || 'Phụ phí'}</span>`;
                surHTML += `<span style="font-weight:800;color:#dc2626">${fmt(sc.amount)}đ</span>`;
                surHTML += `</div>`;
            }
            surHTML += `</div>`;
        }

        // ── Section 5: Tổng kết tài chính ──
        const shipCK = (o.shipping_fee_payer === 'hv' && o.shipping_fee_method === 'ck') ? (Number(o.shipping_fee) || 0) : 0;
        const finRemaining = calcBase + surchargeTotal + vat - discount - deposit - shipCK;
        const remColor = finRemaining > 0 ? '#dc2626' : '#059669';
        var finHTML = `<div style="background:linear-gradient(135deg,#fefce8,#fef9c3);border-radius:12px;border:1px solid #fde68a;padding:16px;margin-bottom:16px">`;
        finHTML += `<div style="font-weight:800;font-size:14px;color:#92400e;margin-bottom:12px">💰 Tổng kết tài chính</div>`;
        const finRows = [
            ['Tổng tiền hàng (trước VAT)', fmt(calcBase) + 'đ', '#1e293b', false],
            ['Phụ phí', fmt(surchargeTotal) + 'đ', '#f59e0b', false],
            ['VAT', fmt(vat) + 'đ', '#6366f1', false],
            ['Ưu đãi / Giảm giá', '-' + fmt(discount) + 'đ', '#059669', false],
        ];
        if (o.discount_reason) {
            finRows.push(['_reason_', o.discount_reason, '#dc2626', false]);
        }
        finRows.push(
            ['Tổng Tiền Hàng Thực Tế', fmt(calcBase + surchargeTotal + vat - discount) + 'đ', '#1e293b', true],
            ['Đã thanh toán (cọc)', fmt(deposit) + 'đ', '#10b981', true],
        );
        if (shipCK > 0) {
            finRows.push(['🚚 Ship HV Trả CK', fmt(shipCK) + 'đ', '#7c3aed', true]);
        }
        finRows.push(
            ['Còn lại', fmt(finRemaining) + 'đ', remColor, true],
        );
        for (const [label, val, color, bold] of finRows) {
            if (label === '_reason_') {
                finHTML += `<div style="padding:2px 0 6px 16px;border-bottom:1px solid rgba(0,0,0,0.05)">`;
                finHTML += `<span style="font-size:11px;color:#dc2626;font-weight:700;font-style:italic">📝 Lý do: ${val}</span>`;
                finHTML += `</div>`;
                continue;
            }
            finHTML += `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid rgba(0,0,0,0.05)">`;
            finHTML += `<span style="font-size:13px;color:#64748b;font-weight:${bold?700:500}">${label}</span>`;
            finHTML += `<span style="font-size:${bold?15:13}px;font-weight:${bold?900:700};color:${color}">${val}</span>`;
            finHTML += `</div>`;
        }
        finHTML += `</div>`;

        // ── Row helper ──
        const row = (label, val) => `<tr><td style="padding:8px 12px;font-size:12px;color:#64748b;font-weight:600;white-space:nowrap;vertical-align:top;width:180px">${label}</td><td style="padding:8px 12px;font-size:13px;font-weight:700;color:#1e293b;word-break:break-word">${val}</td></tr>`;
        // Parse reminders from items
        var allReminders = [];
        for (const it of items) { if(it.accounting_notes) allReminders.push(it.accounting_notes); }
        var reminderText = allReminders.length > 0 ? allReminders.join(' | ') : '<span style="color:#94a3b8;font-style:italic">Chưa có nhắc nhở</span>';

        // ── Section 6A: 📋 Sale Dặn Kế Toán Trước Gửi Hàng ──
        var saleKtHTML = `<div style="background:linear-gradient(135deg,#fff7ed,#ffedd5);border-radius:12px;border:2px solid #fb923c;padding:16px;margin-bottom:16px">`;
        saleKtHTML += `<div style="font-weight:900;font-size:15px;color:#9a3412;margin-bottom:12px">📋 Sale Dặn Kế Toán Trước Gửi Hàng</div>`;
        saleKtHTML += `<table style="width:100%;border-collapse:collapse">`;
        saleKtHTML += row('🚚 Vận Chuyển YC Của Sale', o.carrier_name || '—');
        if (o.carrier_extra) {
            var ce = typeof o.carrier_extra === 'string' ? JSON.parse(o.carrier_extra) : o.carrier_extra;
            if (ce.type === 'nha_xe') {
                saleKtHTML += row('🚌 Tên Nhà Xe', ce.bus_name || '—');
                saleKtHTML += row('📞 SĐT Nhà Xe', ce.bus_phone ? '<a href="tel:'+ce.bus_phone+'" style="color:var(--info)">'+ce.bus_phone+'</a>' : '—');
                saleKtHTML += row('📍 Địa Điểm Xe Đỗ', ce.bus_location || '—');
                saleKtHTML += row('🗺️ Xe Đi Về Đâu', ce.bus_destination || '—');
                saleKtHTML += row('🕐 Giờ Xe Chạy', ce.bus_departure_time || '—');
            } else if (ce.type === 'nguoi_nhan_ho') {
                saleKtHTML += row('🤝 Người Nhận Hộ', ce.proxy_name || '—');
                saleKtHTML += row('📍 Địa Chỉ Nhận Hộ', ce.proxy_address || '—');
                saleKtHTML += row('📞 SĐT Nhận Hộ', ce.proxy_phone ? '<a href="tel:'+ce.proxy_phone+'" style="color:var(--info)">'+ce.proxy_phone+'</a>' : '—');
            }
        }
        saleKtHTML += row('⚠️ Nhắc Nhở', reminderText);
        saleKtHTML += row('📝 Nội Dung Dặn KT', o.sale_note_for_accountant || '<span style="color:#94a3b8;font-style:italic">—</span>');
        var tcColor2 = (o.shipping_priority === 'GẤP') ? '#dc2626' : (o.shipping_priority === 'CHUẨN') ? '#7c3aed' : '#f59e0b';
        saleKtHTML += row('🏷️ TC Gửi', `<span style="color:${tcColor2};font-weight:900;font-size:14px">${o.shipping_priority || 'CHUẨN'}</span>`);
        saleKtHTML += row('📅 Ngày gửi dự kiến', formatExpectedShipDateWithDay(o.expected_ship_date));
        if (o.standard_delivery_time) saleKtHTML += row('⏰ Yêu Cầu Chuẩn Giờ Hàng Ra', `<span style="font-weight:800;color:#0369a1">${o.standard_delivery_time}</span>`);
        if (o.standard_proof_image) saleKtHTML += row('📷 Ảnh TC', `<a href="${o.standard_proof_image}" target="_blank" style="color:var(--info);font-weight:700">📷 Xem ảnh</a>`);
        var progressSaleHTML = '<span style="color:#94a3b8;font-style:italic">Chưa có ngày gửi dự kiến</span>';
        if (o.expected_ship_date) {
            var shipVN = new Date(o.expected_ship_date);
            shipVN.setHours(0,0,0,0);
            if (o.shipped_at) {
                // Shipped: compare actual ship date vs expected
                var actualVN = new Date(o.shipped_at);
                actualVN.setHours(0,0,0,0);
                var diffDays = Math.round((shipVN - actualVN) / 86400000);
                if (diffDays > 0) {
                    progressSaleHTML = '<span style="color:#0369a1;font-weight:900;font-size:14px">🚀 Nhanh ' + diffDays + ' ngày</span>';
                } else if (diffDays < 0) {
                    progressSaleHTML = '<span style="color:#dc2626;font-weight:900;font-size:14px">⚠️ Trễ ' + Math.abs(diffDays) + ' ngày</span>';
                } else {
                    progressSaleHTML = '<span style="color:#059669;font-weight:900;font-size:14px">✅ Đúng hạn</span>';
                }
            } else {
                // Unshipped: show remaining days
                var todayVN = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
                todayVN.setHours(0,0,0,0);
                var remainDays = Math.round((shipVN - todayVN) / 86400000);
                if (remainDays > 0) {
                    progressSaleHTML = '<span style="color:#3b82f6;font-weight:900;font-size:14px">📅 Còn ' + remainDays + ' ngày</span>';
                } else if (remainDays < 0) {
                    progressSaleHTML = '<span style="color:#dc2626;font-weight:900;font-size:14px">⚠️ Quá hạn ' + Math.abs(remainDays) + ' ngày</span>';
                } else {
                    progressSaleHTML = '<span style="color:#d97706;font-weight:900;font-size:14px">📦 Hôm nay gửi</span>';
                }
            }
        }
        saleKtHTML += row('📊 Tiến Độ Ra Hàng', progressSaleHTML);
        saleKtHTML += `</table></div>`;

        // ── Section 6B: 📄 Thông tin đơn hàng (cleaned) ──
        var infoHTML = `<div style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;padding:16px;margin-bottom:16px">`;
        infoHTML += `<div style="font-weight:800;font-size:14px;color:var(--navy);margin-bottom:12px">📄 Thông tin đơn hàng</div>`;
        infoHTML += `<table style="width:100%;border-collapse:collapse">`;
        infoHTML += row('Khách hàng', `<strong>${o.customer_name || '—'}</strong>`);
        infoHTML += `<tr><td style="padding:8px 12px;font-size:12px;color:#9a3412;font-weight:800;white-space:nowrap;vertical-align:top;width:180px">📞 SĐT</td><td style="padding:8px 12px;font-size:13px;font-weight:900;color:#9a3412;background:#fff7ed;border-radius:6px">${o.customer_phone ? '<a href="tel:'+o.customer_phone+'" style="color:#9a3412;text-decoration:underline">'+o.customer_phone+'</a>' : '—'}</td></tr>`;
        infoHTML += `<tr><td style="padding:8px 12px;font-size:12px;color:#9a3412;font-weight:800;white-space:nowrap;vertical-align:top;width:180px">📍 Địa chỉ</td><td style="padding:8px 12px;font-size:13px;font-weight:900;color:#9a3412;background:#fff7ed;border-radius:6px;word-break:break-word">${o.address || '—'}</td></tr>`;
        infoHTML += `<tr><td style="padding:8px 12px;font-size:12px;color:#9a3412;font-weight:800;white-space:nowrap;vertical-align:top;width:180px">🏢 Tỉnh / TP</td><td style="padding:8px 12px;font-size:13px;font-weight:900;color:#9a3412;background:#fff7ed;border-radius:6px">${o.province || '—'}</td></tr>`;
        infoHTML += row('CSKH', o.cskh_name || '—');
        infoHTML += row('Thiết kế', o.designer_name || (o.designer_type === 'old_design' ? '🎨 Thiết Kế Cũ' : '—'));
        infoHTML += row('Nguồn', o.source || '—');
        infoHTML += row('Lĩnh vực', o.category_name || '—');
        infoHTML += row('Ngày lên đơn', fmtD(o.order_date));
        infoHTML += `</table></div>`;

        // ── Section 7: 🚚 Thông tin vận chuyển ──
        var shipHTML = `<div style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;padding:16px;margin-bottom:16px">`;
        shipHTML += `<div style="font-weight:800;font-size:14px;color:var(--navy);margin-bottom:12px">🚚 Thông tin vận chuyển</div>`;
        
        const shippedItems = items.filter(it => it.shipping_status === 'shipped');
        const totalItemsCount = items.length;
        
        if (totalItemsCount > 0 && (shippedItems.length > 0 || totalItemsCount > 1)) {
            // Header summary
            let summaryText = '';
            let summaryBg = '#f1f5f9';
            let summaryColor = '#475569';
            if (shippedItems.length === 0) {
                summaryText = `📭 Chưa gửi phiếu nào (0/${totalItemsCount} phiếu)`;
            } else if (shippedItems.length < totalItemsCount) {
                summaryText = `🚚 Đang giao hàng (Đã gửi ${shippedItems.length}/${totalItemsCount} phiếu)`;
                summaryBg = '#fff7ed';
                summaryColor = '#c2410c';
            } else {
                summaryText = `✅ Đã giao hàng thành công (${totalItemsCount}/${totalItemsCount} phiếu)`;
                summaryBg = '#f0fdf4';
                summaryColor = '#15803d';
            }
            
            shipHTML += `<div style="background:${summaryBg};color:${summaryColor};padding:10px 14px;border-radius:8px;font-weight:800;font-size:13px;margin-bottom:14px;display:flex;align-items:center;gap:8px;">
                <span>${summaryText}</span>
            </div>`;
            
            // Loop through each item to display its shipping status/info
            for (let i = 0; i < items.length; i++) {
                const it = items[i];
                const itemName = it.product_name || it.description || 'Sản phẩm';
                const qty = it.quantity || 0;
                const phieuLabel = `Phiếu ${i + 1}`;
                
                if (it.shipping_status === 'shipped') {
                    // Carrier info
                    const carrierName = it.actual_carrier_name || '—';
                    let trackingDisplay = it.tracking_code || '—';
                    if (it.tracking_code && it.actual_carrier_tracking_url) {
                        const trackingUrl = it.actual_carrier_tracking_url.replace('{code}', encodeURIComponent(it.tracking_code));
                        trackingDisplay = `<a href="${trackingUrl}" target="_blank" rel="noopener" style="font-weight:700;color:#1e40af;text-decoration:underline;cursor:pointer" title="Tra cứu vận đơn">${it.tracking_code} 🔗</a>`;
                    }
                    
                    const payerLabel = it.shipping_fee_payer === 'hv' ? 'HV trả' : it.shipping_fee_payer === 'khach' ? 'Khách trả' : '—';
                    const methodLabel = it.shipping_fee_method === 'ck' ? 'Chuyển Khoản' : it.shipping_fee_method === 'tm' ? 'Tiền Mặt' : '—';
                    const payerColor = it.shipping_fee_payer === 'hv' ? '#7c3aed' : '#059669';
                    const feeAmt = Number(it.shipping_fee || 0);
                    
                    // Bill image setup
                    let billHtml = '—';
                    if (it.shipping_bill_link) {
                        const itBillCid = `_itBillImg_${id}_${it.id}`;
                        billHtml = `<span id="${itBillCid}" style="color:#64748b;font-size:11px">⏳ Đang tải bill...</span>`;
                        
                        // Deferred bill loader for this item
                        (function(_cid, _origUrl) {
                            setTimeout(async function() {
                                const el = document.getElementById(_cid);
                                if (!el) return;
                                let imgSrc = _origUrl;
                                try {
                                    if (_origUrl.includes('prnt.sc') || _origUrl.includes('prntscr.com')) {
                                        const r = await apiCall('/api/shipping/resolve-image?url=' + encodeURIComponent(_origUrl));
                                        if (r && r.direct_url) imgSrc = r.direct_url;
                                    } else {
                                        const dm = _origUrl.match(/drive\.google\.com\/file\/d\/([^\/]+)/);
                                        if (dm) imgSrc = 'https://drive.google.com/uc?export=view&id=' + dm[1];
                                        const dm2 = _origUrl.match(/drive\.google\.com\/open\?id=([^&]+)/);
                                        if (dm2) imgSrc = 'https://drive.google.com/uc?export=view&id=' + dm2[1];
                                    }
                                } catch(e) { console.warn('[BillResolve]', e); }
                                
                                const img = document.createElement('img');
                                img.src = imgSrc;
                                img.style.cssText = 'max-width:180px;max-height:140px;border-radius:6px;border:1px solid #e2e8f0;cursor:pointer;object-fit:contain;box-shadow:0 2px 6px rgba(0,0,0,.08);margin-top:4px;';
                                img.onerror = function() {
                                    el.innerHTML = '<a href="' + _origUrl + '" target="_blank" style="color:#3b82f6;font-weight:700">📷 Xem bill (link)</a>';
                                };
                                const link = document.createElement('a');
                                link.href = _origUrl;
                                link.target = '_blank';
                                link.title = 'Click xem ảnh gốc';
                                link.appendChild(img);
                                el.innerHTML = '';
                                el.appendChild(link);
                            }, 100);
                        })(itBillCid, it.shipping_bill_link);
                    }
                    
                    const timeValue = it.actual_ship_datetime ? vnFormat(it.actual_ship_datetime) : (it.shipped_at ? vnFormat(it.shipped_at) : '—');
                    
                    shipHTML += `
                    <div style="background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:12px;padding:14px;margin-bottom:10px;box-shadow:0 2px 4px rgba(22,163,74,0.03)">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;border-bottom:1.5px solid #dcfce7;padding-bottom:8px;">
                            <span style="font-weight:800;color:#166534;font-size:13px;display:flex;align-items:center;gap:6px;">
                                📦 ${phieuLabel.toUpperCase()} — ${itemName.toUpperCase()} <span style="background:#dcfce7;color:#166534;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700;">SL: ${qty}</span>
                            </span>
                            <span style="background:#16a34a;color:white;padding:3px 10px;border-radius:20px;font-weight:800;font-size:10px;letter-spacing:0.5px;">🟢 ĐÃ GỬI</span>
                        </div>
                        <div style="font-size:12px;color:#1e293b;display:grid;grid-template-columns:140px 1fr;gap:6px 12px;align-items:start;">
                            <span style="color:#64748b;font-weight:600;">👤 Người gửi:</span> <span style="font-weight:700;color:#1e293b">${it.shipped_by_name || '—'}</span>
                            <span style="color:#64748b;font-weight:600;">📅 Thời gian gửi:</span> <span style="font-weight:700;color:#1e293b">${timeValue}</span>
                            <span style="color:#64748b;font-weight:600;">🚛 Đơn vị vận chuyển:</span> <span style="font-weight:700;color:#1e293b">${carrierName}</span>
                            ${it.tracking_code ? `<span style="color:#64748b;font-weight:600;">📦 Mã vận đơn:</span> <span>${trackingDisplay}</span>` : ''}
                            ${it.carrier_phone ? `<span style="color:#64748b;font-weight:600;">📞 SĐT Nhà Xe:</span> <span><a href="tel:${it.carrier_phone}" style="color:#2563eb;text-decoration:underline;font-weight:700">${it.carrier_phone}</a></span>` : ''}
                            ${it.receiver_name ? `<span style="color:#64748b;font-weight:600;">🤝 Người nhận:</span> <span style="font-weight:700;color:#1e293b">${it.receiver_name}</span>` : ''}
                            <span style="color:#64748b;font-weight:600;">💰 Phí gửi hàng:</span> <span style="font-weight:800;color:#dc2626">${feeAmt.toLocaleString('vi-VN')}đ</span>
                            <span style="color:#64748b;font-weight:600;">💳 Người trả ship:</span> <span><span style="font-weight:800;color:${payerColor}">${payerLabel}</span> — <span style="font-weight:700;color:#334155">${methodLabel}</span></span>
                            ${it.shipping_bill_link ? `<span style="color:#64748b;font-weight:600;vertical-align:top;padding-top:4px;">🔗 Bill gửi hàng:</span> <div>${billHtml}</div>` : ''}
                        </div>
                    </div>`;
                } else {
                    shipHTML += `
                    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:12px 14px;margin-bottom:10px;opacity:0.85;display:flex;justify-content:space-between;align-items:center;">
                        <span style="font-weight:700;color:#475569;font-size:12.5px;display:flex;align-items:center;gap:6px;">
                            📦 ${phieuLabel.toUpperCase()} — ${itemName.toUpperCase()} <span style="background:#e2e8f0;color:#475569;padding:1px 6px;border-radius:10px;font-size:10px;font-weight:700;">SL: ${qty}</span>
                        </span>
                        <span style="background:#e2e8f0;color:#475569;padding:3px 10px;border-radius:20px;font-weight:800;font-size:10px;letter-spacing:0.5px;">⏳ CHỜ GỬI</span>
                    </div>`;
                }
            }
        } else {
            // Fallback to order-level shipping details
            if (o.shipping_status === 'shipped' || o.shipped_at) {
                shipHTML += `<table style="width:100%;border-collapse:collapse">`;
                shipHTML += row('👤 Người Gửi', o.shipped_by_name ? `<span style="color:#2563eb;font-weight:800">${o.shipped_by_name}</span>` : '<span style="color:#94a3b8;font-style:italic">—</span>');
                shipHTML += row('📅 Ngày giờ gửi hàng', o.actual_ship_datetime ? vnFormat(o.actual_ship_datetime) : '<span style="color:#94a3b8;font-style:italic">—</span>');
                shipHTML += row('🚛 Vận Chuyển Thực Tế', o.actual_carrier_name ? `<span style="font-weight:800;color:#1e293b">${o.actual_carrier_name}</span>` : '<span style="color:#94a3b8;font-style:italic">—</span>');
                var _acn = (o.actual_carrier_name || '').toLowerCase();
                if (o.tracking_code) {
                    var _trackingDisplay = `<span style="font-weight:700;color:#1e40af;letter-spacing:0.5px">${o.tracking_code}</span>`;
                    if (o.actual_carrier_tracking_url) {
                        var _trackingUrl = o.actual_carrier_tracking_url.replace('{code}', encodeURIComponent(o.tracking_code));
                        _trackingDisplay = `<a href="${_trackingUrl}" target="_blank" rel="noopener" style="font-weight:700;color:#1e40af;letter-spacing:0.5px;text-decoration:underline;cursor:pointer" title="Tra cứu vận đơn">${o.tracking_code} 🔗</a>`;
                    }
                    shipHTML += row('📦 Mã vận đơn', _trackingDisplay);
                }
                if (o.shipping_bill_link) {
                    var _billCid = '_billImg_' + id;
                    shipHTML += `<tr><td style="padding:8px 0;font-size:13px;color:#64748b;vertical-align:top;width:40%">🔗 Bill gửi hàng</td><td style="padding:8px 0;font-size:13px;color:#1e293b" id="${_billCid}"><span style="color:#94a3b8;font-size:12px">⏳ Đang tải ảnh...</span></td></tr>`;
                    (function(_cid, _origUrl) {
                        setTimeout(async function() {
                            var el = document.getElementById(_cid);
                            if (!el) return;
                            var imgSrc = _origUrl;
                            try {
                                if (_origUrl.includes('prnt.sc') || _origUrl.includes('prntscr.com')) {
                                    var r = await apiCall('/api/shipping/resolve-image?url=' + encodeURIComponent(_origUrl));
                                    if (r && r.direct_url) imgSrc = r.direct_url;
                                } else {
                                    var dm = _origUrl.match(/drive\.google\.com\/file\/d\/([^\/]+)/);
                                    if (dm) imgSrc = 'https://drive.google.com/uc?export=view&id=' + dm[1];
                                    var dm2 = _origUrl.match(/drive\.google\.com\/open\?id=([^&]+)/);
                                    if (dm2) imgSrc = 'https://drive.google.com/uc?export=view&id=' + dm2[1];
                                }
                            } catch(e) { console.warn('[BillResolve]', e); }
                            var img = document.createElement('img');
                            img.src = imgSrc;
                            img.style.cssText = 'max-width:240px;max-height:200px;border-radius:8px;border:1px solid #e2e8f0;cursor:pointer;object-fit:contain;box-shadow:0 2px 8px rgba(0,0,0,.1)';
                            img.onerror = function() {
                                el.innerHTML = '<a href="' + _origUrl + '" target="_blank" style="color:#3b82f6;font-weight:700">📷 Xem bill (link)</a>';
                            };
                            var link = document.createElement('a');
                            link.href = _origUrl;
                            link.target = '_blank';
                            link.title = 'Click xem ảnh gốc';
                            link.appendChild(img);
                            el.innerHTML = '';
                            el.appendChild(link);
                        }, 100);
                    })(_billCid, o.shipping_bill_link);
                }
                if (o.carrier_phone) {
                    shipHTML += row('📞 SĐT Nhà Xe', `<a href="tel:${o.carrier_phone}" style="color:#2563eb;text-decoration:underline;font-weight:700">${o.carrier_phone}</a>`);
                }
                if (o.receiver_name) {
                    var _rnLabel = _acn.includes('nhân viên hv') || _acn.includes('nhan vien hv') ? '👷 Tên Nhân Viên Gửi Hàng' : '🤝 Tên Người Nhận Hàng';
                    shipHTML += row(_rnLabel, `<span style="font-weight:800;color:#1e293b">${o.receiver_name}</span>`);
                }
                var _sfee = Number(o.shipping_fee) || 0;
                shipHTML += row('💰 Phí Gửi Hàng', `<span style="font-weight:800;color:#dc2626">${_sfee.toLocaleString('vi-VN')}đ</span>`);
                var _payerLabel = o.shipping_fee_payer === 'hv' ? 'HV trả' : o.shipping_fee_payer === 'khach' ? 'Khách trả' : '—';
                var _methodLabel = o.shipping_fee_method === 'ck' ? 'Chuyển Khoản' : o.shipping_fee_method === 'tm' ? 'Tiền Mặt' : '—';
                var _payerColor = o.shipping_fee_payer === 'hv' ? '#7c3aed' : '#059669';
                shipHTML += row('💳 Người Trả', `<span style="font-weight:800;color:${_payerColor}">${_payerLabel}</span> — <span style="font-weight:700;color:#334155">${_methodLabel}</span>`);
                shipHTML += `</table>`;
            } else {
                shipHTML += `<div style="text-align:center;padding:16px;color:#94a3b8;font-size:13px;font-style:italic">📭 Chưa gửi hàng</div>`;
            }
        }
        shipHTML += `</div>`;

        // ── Section 8: ⚠️ Đơn Lỗi ──
        var errorHTML = `<div style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;padding:16px;margin-bottom:16px">`;
        errorHTML += `<div style="font-weight:800;font-size:14px;color:var(--navy);margin-bottom:12px">⚠️ Đơn Lỗi</div>`;
        errorHTML += `<div style="text-align:center;padding:12px;color:#94a3b8;font-size:13px;font-style:italic">Chưa có thông tin đơn lỗi</div>`;
        errorHTML += `</div>`;

        // ── Section 9: 📝 Lịch sử cập nhật (Audit Log + Dòng tiền) ──
        var histHTML = `<div style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;padding:16px;margin-bottom:16px">`;
        histHTML += `<div style="font-weight:800;font-size:14px;color:var(--navy);margin-bottom:12px">📝 Lịch sử cập nhật <span style="background:#64748b;color:#fff;padding:2px 8px;border-radius:10px;font-size:11px;margin-left:6px">${auditLogs.length || 0}</span></div>`;

        // ★ Financial summary mini-bar (calculate from payment-type entries)
        var _payInflow = 0, _payOutflow = 0;
        for (var _pi = 0; _pi < auditLogs.length; _pi++) {
            var _pl = auditLogs[_pi];
            if (_pl.action === 'payment' || _pl._is_virtual) {
                var _pAmt = Number(_pl._amount || 0);
                if (_pAmt === 0) {
                    // Parse from changes
                    try {
                        var _pch = typeof _pl.changes === 'string' ? JSON.parse(_pl.changes) : (_pl.changes || []);
                        for (var _ci2 = 0; _ci2 < _pch.length; _ci2++) {
                            if (_pch[_ci2].field === 'payment_amount') _pAmt = Number(_pch[_ci2].new) || 0;
                        }
                    } catch(e) {}
                }
                if (_pl._is_outflow || (_pl.summary && _pl.summary.indexOf('🔴') >= 0)) {
                    _payOutflow += _pAmt;
                } else {
                    _payInflow += _pAmt;
                }
            }
        }
        if (_payInflow > 0 || _payOutflow > 0) {
            var _netFlow = _payInflow - _payOutflow;
            histHTML += `<div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">`;
            histHTML += `<div style="flex:1;min-width:120px;background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:1px solid #86efac;border-radius:10px;padding:10px 12px;text-align:center">`;
            histHTML += `<div style="font-size:10px;font-weight:700;color:#059669;text-transform:uppercase;letter-spacing:0.5px">💰 Tổng Thu</div>`;
            histHTML += `<div style="font-size:16px;font-weight:900;color:#059669;margin-top:2px">${fmt(_payInflow)}đ</div>`;
            histHTML += `</div>`;
            if (_payOutflow > 0) {
                histHTML += `<div style="flex:1;min-width:120px;background:linear-gradient(135deg,#fef2f2,#fee2e2);border:1px solid #fca5a5;border-radius:10px;padding:10px 12px;text-align:center">`;
                histHTML += `<div style="font-size:10px;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:0.5px">🔴 Tổng Chi</div>`;
                histHTML += `<div style="font-size:16px;font-weight:900;color:#dc2626;margin-top:2px">${fmt(_payOutflow)}đ</div>`;
                histHTML += `</div>`;
            }
            var _remainColor = remaining > 0 ? '#dc2626' : '#059669';
            histHTML += `<div style="flex:1;min-width:120px;background:linear-gradient(135deg,#f8fafc,#f1f5f9);border:1px solid #cbd5e1;border-radius:10px;padding:10px 12px;text-align:center">`;
            histHTML += `<div style="font-size:10px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.5px">📊 Còn Lại</div>`;
            histHTML += `<div style="font-size:16px;font-weight:900;color:${_remainColor};margin-top:2px">${fmt(remaining)}đ</div>`;
            histHTML += `</div>`;
            histHTML += `</div>`;
        }

        var _actionStyles = {
            create:      { color: '#059669', bg: '#f0fdf4', border: '#059669', icon: '🟢' },
            update:      { color: '#d97706', bg: '#fffbeb', border: '#f59e0b', icon: '🟡' },
            ship:        { color: '#2563eb', bg: '#eff6ff', border: '#3b82f6', icon: '🔵' },
            discount:    { color: '#7c3aed', bg: '#f5f3ff', border: '#8b5cf6', icon: '🟣' },
            error:       { color: '#dc2626', bg: '#fef2f2', border: '#ef4444', icon: '🔴' },
            payment:     { color: '#059669', bg: '#f0fdf4', border: '#10b981', icon: '💰' },
            payment_out: { color: '#dc2626', bg: '#fef2f2', border: '#ef4444', icon: '🔴' }
        };
        if (auditLogs.length > 0) {
            for (const log of auditLogs) {
                // Determine style: payment outflow gets red, inflow gets green
                var isPaymentOutflow = log.action === 'payment' && (log._is_outflow || (log.summary && log.summary.indexOf('🔴') >= 0));
                var stKey = isPaymentOutflow ? 'payment_out' : log.action;
                var st = _actionStyles[stKey] || _actionStyles.update;

                histHTML += `<div style="padding:10px 12px;border-left:3px solid ${st.border};margin-bottom:8px;background:${st.bg};border-radius:0 8px 8px 0">`;
                histHTML += `<div style="font-size:11px;color:#64748b">${st.icon} ${vnFormat(log.created_at)}</div>`;
                histHTML += `<div style="font-size:13px;font-weight:700;color:#1e293b;margin-top:2px">👤 <span style="color:var(--info)">${log.performer_name || '—'}</span> ${log.summary}</div>`;
                // Render changes detail
                var changes = [];
                try { changes = typeof log.changes === 'string' ? JSON.parse(log.changes) : (log.changes || []); } catch(e) {}
                if (changes.length > 0 && log.action !== 'create') {
                    histHTML += `<div style="margin-top:6px;padding-left:8px;border-left:2px solid ${st.border}30">`;
                    for (var ci = 0; ci < changes.length; ci++) {
                        var c = changes[ci];
                        var isLast = ci === changes.length - 1;
                        var connector = isLast ? '└─' : '├─';
                        var _fmtVal = function(v, f) {
                            if (!v || v === '(trống)') return '<span style="color:#94a3b8;font-style:italic">(trống)</span>';
                            // Format money fields with currency
                            if (['total_amount','discount_amount','vat_amount','shipping_fee','deposit_amount_cache','surcharge_add','surcharge_edit','surcharge_del','payment_amount','remaining'].includes(f)) {
                                var numV = Number(v);
                                if (!isNaN(numV)) return numV.toLocaleString('vi-VN') + 'đ';
                            }
                            return v;
                        };

                        // Special styling for payment-related fields
                        var isAmountField = c.field === 'payment_amount';
                        var isRemainingField = c.field === 'remaining';

                        if (isAmountField) {
                            // Large, bold amount display
                            var _amtColor = isPaymentOutflow ? '#dc2626' : '#059669';
                            var _amtSign = isPaymentOutflow ? '-' : '+';
                            histHTML += `<div style="font-size:12px;color:#475569;padding:3px 0"><span style="color:#94a3b8">${connector}</span> <strong>${c.label}:</strong> <span style="font-weight:900;font-size:14px;color:${_amtColor}">${_amtSign}${_fmtVal(c.new, c.field)}</span></div>`;
                        } else if (isRemainingField) {
                            // Remaining balance with status indicator
                            var _remVal = Number(c.new) || 0;
                            var _remColor = _remVal > 0 ? '#dc2626' : '#059669';
                            var _remIcon = _remVal <= 0 ? '✅' : '⏳';
                            var _remText = _remVal <= 0 ? 'ĐÃ THU ĐỦ' : 'Chưa thu đủ';
                            histHTML += `<div style="font-size:12px;color:#475569;padding:3px 0;background:${_remVal <= 0 ? 'rgba(16,185,129,0.08)' : 'rgba(220,38,38,0.06)'};border-radius:4px;padding:4px 6px;margin-top:2px"><span style="color:#94a3b8">${connector}</span> <strong>${c.label}:</strong> <span style="font-weight:900;color:${_remColor}">${_remIcon} ${_fmtVal(c.new, c.field)} — ${_remText}</span></div>`;
                        } else if (c.field === 'error_images') {
                            // ★ Render error images as thumbnail gallery
                            var _errImgs = [];
                            try { _errImgs = typeof c.new === 'string' ? JSON.parse(c.new) : (c.new || []); } catch(e) {}
                            if (_errImgs.length > 0) {
                                histHTML += `<div style="font-size:11px;color:#475569;padding:2px 0"><span style="color:#94a3b8">${connector}</span> <strong>${c.label}:</strong></div>`;
                                histHTML += `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px;margin-left:20px">`;
                                for (var _ei = 0; _ei < _errImgs.length; _ei++) {
                                    histHTML += `<a href="${_errImgs[_ei]}" target="_blank" style="display:block"><img src="${_errImgs[_ei]}" style="width:60px;height:60px;object-fit:cover;border-radius:6px;border:2px solid #fca5a5;cursor:pointer;transition:transform .2s" onmouseover="this.style.transform='scale(1.15)'" onmouseout="this.style.transform='scale(1)'"></a>`;
                                }
                                histHTML += `</div>`;
                            }
                        } else if (c.field === 'error_video') {
                            // ★ Render error video as playable link
                            if (c.new) {
                                histHTML += `<div style="font-size:11px;color:#475569;padding:2px 0"><span style="color:#94a3b8">${connector}</span> <strong>${c.label}:</strong></div>`;
                                histHTML += `<div style="margin-top:4px;margin-left:20px"><video src="${c.new}" controls style="max-width:200px;max-height:120px;border-radius:8px;border:2px solid #fca5a5"></video></div>`;
                            }
                        } else if (c.old && c.old !== '(trống)' && c.old !== '(cũ)') {
                            histHTML += `<div style="font-size:11px;color:#475569;padding:2px 0"><span style="color:#94a3b8">${connector}</span> <strong>${c.label}:</strong> <span style="color:#dc2626;text-decoration:line-through">${_fmtVal(c.old, c.field)}</span> → <span style="color:#059669;font-weight:700">${_fmtVal(c.new, c.field)}</span></div>`;
                        } else {
                            histHTML += `<div style="font-size:11px;color:#475569;padding:2px 0"><span style="color:#94a3b8">${connector}</span> <strong>${c.label}:</strong> <span style="font-weight:700;color:${st.color}">${_fmtVal(c.new, c.field)}</span></div>`;
                        }
                    }
                    histHTML += `</div>`;
                }
                histHTML += `</div>`;
            }
        } else {
            // Fallback for legacy orders without audit logs
            if (o.created_at) histHTML += `<div style="padding:8px 12px;border-left:3px solid #059669;margin-bottom:8px;background:#f0fdf4;border-radius:0 8px 8px 0"><div style="font-size:11px;color:#64748b">🟢 ${vnFormat(o.created_at)}</div><div style="font-size:13px;font-weight:700;color:#1e293b">👤 <span style="color:var(--info)">${o.created_by_name || '—'}</span> đã tạo đơn.</div></div>`;
            if (o.last_updated_at && o.last_updated_by_name) histHTML += `<div style="padding:8px 12px;border-left:3px solid #f59e0b;margin-bottom:8px;background:#fffbeb;border-radius:0 8px 8px 0"><div style="font-size:11px;color:#64748b">🟡 ${vnFormat(o.last_updated_at)}</div><div style="font-size:13px;font-weight:700;color:#1e293b">👤 <span style="color:var(--info)">${o.last_updated_by_name}</span> đã cập nhật.</div></div>`;
            if (!o.created_at && !o.last_updated_at) histHTML += `<div style="text-align:center;padding:12px;color:#94a3b8;font-size:13px">Không có lịch sử</div>`;
        }
        histHTML += `</div>`;

        // ── Combine all sections ──
        const bodyHTML = actionsHTML + itemsHTML + payHTML + surHTML + finHTML + saleKtHTML + infoHTML + shipHTML + errorHTML + histHTML;

        const titleText = `📦 ${o.order_code} — ${fmt(finRemaining)}đ`;
        const footerHTML = `<button class="btn btn-secondary" onclick="closeModal()" style="padding:10px 28px">Đóng</button>`;
        openModal(titleText, bodyHTML, footerHTML);

        // Widen modal
        setTimeout(() => {
            const mc = document.querySelector('.modal-content');
            if (mc) { mc.style.maxWidth = '1200px'; mc.style.width = '95vw'; }
            window._dhtDetailSource = null; // Reset flag
        }, 30);
    } catch(e) {
        console.error('Detail error:', e);
        showToast('Lỗi tải chi tiết: ' + (e.message || ''), 'error');
    }
}

// ========== EDIT ORDER ==========
function _dhtEditOrder(id) {
    const o = _dht.orders.find(x => x.id === id);
    if (!o) return;
    const catOpts = _dht.categories.map(c => `<option value="${c.id}" ${c.id == o.category_id ? 'selected' : ''}>${c.name}</option>`).join('');
    const staffOpts = _dht.staff.map(s => `<option value="${s.id}" ${s.id == o.cskh_user_id ? 'selected' : ''}>${s.full_name}</option>`).join('');

    const body = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
            <div class="form-group"><label>Mã Đơn</label><input class="form-control" value="${o.order_code}" disabled></div>
            <div class="form-group"><label>Ngày Lên Đơn</label><input type="date" id="dhtEdDate" class="form-control" value="${o.order_date || ''}"></div>
            <div class="form-group"><label>Lĩnh Vực</label><select id="dhtEdCat" class="form-control"><option value="">--</option>${catOpts}</select></div>
            <div class="form-group"><label>Nguồn</label><input id="dhtEdSource" class="form-control" value="${o.source || ''}"></div>
            <div class="form-group"><label>Tên Khách</label><input id="dhtEdName" class="form-control" value="${o.customer_name || ''}"></div>
            <div class="form-group"><label>SĐT</label><input id="dhtEdPhone" class="form-control" value="${o.customer_phone || ''}"></div>
            <div class="form-group"><label>CSKH</label><select id="dhtEdCskh" class="form-control"><option value="">--</option>${staffOpts}</select></div>
            <div class="form-group" style="position:relative"><label>Thành Phố</label><input id="dhtEdProv" class="form-control" value="${o.province || ''}" autocomplete="off" placeholder="Gõ để tìm tỉnh/TP..." oninput="_dhtFilterEdProv()" onfocus="_dhtFilterEdProv()"><div id="dhtEdProvList" style="display:none;position:absolute;z-index:100;background:#fff;border:1px solid #e2e8f0;border-radius:6px;max-height:180px;overflow-y:auto;width:calc(100% - 24px);box-shadow:0 4px 12px rgba(0,0,0,0.1);margin-top:2px"></div></div>
            <div class="form-group"><label>Tổng SL</label><input type="number" id="dhtEdQty" class="form-control" value="${o.total_quantity || 0}"></div>
            <div class="form-group"><label>Tổng Tiền</label><input type="number" id="dhtEdTotal" class="form-control" value="${o.total_amount || 0}"></div>
            <div class="form-group"><label>Ưu Đãi</label><input type="number" id="dhtEdDiscount" class="form-control" value="${o.discount_amount || 0}"></div>
            <div class="form-group"><label>TC Gửi</label><select id="dhtEdPri" class="form-control">
                <option ${o.shipping_priority==='CHUẨN'?'selected':''}>CHUẨN</option>
                <option ${o.shipping_priority==='GỬI'?'selected':''}>GỬI</option>
                <option ${o.shipping_priority==='GẤP'?'selected':''}>GẤP</option></select></div>
            <div class="form-group"><label>Ngày Gửi</label><input type="date" id="dhtEdShipDate" class="form-control" value="${o.shipping_date || ''}"></div>
            <div class="form-group"><label>Ghi chú</label><input id="dhtEdNotes" class="form-control" value="${o.notes || ''}"></div>
        </div>`;

    const footer = `<button class="btn btn-secondary" onclick="closeModal()">Hủy</button>
        <button class="btn btn-primary" onclick="_dhtSubmitEdit(${id})" style="width:auto;">💾 Lưu</button>`;

    openModal('✏️ Sửa Đơn ' + o.order_code, body, footer);
}

async function _dhtSubmitEdit(id) {
    const data = await apiCall(`/api/dht/orders/${id}`, 'PUT', {
        order_date: document.getElementById('dhtEdDate')?.value || undefined,
        category_id: document.getElementById('dhtEdCat')?.value || null,
        source: document.getElementById('dhtEdSource')?.value,
        customer_name: document.getElementById('dhtEdName')?.value,
        customer_phone: document.getElementById('dhtEdPhone')?.value,
        cskh_user_id: document.getElementById('dhtEdCskh')?.value || null,
        province: document.getElementById('dhtEdProv')?.value,
        total_quantity: document.getElementById('dhtEdQty')?.value,
        total_amount: document.getElementById('dhtEdTotal')?.value,
        discount_amount: document.getElementById('dhtEdDiscount')?.value,
        shipping_priority: document.getElementById('dhtEdPri')?.value,
        shipping_date: document.getElementById('dhtEdShipDate')?.value || null,
        notes: document.getElementById('dhtEdNotes')?.value
    });
    if (data.success) { showToast('✅ Đã cập nhật'); closeModal(); await _dhtLoadTree(); await _dhtLoadOrders(); }
    else { showToast(data.error || 'Lỗi', 'error'); }
}

// ★ Edit form province filter/pick (reuses _dhtProvinces from dht_create.js)
function _dhtFilterEdProv() {
    var input = document.getElementById('dhtEdProv');
    var list = document.getElementById('dhtEdProvList');
    if (!input || !list || typeof _dhtProvinces === 'undefined') return;
    var q = (input.value || '').toLowerCase().trim();
    var matches = _dhtProvinces.filter(function(p) { return p.toLowerCase().indexOf(q) >= 0; });
    if (matches.length === 1 && matches[0].toLowerCase() === q) {
        input.value = matches[0]; input.style.borderColor = '#10b981'; list.style.display = 'none'; return;
    }
    if (matches.length === 0) {
        list.innerHTML = '<div style="padding:10px 12px;text-align:center;font-size:11px;color:#dc2626;font-weight:600">❌ Không tìm thấy</div>';
        list.style.display = 'block'; input.style.borderColor = '#ef4444'; return;
    }
    input.style.borderColor = '#daa520';
    list.innerHTML = matches.map(function(p) {
        return '<div style="padding:8px 12px;cursor:pointer;border-bottom:1px solid #f1f5f9;font-size:12px"'
            + ' onmouseover="this.style.background=\'#fef3c7\'" onmouseout="this.style.background=\'\'"'
            + ' onclick="document.getElementById(\'dhtEdProv\').value=\'' + p.replace(/'/g, "\\'") + '\';document.getElementById(\'dhtEdProv\').style.borderColor=\'#10b981\';document.getElementById(\'dhtEdProvList\').style.display=\'none\'">'
            + p + '</div>';
    }).join('');
    list.style.display = 'block';
}
document.addEventListener('click', function(e) {
    var list = document.getElementById('dhtEdProvList');
    var input = document.getElementById('dhtEdProv');
    if (list && input && !input.contains(e.target) && !list.contains(e.target)) {
        list.style.display = 'none';
        // Validate
        var val = (input.value || '').trim();
        if (val && typeof _dhtProvinces !== 'undefined') {
            var found = _dhtProvinces.find(function(p) { return p.toLowerCase() === val.toLowerCase(); });
            if (found) { input.value = found; input.style.borderColor = '#10b981'; }
            else { input.value = ''; input.style.borderColor = '#ef4444'; showToast('⚠️ Tỉnh/TP không hợp lệ — chọn từ danh sách', 'error'); }
        }
    }
});

// ========== DELETE ==========
async function _dhtDeleteOrder(id) {
    const o = _dht.orders.find(x => x.id === id);
    if (!confirm(`Xóa đơn ${o?.order_code || id}?`)) return;
    const data = await apiCall(`/api/dht/orders/${id}`, 'DELETE');
    if (data.success) { showToast('🗑️ Đã xóa'); await _dhtLoadTree(); await _dhtLoadOrders(); }
    else { showToast(data.error || 'Lỗi', 'error'); }
}

// ========== CATEGORY SETUP ==========
var _dhtCatColors = ['#b8860b','#10b981','#3b82f6','#8b5cf6','#ef4444','#ec4899','#14b8a6','#f97316','#6366f1','#84cc16'];
function _dhtShowCatSetup() { _dhtRenderCatModal(); }

function _dhtRenderCatModal() {
    var cats = _dht.categories;
    var cards = '';
    for (var i = 0; i < cats.length; i++) {
        var c = cats[i];
        var color = _dhtCatColors[i % _dhtCatColors.length];
        var isFirst = i === 0;
        var isLast = i === cats.length - 1;
        cards += '<div class="_dc-card" data-cid="'+c.id+'" style="border-left:4px solid '+color+'">'
            +'<div style="display:flex;flex-direction:column;gap:2px;margin-right:8px">'
            +'<button class="_dc-mv'+(isFirst?' _dc-dis':'')+'" onclick="_dhtMoveCat('+i+',-1)" title="Lên"'+(isFirst?' disabled':'')+'>▲</button>'
            +'<div style="text-align:center;font-size:10px;font-weight:800;color:#b8860b;min-width:18px">'+String(i+1).padStart(2,'0')+'</div>'
            +'<button class="_dc-mv'+(isLast?' _dc-dis':'')+'" onclick="_dhtMoveCat('+i+',1)" title="Xuống"'+(isLast?' disabled':'')+'>▼</button>'
            +'</div>'
            +'<div style="width:4px;border-radius:3px;background:'+color+';flex-shrink:0"></div>'
            +'<div style="flex:1;min-width:0;padding:0 8px">'
            +'<input class="_dc-input dht-cat-name" data-id="'+c.id+'" value="'+c.name+'" spellcheck="false" onkeydown="if(event.key===\'Enter\')_dhtSaveCat('+c.id+')">'
            +'</div>'
            +'<div style="display:flex;gap:3px;flex-shrink:0">'
            +'<button class="_dc-btn" onclick="_dhtSaveCat('+c.id+')" title="Lưu" style="background:rgba(16,185,129,0.12);color:#059669">💾</button>'
            +'<button class="_dc-btn" onclick="_dhtDelCat('+c.id+')" title="Xóa" style="background:rgba(239,68,68,0.08);color:#dc2626">✕</button>'
            +'</div></div>';
    }
    if (cats.length === 0) {
        cards = '<div style="text-align:center;padding:32px 16px;color:#94a3b8"><div style="font-size:36px;margin-bottom:8px">🏷️</div>Chưa có lĩnh vực nào.<br><span style="font-size:11px">Thêm lĩnh vực đầu tiên bên dưới!</span></div>';
    }
    var body = '<div style="background:#f8fafc;border-radius:12px;padding:16px;border:1px solid #e2e8f0;margin-bottom:16px">'
        +'<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">'
        +'<div style="width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#b8860b,#daa520);display:flex;align-items:center;justify-content:center;font-size:18px;color:#fff">⚙️</div>'
        +'<div style="flex:1"><div style="font-weight:800;font-size:15px;color:var(--navy)">Lĩnh Vực Kinh Doanh</div>'
        +'<div style="font-size:11px;color:#64748b">Sắp xếp thứ tự hiển thị trên sidebar</div></div>'
        +'<div style="background:linear-gradient(135deg,#ffd700,#daa520);padding:4px 14px;border-radius:20px;font-size:11px;font-weight:800;color:#fff">'+cats.length+'</div>'
        +'</div>'
        +'<div class="_dc-list" style="max-height:360px;overflow-y:auto">'+cards+'</div></div>'
        +'<div style="background:#fffbeb;border-radius:10px;padding:12px 14px;border:1px dashed #d4a017">'
        +'<div style="font-size:11px;font-weight:800;color:#b8860b;margin-bottom:8px">➕ THÊM LĨNH VỰC MỚI</div>'
        +'<div style="display:flex;gap:8px">'
        +'<input id="dhtNewCatName" class="form-control" placeholder="Nhập tên lĩnh vực..." style="flex:1;font-size:13px;border:1px solid #e2e8f0;border-radius:8px;padding:8px 12px" onkeydown="if(event.key===\'Enter\')_dhtAddCat()">'
        +'<button onclick="_dhtAddCat()" style="background:linear-gradient(135deg,#b8860b,#daa520);color:#fff;border:none;padding:8px 20px;border-radius:8px;font-size:13px;font-weight:800;cursor:pointer;white-space:nowrap">➕ Thêm</button>'
        +'</div></div>';

    if (!document.getElementById('dhtCatCSS2')) {
        var st = document.createElement('style'); st.id = 'dhtCatCSS2';
        st.textContent = '._dc-card{display:flex;align-items:center;padding:8px 10px;background:#fff;border-radius:8px;margin-bottom:5px;transition:all .15s;box-shadow:0 1px 3px rgba(0,0,0,0.06)}'
            +'._dc-card:hover{box-shadow:0 2px 8px rgba(184,134,11,0.15);transform:translateY(-1px)}'
            +'._dc-input{background:transparent;border:1px solid transparent;color:var(--navy);font-size:13px;font-weight:700;padding:6px 8px;border-radius:6px;width:100%;transition:all .15s}'
            +'._dc-input:focus{background:#fff;border-color:#daa520;outline:none;box-shadow:0 0 0 2px rgba(218,165,32,0.15)}'
            +'._dc-btn{width:30px;height:30px;border-radius:6px;border:none;cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center;transition:all .15s}'
            +'._dc-btn:hover{transform:scale(1.15)}'
            +'._dc-mv{width:18px;height:16px;border:none;border-radius:3px;background:transparent;cursor:pointer;font-size:8px;color:#94a3b8;display:flex;align-items:center;justify-content:center;transition:all .1s;padding:0}'
            +'._dc-mv:hover{background:#fef3c7;color:#b8860b}'
            +'._dc-dis{opacity:0.2;cursor:not-allowed}._dc-dis:hover{background:transparent;color:#94a3b8}';
        document.head.appendChild(st);
    }

    openModal('⚙️ Quản Lý Lĩnh Vực', body, '<button class="btn btn-secondary" onclick="closeModal()" style="padding:8px 24px">Đóng</button>');
    setTimeout(function(){document.getElementById('dhtNewCatName')?.focus()},200);
}

// ========== PET/TEM SOURCE MANAGEMENT ==========
async function _dhtShowSourceSetup(type) {
    var label = type === 'tem' ? 'TEM' : 'PET';
    var emoji = type === 'tem' ? '🏷️' : '🐾';
    var color = type === 'tem' ? '#7c3aed' : '#059669';
    var apiUrl = '/api/dht/' + type + '-sources';

    try {
        var res = await apiCall(apiUrl);
        var items = res.items || [];

        var cards = items.map(function(s) {
            return '<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:#fff;border-radius:8px;margin-bottom:4px;border-left:3px solid '+color+';box-shadow:0 1px 3px rgba(0,0,0,0.05)">'
                + '<span style="flex:1;font-weight:700;font-size:13px;color:#1e293b">' + s.name + '</span>'
                + '<button onclick="_dhtDelSource(\''+type+'\','+s.id+')" style="background:#fee2e2;color:#dc2626;border:none;width:28px;height:28px;border-radius:6px;cursor:pointer;font-size:12px" title="Xóa">✕</button>'
                + '</div>';
        }).join('');

        if (items.length === 0) {
            cards = '<div style="text-align:center;padding:24px;color:#94a3b8"><div style="font-size:28px;margin-bottom:6px">' + emoji + '</div>Chưa có nguồn ' + label + ' nào</div>';
        }

        var body = '<div style="background:#f8fafc;border-radius:10px;padding:14px;border:1px solid #e2e8f0;margin-bottom:14px">'
            + '<div style="font-weight:800;font-size:13px;color:'+color+';margin-bottom:10px">' + emoji + ' Danh Sách Nguồn ' + label + ' (' + items.length + ')</div>'
            + '<div style="max-height:300px;overflow-y:auto">' + cards + '</div></div>'
            + '<div style="background:#fffbeb;border-radius:10px;padding:12px;border:1px dashed '+color+'">'
            + '<div style="font-size:11px;font-weight:800;color:'+color+';margin-bottom:8px">➕ THÊM NGUỒN ' + label + ' MỚI</div>'
            + '<div style="display:flex;gap:8px">'
            + '<input id="_dhtNewSrcName" class="form-control" placeholder="Nhập tên nguồn..." style="flex:1;font-size:13px;padding:8px 12px;border-radius:8px" onkeydown="if(event.key===\'Enter\')_dhtAddSource(\''+type+'\')">'
            + '<button onclick="_dhtAddSource(\''+type+'\')" style="background:'+color+';color:#fff;border:none;padding:8px 20px;border-radius:8px;font-size:13px;font-weight:800;cursor:pointer;white-space:nowrap">➕ Thêm</button>'
            + '</div></div>';

        openModal(emoji + ' Quản Lý Nguồn ' + label, body, '<button class="btn btn-secondary" onclick="closeModal()" style="padding:8px 24px">Đóng</button>');
        setTimeout(function(){document.getElementById('_dhtNewSrcName')?.focus()},200);
    } catch(e) {
        showToast('Lỗi tải nguồn ' + label, 'error');
    }
}

async function _dhtAddSource(type) {
    var nameEl = document.getElementById('_dhtNewSrcName');
    var name = (nameEl?.value || '').trim();
    if (!name) { showToast('Nhập tên nguồn', 'error'); return; }
    try {
        await apiCall('/api/dht/' + type + '-sources', 'POST', { name: name });
        showToast('Đã thêm nguồn!', 'success');
        _dhtShowSourceSetup(type);
    } catch(e) {
        showToast('Lỗi: ' + (e.message || ''), 'error');
    }
}

async function _dhtDelSource(type, id) {
    if (!confirm('Xóa nguồn này?')) return;
    try {
        await apiCall('/api/dht/' + type + '-sources/' + id, 'DELETE');
        showToast('Đã xóa nguồn!', 'success');
        _dhtShowSourceSetup(type);
    } catch(e) {
        showToast('Lỗi xóa: ' + (e.message || ''), 'error');
    }
}

async function _dhtMoveCat(index, dir) {
    var newIdx = index + dir;
    if (newIdx < 0 || newIdx >= _dht.categories.length) return;
    // Swap in local array
    var temp = _dht.categories[index];
    _dht.categories[index] = _dht.categories[newIdx];
    _dht.categories[newIdx] = temp;
    // Send new order to backend
    var ids = _dht.categories.map(function(c){return c.id;});
    await apiCall('/api/dht/categories/reorder', 'PUT', { ids: ids });
    _dhtRenderCatModal();
    _dhtLoadTree();
}


async function _dhtAddCat() {
    const name = document.getElementById('dhtNewCatName')?.value?.trim();
    if (!name) { showToast('Nhập tên', 'error'); return; }
    const data = await apiCall('/api/dht/categories', 'POST', { name });
    if (data.success) {
        _dht.categories.push(data.category);
        showToast('✅ Đã thêm ' + name);
        _dhtRenderCatModal();
        _dhtLoadTree();
    } else { showToast(data.error || 'Lỗi', 'error'); }
}

async function _dhtSaveCat(id) {
    const input = document.querySelector(`.dht-cat-name[data-id="${id}"]`);
    if (!input) return;
    const data = await apiCall(`/api/dht/categories/${id}`, 'PUT', { name: input.value.trim() });
    if (data.success) {
        const c = _dht.categories.find(x => x.id === id);
        if (c) c.name = input.value.trim();
        showToast('✅ Đã cập nhật');
        _dhtLoadTree();
    } else { showToast(data.error || 'Lỗi', 'error'); }
}

async function _dhtDelCat(id) {
    if (!confirm('Xóa lĩnh vực này?')) return;
    const data = await apiCall(`/api/dht/categories/${id}`, 'DELETE');
    if (data.success) {
        _dht.categories = _dht.categories.filter(x => x.id !== id);
        showToast('🗑️ Đã xóa');
        _dhtRenderCatModal();
        _dhtLoadTree();
    } else { showToast(data.error || 'Lỗi', 'error'); }
}

// ========== EXPORT ==========
function _dhtExport() {
    const f = _dht.filter;
    let url = '/api/dht/orders/export?';
    if (f.year) url += `year=${f.year}&`;
    if (f.month) url += `month=${f.month}&`;
    if (f.day) url += `day=${f.day}&`;
    if (f.category_id) url += `category_id=${f.category_id}&`;
    window.open(url, '_blank');
}

// ========== ITEM DETAIL POPUP ==========
function _dhtShowItemDetail(idx) {
    const it = (window._dhtDetailItems || [])[idx];
    if (!it) return;
    const fmt = n => Number(n || 0).toLocaleString('vi-VN');
    const row = (label, val) => `<tr><td style="padding:6px 10px;font-size:12px;color:#64748b;font-weight:600;white-space:nowrap;width:140px">${label}</td><td style="padding:6px 10px;font-size:13px;font-weight:700;color:#1e293b">${val}</td></tr>`;
    const canSeeCost = typeof currentUser !== 'undefined' && currentUser && ['giam_doc', 'quan_ly_cap_cao'].includes(currentUser.role);

    // Parse JSON fields
    let quantities = [], techniques = [], extraMats = [], matPairs = [];
    try { quantities = typeof it.quantities === 'string' ? JSON.parse(it.quantities) : (it.quantities || []); } catch(e){}
    try { techniques = typeof it.sewing_techniques === 'string' ? JSON.parse(it.sewing_techniques) : (it.sewing_techniques || []); } catch(e){}
    try { extraMats = typeof it.extra_materials === 'string' ? JSON.parse(it.extra_materials) : (it.extra_materials || []); } catch(e){}
    try { matPairs = typeof it.material_pairs === 'string' ? JSON.parse(it.material_pairs) : (it.material_pairs || []); } catch(e){}
    extraMats = extraMats.filter(m => m && m.trim());

    // Calculate VAT
    let baseTotal = 0;
    for (const q of quantities) { baseTotal += (Number(q.qty)||0) * (Number(q.price)||0); }
    const vatAmount = (Number(it.item_total) || 0) - baseTotal;
    const vatPercent = baseTotal > 0 && vatAmount > 0 ? Math.round(vatAmount / baseTotal * 100) : 0;

    var html = `<div style="padding:20px">`;

    // Header
    const saleText = (it.sale_type || '').toLowerCase();
    const isBan = saleText === 'bán' || saleText === 'ban';
    const saleBadge = isBan ? '<span style="background:#059669;color:#fff;padding:3px 10px;border-radius:8px;font-size:11px;font-weight:700">Bán</span>' : '<span style="background:#f59e0b;color:#fff;padding:3px 10px;border-radius:8px;font-size:11px;font-weight:700">Quà</span>';
    html += `<div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">${saleBadge}<span style="font-size:18px;font-weight:900;color:var(--navy)">${it.product_name || '—'}</span></div>`;

    // Basic info + VAT
    html += `<div style="background:#f8fafc;border-radius:10px;padding:12px;margin-bottom:14px"><table style="width:100%;border-collapse:collapse">`;
    html += row('Áo mẫu (TSAM)', it.pattern_name || '—');
    html += row('Tiền hàng (trước VAT)', `${fmt(baseTotal)}đ`);
    html += row('VAT', vatPercent > 0 ? `<span style="color:#6366f1;font-weight:800">${vatPercent}% → ${fmt(vatAmount)}đ</span>` : '<span style="color:#94a3b8">0%</span>');
    html += row('Thành tiền (sau VAT)', `<span style="color:#dc2626;font-size:15px">${fmt(it.item_total)}đ</span>`);
    if (it.extra_product) html += row('SP phụ', it.extra_product + (it.extra_price ? ' (+' + fmt(it.extra_price) + 'đ)' : ''));
    if (it.accounting_notes) html += row('Nhắc nhở KT', `<span style="color:#f59e0b">${it.accounting_notes}</span>`);
    html += `</table></div>`;

    // Material pairs
    if (matPairs.length > 0) {
        html += `<div style="margin-bottom:14px"><div style="font-weight:800;font-size:13px;color:var(--navy);margin-bottom:8px">🎨 Vải - Màu (${matPairs.length} phối)</div>`;
        for (const mp of matPairs) {
            html += `<div style="display:inline-flex;align-items:center;gap:6px;background:#eef2ff;padding:6px 12px;border-radius:8px;margin:0 6px 6px 0;font-size:12px;font-weight:700;color:#4338ca">${mp.material_name} — ${mp.color_name}</div>`;
        }
        html += `</div>`;
    }

    // Quantities breakdown
    if (quantities.length > 0) {
        html += `<div style="margin-bottom:14px"><div style="font-weight:800;font-size:13px;color:var(--navy);margin-bottom:8px">📊 Chi tiết số lượng & giá</div>`;
        html += `<table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr style="background:var(--navy);color:#fff"><th style="padding:6px 10px;text-align:center">SL</th><th style="padding:6px 10px;text-align:right">Đơn Giá</th><th style="padding:6px 10px;text-align:center">VAT</th><th style="padding:6px 10px;text-align:right">Thành Tiền</th></tr></thead><tbody>`;
        for (const q of quantities) {
            const qBase = (Number(q.qty)||0) * (Number(q.price)||0);
            const qVatAmt = (Number(q.subtotal)||qBase) - qBase;
            const qVatPct = qBase > 0 && qVatAmt > 0 ? Math.round(qVatAmt / qBase * 100) : 0;
            html += `<tr style="border-bottom:1px solid #f1f5f9"><td style="padding:6px 10px;text-align:center;font-weight:700">${q.qty}</td><td style="padding:6px 10px;text-align:right">${fmt(q.price)}đ</td><td style="padding:6px 10px;text-align:center;font-weight:700;color:#6366f1">${vatPercent > 0 ? vatPercent+'%' : '0%'}</td><td style="padding:6px 10px;text-align:right;font-weight:800;color:#dc2626">${fmt(qBase + (qBase * vatPercent / 100))}đ</td></tr>`;
        }
        html += `</tbody></table></div>`;
    }

    // Sewing techniques — show names for all, prices only for giam_doc/qlcc
    if (techniques.length > 0) {
        const tsamFP = Number(it.tsam_factory_price) || 0;
        const tsamPP = Number(it.tsam_processing_price) || 0;
        let totalMayNha = tsamFP;
        let totalMayGC = tsamPP;
        for (const t of techniques) { totalMayNha += (Number(t.fp) || 0) * (Number(t.qty) || 1); totalMayGC += (Number(t.pp) || 0) * (Number(t.qty) || 1); }

        html += `<div style="margin-bottom:14px"><div style="font-weight:800;font-size:13px;color:var(--navy);margin-bottom:8px">✂️ Chi Tiết May Thêm (${techniques.length + 1})</div>`;
        if (canSeeCost) {
            html += `<table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr style="background:var(--navy);color:#fff"><th style="padding:6px 10px;text-align:left;font-weight:700">Kỹ thuật</th><th style="padding:6px 10px;text-align:center;font-weight:700">SL</th><th style="padding:6px 10px;text-align:right;font-weight:700">MAY NHÀ</th><th style="padding:6px 10px;text-align:right;font-weight:700">MAY GC</th></tr></thead><tbody>`;
            // TSAM base row (always first)
            html += `<tr style="border-bottom:1px solid #e2e8f0;background:#eef2ff"><td style="padding:6px 10px;font-weight:800;color:#4338ca">📐 ${it.pattern_name || 'TSAM'}</td><td style="padding:6px 10px;text-align:center;font-weight:700">1</td><td style="padding:6px 10px;text-align:right;font-weight:800">${fmt(tsamFP)}đ</td><td style="padding:6px 10px;text-align:right;font-weight:800">${fmt(tsamPP)}đ</td></tr>`;
            // Additional techniques
            for (const t of techniques) {
                html += `<tr style="border-bottom:1px solid #f1f5f9"><td style="padding:6px 10px;font-weight:600">${t.name}</td><td style="padding:6px 10px;text-align:center">${t.qty || 1}</td><td style="padding:6px 10px;text-align:right">${fmt(t.fp)}đ</td><td style="padding:6px 10px;text-align:right">${fmt(t.pp)}đ</td></tr>`;
            }
            html += `</tbody></table>`;
            // Total sewing cost
            html += `<div style="margin-top:8px;padding:8px 12px;background:linear-gradient(135deg,#fef3c7,#fde68a);border-radius:8px;display:flex;justify-content:space-between;align-items:center">`;
            html += `<span style="font-size:12px;font-weight:700;color:#92400e">💰 Tổng giá may</span>`;
            html += `<span style="font-size:13px;font-weight:900">MAY NHÀ: <span style="color:#dc2626">${fmt(totalMayNha)}đ</span> &nbsp;|&nbsp; MAY GC: <span style="color:#7c3aed">${fmt(totalMayGC)}đ</span></span>`;
            html += `</div>`;
        } else {
            // Non-privileged: only show technique names
            html += `<div style="display:inline-block;background:#eef2ff;padding:4px 10px;border-radius:6px;font-size:11px;font-weight:700;color:#4338ca;margin:0 4px 4px 0">📐 ${it.pattern_name || 'TSAM'}</div>`;
            for (const t of techniques) {
                html += `<div style="display:inline-block;background:#f1f5f9;padding:4px 10px;border-radius:6px;font-size:11px;font-weight:700;color:var(--navy);margin:0 4px 4px 0">${t.name} (x${t.qty || 1})</div>`;
            }
        }
        html += `</div>`;
    }

    // Extra materials
    if (extraMats.length > 0) {
        html += `<div style="margin-bottom:14px"><div style="font-weight:800;font-size:13px;color:var(--navy);margin-bottom:8px">📎 Vật liệu phụ</div>`;
        for (const m of extraMats) {
            html += `<span style="display:inline-block;background:#fef3c7;color:#92400e;padding:4px 10px;border-radius:6px;font-size:11px;font-weight:700;margin:0 4px 4px 0">${m}</span>`;
        }
        html += `</div>`;
    }

    html += `</div>`;

    // Show as overlay inside the existing modal
    var overlay = document.createElement('div');
    overlay.id = '_dhtItemOverlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:10001;display:flex;align-items:center;justify-content:center';
    overlay.innerHTML = `<div style="background:#fff;border-radius:16px;max-width:600px;width:92vw;max-height:85vh;overflow-y:auto;box-shadow:0 25px 60px rgba(0,0,0,0.3)">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid #e2e8f0;position:sticky;top:0;background:#fff;border-radius:16px 16px 0 0;z-index:1">
            <div style="font-weight:900;font-size:16px;color:var(--navy)">📋 Chi tiết phiếu #${idx+1}</div>
            <div onclick="document.getElementById('_dhtItemOverlay').remove()" style="cursor:pointer;width:32px;height:32px;border-radius:50%;background:#f1f5f9;display:flex;align-items:center;justify-content:center;font-size:16px">✕</div>
        </div>
        ${html}
    </div>`;
    overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
    document.body.appendChild(overlay);
}

// ========== IN PHIẾU SẢN XUẤT ==========
async function _dhtShowPhieuSX(orderId) {
    try {
        const res = await fetch(`/api/dht/orders/${orderId}/detail`);
        if (!res.ok) throw new Error('Không thể tải dữ liệu');
        const data = await res.json();
        const o = data.order;
        const items = data.items || [];
        const fmt = n => Number(n || 0).toLocaleString('vi-VN');

        // Check confirm permission: GĐ + Phòng Kế Toán
        const deptName = (currentUser && currentUser.department_name) ? currentUser.department_name : '';
        const isKeToan = deptName.toLowerCase().indexOf('kế toán') !== -1 || deptName.toLowerCase().indexOf('ke toan') !== -1;
        const canConfirm = (currentUser && currentUser.role === 'giam_doc') || isKeToan;

        // Build items table
        let itemsHTML = '';
        items.forEach((it, idx) => {
            const qs = typeof it.quantities === 'string' ? JSON.parse(it.quantities) : (it.quantities || []);
            const totalQty = qs.reduce((s, x) => s + (Number(x.qty) || 0), 0);
            const sew = typeof it.sewing_techniques === 'string' ? JSON.parse(it.sewing_techniques) : (it.sewing_techniques || []);
            const sewStr = sew.map(s => typeof s === 'string' ? s : s.name).join(', ') || '—';
            const matPairs = typeof it.material_pairs === 'string' ? JSON.parse(it.material_pairs) : (it.material_pairs || []);
            const matStr = matPairs.length > 0
                ? matPairs.map(p => `${p.material || ''}/${p.color || ''}`).join(', ')
                : `${it.material_name || ''}/${it.color_name || ''}`;
            itemsHTML += `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px;margin-bottom:8px">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                    <span style="font-weight:800;font-size:13px;color:#0f172a">📋 Phiếu ${idx + 1}: ${it.product_name || '—'}</span>
                    <span style="background:#dbeafe;color:#1d4ed8;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700">SL: ${totalQty}</span>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:11px;color:#475569">
                    <div>🏷️ Loại: <b>${it.sale_type || '—'}</b></div>
                    <div>📐 Mẫu: <b>${it.pattern_name || '—'}</b></div>
                    <div>🧵 Chất liệu: <b>${matStr}</b></div>
                    <div>✂️ CT May Thêm: <b>${sewStr}</b></div>
                </div>
                ${qs.length > 0 ? `<div style="margin-top:6px;border-top:1px solid #e2e8f0;padding-top:6px;font-size:10px;color:#64748b">
                    ${qs.map((q, qi) => `<span style="background:#f1f5f9;padding:2px 6px;border-radius:3px;margin-right:4px">SL${qi+1}: <b>${q.qty}</b> × ${fmt(q.price)}đ</span>`).join('')}
                </div>` : ''}
            </div>`;
        });

        if (items.length === 0) {
            itemsHTML = '<div style="text-align:center;padding:20px;color:#94a3b8;font-size:12px">Chưa có phiếu đơn hàng</div>';
        }

        // Status badge
        const confirmed = o.sx_print_confirmed;
        const statusBadge = confirmed
            ? `<div style="background:#d1fae5;color:#059669;padding:6px 14px;border-radius:8px;font-size:12px;font-weight:800;display:inline-flex;align-items:center;gap:4px">✅ Đã Xác Nhận In SX</div>`
            : `<div style="background:#fef3c7;color:#92400e;padding:6px 14px;border-radius:8px;font-size:12px;font-weight:800;display:inline-flex;align-items:center;gap:4px">⏳ Chờ Xác Nhận</div>`;

        var body = `<div style="padding:4px 0">
            <div style="text-align:center;margin-bottom:16px">${statusBadge}</div>
            <div style="max-height:45vh;overflow-y:auto;padding-right:4px">${itemsHTML}</div>
            <div style="background:linear-gradient(135deg,#f0f9ff,#e0f2fe);border:1px solid #7dd3fc;border-radius:10px;padding:10px 14px;margin-top:12px">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:11px">
                    <div>📦 Tổng phiếu: <b>${items.length}</b></div>
                    <div>🚚 Ngày gửi: <b>${o.expected_ship_date ? new Date(o.expected_ship_date).toLocaleDateString('vi-VN') : '—'}</b></div>
                    <div>⏰ Giờ ra hàng: <b>${o.standard_delivery_time || '—'}</b></div>
                    <div>📋 Tiêu chuẩn: <b>${o.shipping_priority || '—'}</b></div>
                </div>
            </div>
        </div>`;

        var confirmBtn = '';
        if (canConfirm && !confirmed) {
            confirmBtn = `<button class="btn" onclick="_dhtConfirmPhieuSX(${orderId})" style="padding:8px 24px;background:linear-gradient(135deg,#0891b2,#06b6d4);color:#fff;border:none;border-radius:8px;font-weight:800;cursor:pointer;margin-left:8px">✅ Xác Nhận In SX</button>`;
        } else if (canConfirm && confirmed) {
            confirmBtn = `<button class="btn" disabled style="padding:8px 24px;background:#d1d5db;color:#6b7280;border:none;border-radius:8px;font-weight:800;cursor:not-allowed;margin-left:8px">✅ Đã Xác Nhận</button>`;
        }
        var footer = `<button class="btn btn-secondary" onclick="closeModal();setTimeout(function(){_dhtShowDetail(${orderId})},200)" style="padding:8px 20px">← Quay Lại</button>`
            + confirmBtn;

        openModal(`🏭 Phiếu Sản Xuất — ${o.order_code}`, body, footer);
    } catch(e) {
        console.error(e);
        showToast('❌ ' + (e.message || 'Lỗi tải phiếu SX'), 'error');
    }
}

async function _dhtConfirmPhieuSX(orderId) {
    if (!confirm('Xác nhận IN PHIẾU SẢN XUẤT cho đơn hàng này?')) return;
    try {
        var res = await fetch('/api/dht/orders/' + orderId + '/confirm-sx-print', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });
        if (!res.ok) {
            var errData = {}; try { errData = await res.json(); } catch(e) {}
            throw new Error(errData.error || 'Lỗi xác nhận');
        }
        showToast('✅ Đã xác nhận in phiếu sản xuất!', 'success');
        closeModal();
        await _dhtLoadOrders();
        _dhtShowDetail(orderId);
    } catch(e) { showToast('❌ ' + e.message, 'error'); }
}


// ========== APPLY DISCOUNT ==========
async function _dhtApplyDiscount(orderId) {
    var o = (_dht.orders || []).find(function(x) { return x.id === orderId; });
    var currentDiscount = o ? Number(o.discount_amount) || 0 : 0;
    var currentReason = o ? (o.discount_reason || '') : '';
    var fmt = function(n) { return Number(n||0).toLocaleString('vi-VN'); };
    // Role-based discount limit
    var role = (typeof currentUser !== 'undefined' && currentUser) ? currentUser.role : '';
    var maxDiscount = 0; // 0 = unlimited
    var limitMsg = '';
    if (role === 'giam_doc' || role === 'quan_ly_cap_cao') {
        limitMsg = '<div style="margin-top:8px;padding:8px 12px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;font-size:11px;color:#059669;font-weight:700">✅ Không giới hạn số tiền giảm</div>';
    } else {
        maxDiscount = 5000;
        limitMsg = '<div style="margin-top:8px;padding:8px 12px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;font-size:11px;color:#dc2626;font-weight:700">⚠️ Giảm tối đa <b>5.000đ</b></div>';
    }
    var body = '<div style="text-align:center;padding:8px 0">'
        +'<div style="background:linear-gradient(135deg,#059669,#10b981);color:#fff;display:inline-block;padding:12px 28px;border-radius:12px;margin-bottom:20px;box-shadow:0 4px 15px #05966940">'
        +'<div style="font-size:10px;font-weight:600;opacity:0.85;letter-spacing:1px;margin-bottom:4px">GIẢM GIÁ HIỆN TẠI</div>'
        +'<div style="font-size:22px;font-weight:900">'+(currentDiscount > 0 ? '-'+fmt(currentDiscount)+'đ' : '0đ')+'</div>'
        +'</div>'
        +'<div style="text-align:left;margin-bottom:8px"><label style="font-size:12px;font-weight:700;color:#1e293b">💰 Số tiền giảm giá (VNĐ):</label></div>'
        +'<input type="text" id="dhtDiscountInput" class="form-control" placeholder="Ví dụ: 500.000" '
        +'style="font-size:18px;font-weight:900;text-align:center;padding:12px;border:2px solid #059669;border-radius:10px;color:#059669" '
        +'value="'+(currentDiscount ? fmt(currentDiscount) : '')+'" oninput="_dhtDiscountFormat(this)">'
        +'<div id="dhtDiscountPreview" style="margin-top:6px;font-size:13px;font-weight:700;color:#059669;min-height:20px">'
        +(currentDiscount > 0 ? '→ -'+fmt(currentDiscount)+'đ' : '')
        +'</div>'
        + limitMsg
        +'<div style="text-align:left;margin-top:14px;margin-bottom:8px"><label style="font-size:12px;font-weight:700;color:#dc2626">✍️ Lý do giảm giá <span style="color:#dc2626">*</span> (bắt buộc):</label></div>'
        +'<textarea id="dhtDiscountReason" class="form-control" rows="3" placeholder="Nhập lý do giảm giá..." '
        +'style="font-size:13px;border:2px solid #e2e8f0;border-radius:10px;resize:vertical;width:100%">'+currentReason+'</textarea>'
        +'<div id="dhtDiscountReasonError" style="margin-top:4px;font-size:11px;color:#dc2626;display:none">⚠️ Vui lòng nhập lý do giảm giá!</div>'
        +'<input type="hidden" id="dhtDiscountMaxLimit" value="'+maxDiscount+'">'
        +'<div style="margin-top:6px;font-size:11px;color:#94a3b8">Nhập 0 để xóa giảm giá</div>'
        +'</div>';
    var footer = '<button class="btn btn-secondary" onclick="closeModal();setTimeout(function(){_dhtShowDetail('+orderId+')},200)" style="padding:8px 20px">Hủy</button>'
        +'<button class="btn" onclick="_dhtConfirmDiscount('+orderId+')" style="padding:8px 24px;background:linear-gradient(135deg,#059669,#10b981);color:#fff;border:none;border-radius:8px;font-weight:800;cursor:pointer;margin-left:8px">✅ Xác Nhận</button>';
    openModal('🏷️ Giảm Giá — ' + (o ? o.order_code : ''), body, footer);
    setTimeout(function() { var inp = document.getElementById('dhtDiscountInput'); if (inp) { inp.focus(); inp.select(); } }, 200);
}
function _dhtDiscountFormat(el) {
    var raw = el.value.replace(/[^\d]/g, '');
    if (raw) { el.value = Number(raw).toLocaleString('vi-VN'); }
    var preview = document.getElementById('dhtDiscountPreview');
    if (preview && raw) {
        preview.innerHTML = '→ -' + Number(raw).toLocaleString('vi-VN') + 'đ';
    } else if (preview) { preview.innerHTML = ''; }
}
async function _dhtConfirmDiscount(orderId) {
    var inp = document.getElementById('dhtDiscountInput');
    var reasonEl = document.getElementById('dhtDiscountReason');
    var errEl = document.getElementById('dhtDiscountReasonError');
    if (!inp) return;
    var amount = Number(inp.value.replace(/[^\d]/g, ''));
    if (isNaN(amount) || amount < 0) { inp.style.borderColor = '#dc2626'; return; }
    // ★ Frontend limit check
    var maxLimit = Number(document.getElementById('dhtDiscountMaxLimit')?.value || 0);
    if (maxLimit > 0 && amount > maxLimit) {
        inp.style.borderColor = '#dc2626';
        showToast('⛔ Kế Toán chỉ được giảm tối đa ' + maxLimit.toLocaleString('vi-VN') + 'đ', 'error');
        return;
    }
    var reason = (reasonEl ? reasonEl.value.trim() : '');
    if (amount > 0 && !reason) {
        if (reasonEl) reasonEl.style.borderColor = '#dc2626';
        if (errEl) errEl.style.display = 'block';
        if (reasonEl) reasonEl.focus();
        return;
    }
    try {
        var res = await fetch('/api/dht/orders/' + orderId, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ discount_amount: amount, discount_reason: amount > 0 ? reason : null })
        });
        if (!res.ok) {
            var errData = {}; try { errData = await res.json(); } catch(e) {}
            throw new Error(errData.error || 'Lỗi cập nhật');
        }
        closeModal();
        await _dhtLoadOrders();
        _dhtShowDetail(orderId);
    } catch(e) { showToast('❌ ' + e.message, 'error'); }
}

// ========== PRINT SHIPPING RECEIPT (Client-side) ==========
async function _dhtPrintOrder(orderId) {
    try {
        const res = await fetch(`/api/dht/orders/${orderId}/detail`);
        if (!res.ok) throw new Error('Không thể tải dữ liệu đơn hàng');
        const d = await res.json();
        const o = d.order;
        const items = d.items || [];
        const fmt = n => Number(n || 0).toLocaleString('vi-VN');

        // Calculate financials
        let calcBase = 0, calcVat = 0;
        for (const it of items) {
            let quantities = it.quantities || [];
            if (typeof quantities === 'string') try { quantities = JSON.parse(quantities); } catch(e) { quantities = []; }
            const base = quantities.reduce((s, x) => s + (Number(x.qty)||0) * (Number(x.price)||0), 0);
            calcBase += base;
            calcVat += (Number(it.item_total) || 0) - base;
        }
        const payments = d.payments || [];
        const deposit = payments.length > 0
            ? payments.reduce((s, p) => s + (Number(p.amount) || 0), 0)
            : (Number(o.deposit_amount) || Number(o.deposit_amount_cache) || 0);
        const discount = Number(o.discount_amount) || 0;
        const surcharges = d.surcharges || [];
        const surTotal = surcharges.reduce((s, x) => s + (Number(x.amount) || 0), 0);
        const needToPay = calcBase + calcVat + surTotal - discount - deposit;

        // Build item rows
        let itemRows = '';
        items.forEach((it, i) => {
            let quantities = it.quantities || [];
            if (typeof quantities === 'string') try { quantities = JSON.parse(quantities); } catch(e) { quantities = []; }
            const base = quantities.reduce((s, x) => s + (Number(x.qty)||0) * (Number(x.price)||0), 0);
            const vatAmt = (Number(it.item_total) || 0) - base;
            const vatPct = base > 0 && vatAmt > 0 ? Math.round(vatAmt / base * 100) : 0;
            const matColor = (it.material_name || '') + (it.color_name ? ' - ' + it.color_name : '');
            const saleLabel = (it.sale_type || '').toLowerCase() === 'bán' || (it.sale_type || '').toLowerCase() === 'ban' ? 'Bán' : 'Quà';
            itemRows += `<tr>
                <td style="text-align:center">${i+1}</td>
                <td>${saleLabel}</td>
                <td style="font-weight:700">${it.product_name || it.description || '—'}</td>
                <td>${matColor}</td>
                <td style="text-align:center;font-weight:700">${it.quantity || 0}</td>
                <td style="text-align:right">${fmt(it.unit_price)}</td>
                <td style="text-align:center">${vatPct}%</td>
                <td style="text-align:right;font-weight:700">${fmt(it.item_total)}</td>
            </tr>`;
        });

        const orderDate = o.order_date ? new Date(o.order_date).toLocaleDateString('vi-VN') : '—';
        const printDate = new Date().toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

        const html = `<!DOCTYPE html>
<html lang="vi"><head><meta charset="UTF-8"><title>Phiếu Giao Hàng - ${o.order_code}</title>
<style>
@page { size: A4; margin: 10mm 15mm; }
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:'Segoe UI',Arial,sans-serif; font-size:13px; color:#1a1a2e; background:#fff; }
.page { max-width:750px; margin:0 auto; padding:20px; }
.header { display:flex; align-items:center; gap:16px; padding-bottom:12px; border-bottom:3px solid #1a1a2e; margin-bottom:16px; }
.header img { width:70px; height:70px; border-radius:12px; object-fit:contain; }
.header-info .brand { font-size:22px; font-weight:900; color:#1a1a2e; letter-spacing:1px; }
.header-info .company { font-size:11px; font-weight:600; color:#4a4a6a; margin-top:2px; }
.header-info .contact { font-size:10px; color:#6b7280; margin-top:4px; }
.title { text-align:center; margin:16px 0; }
.title h1 { font-size:24px; font-weight:900; color:#1a1a2e; letter-spacing:2px; }
.title .sub { font-size:12px; color:#6b7280; margin-top:4px; }
.info-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:16px; }
.info-box { background:#f8f9fa; border:1px solid #e5e7eb; border-radius:8px; padding:10px 14px; }
.info-box .label { font-size:10px; font-weight:800; color:#1a1a2e; text-transform:uppercase; letter-spacing:1px; margin-bottom:6px; border-bottom:1px solid #d1d5db; padding-bottom:4px; }
.info-box .row { display:flex; justify-content:space-between; padding:2px 0; font-size:12px; }
.info-box .row .key { color:#6b7280; }
.info-box .row .val { font-weight:700; color:#1a1a2e; }
table { width:100%; border-collapse:collapse; margin-bottom:16px; }
table thead th { background:#1a1a2e; color:#fff; padding:8px 10px; font-size:10px; font-weight:700; text-transform:uppercase; }
table tbody td { padding:7px 10px; border-bottom:1px solid #e5e7eb; font-size:12px; }
table tbody tr:nth-child(even) { background:#f8f9fa; }
.finance { background:linear-gradient(135deg,#fefce8,#fef9c3); border:2px solid #fbbf24; border-radius:10px; padding:14px; margin-bottom:16px; }
.finance .row { display:flex; justify-content:space-between; padding:4px 0; font-size:13px; }
.finance .row .key { color:#78350f; }
.finance .row .val { font-weight:700; }
.finance .total-row { border-top:2px solid #f59e0b; margin-top:6px; padding-top:8px; }
.finance .total-row .key { font-size:16px; font-weight:900; color:#1a1a2e; }
.finance .total-row .val { font-size:18px; font-weight:900; color:#dc2626; }
.signatures { display:grid; grid-template-columns:1fr 1fr; gap:40px; margin-top:30px; text-align:center; }
.sig .title-sig { font-weight:800; font-size:13px; color:#1a1a2e; margin-bottom:4px; }
.sig .note { font-size:10px; color:#9ca3af; font-style:italic; }
.sig .line { border-bottom:1px dotted #9ca3af; height:60px; margin-top:8px; }
.footer { text-align:center; font-size:10px; color:#9ca3af; margin-top:20px; padding-top:8px; border-top:1px solid #e5e7eb; }
.print-btn { position:fixed; top:16px; right:16px; background:#7c3aed; color:#fff; border:none; padding:12px 24px; border-radius:10px; font-size:14px; font-weight:700; cursor:pointer; box-shadow:0 4px 12px rgba(124,58,237,0.4); z-index:100; }
.print-btn:hover { background:#6d28d9; }
@media print { body { -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; } .no-print { display:none !important; } }
@media screen { body { background:#e5e7eb; } .page { margin:20px auto; background:#fff; box-shadow:0 4px 20px rgba(0,0,0,0.15); border-radius:8px; } }
</style></head><body>
<button class="print-btn no-print" onclick="window.print()">🖨️ In Phiếu</button>
<div class="page">
<div class="header">
    <img src="/images/logo.png" alt="Logo">
    <div class="header-info">
        <div class="brand">ĐỒNG PHỤC HV</div>
        <div class="company">Công Ty TNHH Sản Xuất & Thương Mại Quốc Tế Trương Tùng</div>
        <div class="contact">📞 0939 845 956 &nbsp;|&nbsp; 📍 LK02-21 Khu Đô Thị Đô Nghĩa, Hà Đông, Hà Nội</div>
    </div>
</div>
<div class="title"><h1>📄 PHIẾU GIAO HÀNG</h1><div class="sub">Ngày in: ${printDate}</div></div>
<div class="info-grid">
    <div class="info-box"><div class="label">📋 Thông tin đơn hàng</div>
        <div class="row"><span class="key">Mã đơn:</span><span class="val">${o.order_code}</span></div>
        <div class="row"><span class="key">Ngày lên đơn:</span><span class="val">${orderDate}</span></div>
        <div class="row"><span class="key">Ưu tiên:</span><span class="val">${o.shipping_priority || 'CHUẨN'}</span></div>
        <div class="row"><span class="key">NV phụ trách:</span><span class="val">${o.created_by_name || o.cskh_name || '—'}</span></div>
    </div>
    <div class="info-box"><div class="label">👤 Thông tin khách hàng</div>
        <div class="row"><span class="key">Họ tên:</span><span class="val">${o.customer_name || '—'}</span></div>
        <div class="row"><span class="key">SĐT:</span><span class="val">${o.customer_phone || '—'}</span></div>
        <div class="row"><span class="key">Địa chỉ:</span><span class="val">${o.address || '—'}</span></div>
        <div class="row"><span class="key">Tỉnh/TP:</span><span class="val">${o.province || '—'}</span></div>
    </div>
</div>
<table><thead><tr>
    <th style="text-align:center;width:30px">#</th><th>Loại</th><th>Sản phẩm</th><th>Vải - Màu</th>
    <th style="text-align:center">SL</th><th style="text-align:right">Đơn giá</th><th style="text-align:center">VAT</th><th style="text-align:right">Thành tiền</th>
</tr></thead><tbody>${itemRows}</tbody></table>
<div class="finance">
    <div class="row"><span class="key">Tổng tiền hàng (trước VAT):</span><span class="val">${fmt(calcBase)}đ</span></div>
    ${surTotal > 0 ? `<div class="row"><span class="key">Phụ phí:</span><span class="val">${fmt(surTotal)}đ</span></div>` : ''}
    <div class="row"><span class="key">VAT:</span><span class="val" style="color:#6366f1">${fmt(calcVat)}đ</span></div>
    ${discount > 0 ? `<div class="row"><span class="key">Giảm giá:</span><span class="val" style="color:#059669">-${fmt(discount)}đ</span></div>` : ''}
    <div class="row"><span class="key">Đã đặt cọc:</span><span class="val" style="color:#2563eb">${fmt(deposit)}đ</span></div>
    <div class="row total-row"><span class="key">💰 CẦN THANH TOÁN:</span><span class="val">${fmt(needToPay)}đ</span></div>
</div>
<div class="signatures">
    <div class="sig"><div class="title-sig">BÊN GIAO HÀNG</div><div class="note">(Ký, ghi rõ họ tên)</div><div class="line"></div></div>
    <div class="sig"><div class="title-sig">BÊN NHẬN HÀNG</div><div class="note">(Ký, ghi rõ họ tên)</div><div class="line"></div></div>
</div>
<div class="footer">Đồng Phục HV — Tận Tâm Dựng Xây Giá Trị &nbsp;|&nbsp; dongphuchv.vn</div>
</div></body></html>`;

        const w = window.open('', '_blank');
        w.document.write(html);
        w.document.close();
    } catch(e) { alert('❌ ' + e.message); }
}

// ========== BÁO ĐƠN LỖI — Report Error from DHT ==========
function _dhtReportError() {
    var o = window._dhtCurrentOrder;
    if (!o) { showToast('Không tìm thấy dữ liệu đơn hàng', 'error'); return; }

    // Gather auto-fill data
    var linhVuc = o.category_name || '—';
    var customerName = o.customer_name || '—';
    var orderCode = o.order_code || '—';
    var cskhName = o.cskh_name || '—';
    var totalQty = Number(o.total_quantity) || 0;
    var today = vnDateStr();

    // Pasted files storage
    window._dhtErrorPastedFiles = [];

    // Build sub-modal overlay
    var ov = document.createElement('div');
    ov.id = '_dhtErrorOverlay';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:100000;display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeIn .2s';

    var readonlyField = function(label, value) {
        return '<div style="margin-bottom:10px">' +
            '<label style="display:block;font-size:11px;font-weight:800;color:#64748b;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px">' + label + '</label>' +
            '<div style="padding:8px 12px;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;font-weight:700;color:#1e293b">' + value + ' <span style="color:#94a3b8;font-size:10px">🔒</span></div>' +
            '</div>';
    };

    var inputField = function(label, id, type, required, placeholder) {
        var req = required ? '<span style="color:#dc2626;font-weight:900"> *</span>' : '';
        return '<div style="margin-bottom:10px">' +
            '<label style="display:block;font-size:11px;font-weight:800;color:#334155;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px">' + label + req + '</label>' +
            '<input id="' + id + '" type="' + type + '" placeholder="' + (placeholder||'') + '" style="width:100%;padding:8px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;box-sizing:border-box;transition:border .2s" onfocus="this.style.borderColor=\'#ea580c\'" onblur="this.style.borderColor=\'#d1d5db\'">' +
            '</div>';
    };

    var textareaField = function(label, id, required, placeholder) {
        var req = required ? '<span style="color:#dc2626;font-weight:900"> *</span>' : '';
        return '<div style="margin-bottom:10px">' +
            '<label style="display:block;font-size:11px;font-weight:800;color:#334155;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px">' + label + req + '</label>' +
            '<textarea id="' + id + '" rows="3" placeholder="' + (placeholder||'') + '" style="width:100%;padding:8px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;box-sizing:border-box;resize:vertical;transition:border .2s" onfocus="this.style.borderColor=\'#ea580c\'" onblur="this.style.borderColor=\'#d1d5db\'"></textarea>' +
            '</div>';
    };

    ov.innerHTML = '<div style="background:#fff;border-radius:16px;width:580px;max-width:95vw;max-height:92vh;overflow-y:auto;box-shadow:0 25px 80px rgba(0,0,0,0.35)">' +
        // Header
        '<div style="background:linear-gradient(135deg,#ea580c,#dc2626);padding:16px 20px;border-radius:16px 16px 0 0;display:flex;justify-content:space-between;align-items:center">' +
        '<h3 style="margin:0;color:#fff;font-size:16px;font-weight:900">🚨 BÁO ĐƠN LỖI — ' + orderCode + '</h3>' +
        '<span onclick="document.getElementById(\'_dhtErrorOverlay\').remove()" style="cursor:pointer;color:#fff;font-size:22px;font-weight:700;opacity:0.8;line-height:1">✕</span></div>' +
        // Body
        '<div style="padding:20px">' +
        // Readonly section
        '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:14px;margin-bottom:16px">' +
        '<div style="font-size:10px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">📋 THÔNG TIN ĐƠN HÀNG (Tự động)</div>' +
        readonlyField('Lĩnh Vực', linhVuc) +
        readonlyField('Tên Khách Hàng', customerName) +
        readonlyField('Mã Đơn', orderCode) +
        readonlyField('CSKH', cskhName) +
        readonlyField('Số Lượng Sản Xuất', totalQty) +
        '</div>' +
        // Editable section
        '<div style="border-top:2px solid #fed7aa;padding-top:16px">' +
        '<div style="font-size:10px;font-weight:800;color:#ea580c;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px">✏️ THÔNG TIN LỖI (Nhập tay)</div>' +
        inputField('Số Lượng Lỗi', '_errQty', 'number', true, 'VD: 2') +
        textareaField('Nội Dung Lỗi', '_errContent', true, 'Mô tả chi tiết lỗi...') +
        // Image paste zone (Ctrl+V only)
        '<div style="margin-bottom:10px">' +
        '<label style="display:block;font-size:11px;font-weight:800;color:#334155;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px">HÌNH ẢNH LỖI<span style="color:#dc2626;font-weight:900"> *</span></label>' +
        '<div id="_errPasteZone" style="border:2px dashed #d1d5db;border-radius:10px;padding:20px;text-align:center;transition:all .2s;background:#fafafa;min-height:60px">' +
        '<div id="_errPastePreview" style="display:flex;gap:6px;flex-wrap:wrap;justify-content:center;margin-bottom:6px"></div>' +
        '<div style="color:#94a3b8;font-size:12px;font-weight:600">📋 <b>Ctrl+V</b> để dán ảnh từ clipboard</div>' +
        '</div>' +
        '</div>' +
        // Video upload zone
        '<div style="margin-bottom:10px">' +
        '<label style="display:block;font-size:11px;font-weight:800;color:#334155;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px">🎬 VIDEO LỖI <span style="color:#94a3b8;font-size:9px;font-weight:500">(không bắt buộc)</span></label>' +
        '<div id="_errVideoZone" onclick="document.getElementById(\'_errVideoInput\').click()" style="border:2px dashed #d1d5db;border-radius:10px;padding:16px;text-align:center;cursor:pointer;transition:all .2s;background:#fafafa">' +
        '<div id="_errVideoPreview" style="margin-bottom:6px"></div>' +
        '<div style="color:#94a3b8;font-size:12px;font-weight:600">📁 Click để chọn video (MP4, AVI, MOV, MKV...)</div>' +
        '</div>' +
        '<input type="file" id="_errVideoInput" accept="video/*" style="display:none">' +
        '</div>' +
        '</div>' +
        // Buttons
        '<div style="display:flex;gap:8px;margin-top:16px">' +
        '<button id="_errSubmitBtn" onclick="_dhtSubmitErrorReport()" style="flex:1;padding:12px;background:linear-gradient(135deg,#ea580c,#dc2626);color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:800;cursor:pointer;transition:all .2s">🚨 Gửi Báo Đơn Lỗi</button>' +
        '<button onclick="document.getElementById(\'_dhtErrorOverlay\').remove()" style="padding:12px 20px;background:#f1f5f9;color:#64748b;border:none;border-radius:10px;font-size:13px;cursor:pointer;font-weight:600">Hủy</button>' +
        '</div>' +
        '</div></div>';

    document.body.appendChild(ov);

    // ── Ctrl+V Paste handler ──
    var pasteZone = document.getElementById('_errPasteZone');
    document.addEventListener('paste', function _errPasteHandler(e) {
        if (!document.getElementById('_dhtErrorOverlay')) {
            document.removeEventListener('paste', _errPasteHandler);
            return;
        }
        var items = e.clipboardData && e.clipboardData.items;
        if (!items) return;
        for (var i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                e.preventDefault();
                var file = items[i].getAsFile();
                if (file) {
                    window._dhtErrorPastedFiles.push(file);
                    _errRenderPreview();
                }
            }
        }
    });

    // Drag & drop on paste zone (images)
    pasteZone.addEventListener('dragover', function(e) { e.preventDefault(); this.style.borderColor = '#ea580c'; this.style.background = '#fff7ed'; });
    pasteZone.addEventListener('dragleave', function() { this.style.borderColor = '#d1d5db'; this.style.background = '#fafafa'; });
    pasteZone.addEventListener('drop', function(e) {
        e.preventDefault();
        this.style.borderColor = '#d1d5db'; this.style.background = '#fafafa';
        if (e.dataTransfer && e.dataTransfer.files) {
            for (var i = 0; i < e.dataTransfer.files.length; i++) {
                if (e.dataTransfer.files[i].type.indexOf('image') !== -1) {
                    window._dhtErrorPastedFiles.push(e.dataTransfer.files[i]);
                }
            }
            _errRenderPreview();
        }
    });

    // Video input handler
    window._dhtErrorVideoFile = null;
    document.getElementById('_errVideoInput').addEventListener('change', function() {
        if (this.files && this.files[0]) {
            window._dhtErrorVideoFile = this.files[0];
            var preview = document.getElementById('_errVideoPreview');
            if (preview) {
                var sizeMB = (this.files[0].size / 1048576).toFixed(1);
                preview.innerHTML = '<div style="display:inline-flex;align-items:center;gap:8px;background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:8px 14px">' +
                    '<span style="font-size:18px">🎬</span>' +
                    '<div style="text-align:left">' +
                    '<div style="font-size:12px;font-weight:700;color:#059669">' + this.files[0].name + '</div>' +
                    '<div style="font-size:10px;color:#64748b">' + sizeMB + ' MB</div>' +
                    '</div>' +
                    '<span onclick="event.stopPropagation();window._dhtErrorVideoFile=null;document.getElementById(\'_errVideoPreview\').innerHTML=\'\';document.getElementById(\'_errVideoInput\').value=\'\'" style="cursor:pointer;color:#dc2626;font-weight:700;font-size:14px" title="Xóa">✕</span>' +
                    '</div>';
            }
        }
    });
}

function _errRenderPreview() {
    var preview = document.getElementById('_errPastePreview');
    if (!preview) return;
    preview.innerHTML = '';
    window._dhtErrorPastedFiles.forEach(function(file, idx) {
        var reader = new FileReader();
        reader.onload = function(e) {
            var wrap = document.createElement('div');
            wrap.style.cssText = 'position:relative;display:inline-block';
            wrap.innerHTML = '<img src="' + e.target.result + '" style="width:60px;height:60px;object-fit:cover;border-radius:6px;border:2px solid #ea580c">' +
                '<span onclick="event.stopPropagation();window._dhtErrorPastedFiles.splice(' + idx + ',1);_errRenderPreview()" style="position:absolute;top:-4px;right:-4px;background:#dc2626;color:#fff;width:16px;height:16px;border-radius:50%;font-size:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-weight:700">×</span>';
            preview.appendChild(wrap);
        };
        reader.readAsDataURL(file);
    });
}

async function _dhtSubmitErrorReport() {
    var o = window._dhtCurrentOrder;
    if (!o) return;

    // Validate required fields
    var content = (document.getElementById('_errContent').value || '').trim();
    var qty = document.getElementById('_errQty').value;

    var errors = [];
    if (!qty || Number(qty) <= 0) errors.push('Số Lượng Lỗi');
    if (!content) errors.push('Nội Dung Lỗi');
    if (!window._dhtErrorPastedFiles || window._dhtErrorPastedFiles.length === 0) errors.push('Hình Ảnh Lỗi');

    if (errors.length > 0) {
        showToast('⚠️ Vui lòng điền: ' + errors.join(', '), 'error');
        if (!qty || Number(qty) <= 0) document.getElementById('_errQty').style.borderColor = '#dc2626';
        if (!content) document.getElementById('_errContent').style.borderColor = '#dc2626';
        if (!window._dhtErrorPastedFiles || window._dhtErrorPastedFiles.length === 0) { var pz = document.getElementById('_errPasteZone'); if(pz) pz.style.borderColor = '#dc2626'; }
        return;
    }

    // Disable submit button
    var btn = document.getElementById('_errSubmitBtn');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Đang gửi...'; btn.style.opacity = '0.6'; }

    try {
        // Step 1: Create record
        var body = {
            report_date: vnDateStr(),
            dht_order_id: o.id,
            order_code: o.order_code || '',
            linh_vuc: o.category_name || '',
            customer_name: o.customer_name || '',
            cskh_name: o.cskh_name || '',
            production_quantity: Number(o.total_quantity) || 0,
            error_quantity: Number(qty) || 0,
            error_content: content,
            error_images: []
        };

        var result = await apiCall('/api/customer-errors', 'POST', body);
        if (result.error) { showToast(result.error, 'error'); return; }

        var newId = result.id;
        var auditLogId = result.audit_log_id;
        var uploadedImageUrls = [];
        var uploadedVideoUrl = null;

        // Step 2: Upload pasted/selected images
        if (window._dhtErrorPastedFiles && window._dhtErrorPastedFiles.length > 0) {
            var formData = new FormData();
            window._dhtErrorPastedFiles.forEach(function(file, idx) {
                formData.append('images', file, 'error_img_' + idx + '.jpg');
            });

            try {
                var imgResult = await fetch('/api/customer-errors/' + newId + '/images', {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') },
                    body: formData
                });
                var imgData = await imgResult.json();
                if (imgData.images) uploadedImageUrls = imgData.images;
            } catch(imgErr) { console.warn('[ErrorReport] Image upload failed:', imgErr); }
        }

        // Step 3: Upload video if selected
        if (window._dhtErrorVideoFile) {
            var videoData = new FormData();
            videoData.append('video', window._dhtErrorVideoFile, window._dhtErrorVideoFile.name);
            try {
                var vidResult = await fetch('/api/customer-errors/' + newId + '/video', {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') },
                    body: videoData
                });
                var vidData = await vidResult.json();
                if (vidData.video) uploadedVideoUrl = vidData.video;
            } catch(vidErr) { console.warn('[ErrorReport] Video upload failed:', vidErr); }
        }

        // Step 4: Finalize audit log with images/video
        if (auditLogId && (uploadedImageUrls.length > 0 || uploadedVideoUrl)) {
            try {
                await apiCall('/api/customer-errors/' + newId + '/finalize-audit', 'PATCH', {
                    audit_log_id: auditLogId,
                    image_urls: uploadedImageUrls,
                    video_url: uploadedVideoUrl
                });
            } catch(auditErr) { console.warn('[ErrorReport] Audit finalize failed:', auditErr); }
        }

        // Success!
        showToast('✅ Đã báo đơn lỗi thành công!', 'success');

        // Close sub-modal
        var overlay = document.getElementById('_dhtErrorOverlay');
        if (overlay) overlay.remove();

        // Close main detail modal and re-open to refresh audit logs + icon states
        closeModal();
        _dhtLoadOrders();
        setTimeout(function() { _dhtShowDetail(o.id); }, 500);

    } catch(e) {
        showToast('❌ Lỗi: ' + e.message, 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = '🚨 Gửi Báo Đơn Lỗi'; btn.style.opacity = '1'; }
    }
}

// ========== HÀNG LỖI VỀ — Error Return Handover to QLX ==========
async function _dhtErrorReturnHandover(orderId) {
    var o = window._dhtCurrentOrder;
    if (!o) { showToast('Không tìm thấy dữ liệu đơn hàng', 'error'); return; }

    // Load existing error records for this order
    var returnData = null;
    try {
        returnData = await apiCall('/api/customer-errors/by-order/' + orderId + '/return-status');
    } catch(e) { console.error('[ErrorReturn] load:', e); }

    var errorItems = (returnData && returnData.items) || [];
    var orderCode = o.order_code || '—';

    // Load QLX managers (quan_ly_cap_cao from HỆ THỐNG XƯỞNG HV department)
    var qlxManagers = [];
    try {
        var deptRes = await apiCall('/api/departments');
        var allDepts = (deptRes && deptRes.departments) || [];
        // Find "HỆ THỐNG XƯỞNG HV" department and all its children
        var xuongDept = allDepts.find(function(d) { return d.name && d.name.toUpperCase().indexOf('XƯỞNG HV') !== -1; });
        var xuongDeptIds = [];
        if (xuongDept) {
            xuongDeptIds.push(xuongDept.id);
            // Collect child department IDs
            function collectChildDepts(parentId) {
                allDepts.forEach(function(d) {
                    if (d.parent_id === parentId) {
                        xuongDeptIds.push(d.id);
                        collectChildDepts(d.id);
                    }
                });
            }
            collectChildDepts(xuongDept.id);
        }
        var dropRes = await apiCall('/api/users/dropdown');
        var allUsers = (dropRes && dropRes.users) || [];
        qlxManagers = allUsers.filter(function(u) {
            return u.role === 'quan_ly_cap_cao' && xuongDeptIds.indexOf(u.department_id) !== -1;
        });
        // If no QLCC found in Xưởng, fallback to all QLCC
        if (qlxManagers.length === 0) {
            qlxManagers = allUsers.filter(function(u) { return u.role === 'quan_ly_cap_cao'; });
        }
    } catch(e) { console.error('[ErrorReturn] load QLX managers:', e); }

    // Build select options for QLX managers
    var qlxSelectOptions = '<option value="">— Chọn Quản Lý Xưởng —</option>';
    qlxManagers.forEach(function(m) {
        qlxSelectOptions += '<option value="' + m.id + '">' + (m.full_name || m.username) + '</option>';
    });

    // Build overlay
    var ov = document.createElement('div');
    ov.id = '_dhtErrorReturnOv';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:100000;display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeIn .2s';
    ov.onclick = function(e) { if (e.target === ov) ov.remove(); };

    var h = '<div style="background:#fff;border-radius:16px;width:560px;max-width:95vw;max-height:90vh;overflow-y:auto;box-shadow:0 25px 80px rgba(0,0,0,0.35)" onclick="event.stopPropagation()">';

    // Header
    h += '<div style="background:linear-gradient(135deg,#0369a1,#0284c7);padding:16px 20px;border-radius:16px 16px 0 0;display:flex;justify-content:space-between;align-items:center">';
    h += '<h3 style="margin:0;color:#fff;font-size:16px;font-weight:900">📦 HÀNG LỖI VỀ — ' + orderCode + '</h3>';
    h += '<span onclick="document.getElementById(\'_dhtErrorReturnOv\').remove()" style="cursor:pointer;color:#fff;font-size:22px;font-weight:700;opacity:0.8;line-height:1">✕</span></div>';

    // Body
    h += '<div style="padding:20px">';

    // Separate handed-over vs pending items
    var handedItems = errorItems.filter(function(ei) { return ei.error_return_handed_over; });
    var pendingItems = errorItems.filter(function(ei) { return !ei.error_return_handed_over; });

    if (errorItems.length > 0) {
        // Show summary of all error records
        h += '<div style="margin-bottom:16px">';
        h += '<div style="font-size:11px;font-weight:800;color:#0369a1;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">📋 DANH SÁCH ĐƠN LỖI (' + errorItems.length + ' đơn)</div>';
        h += '<div style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">';
        h += '<table style="width:100%;border-collapse:collapse;font-size:11px">';
        h += '<thead><tr style="background:#1e3a4f"><th style="padding:6px 10px;text-align:left;color:#fff;font-weight:700">#</th><th style="padding:6px 10px;text-align:left;color:#fff;font-weight:700">Mã Đơn</th><th style="padding:6px 10px;text-align:center;color:#fff;font-weight:700">Trạng Thái</th></tr></thead><tbody>';
        for (var i = 0; i < errorItems.length; i++) {
            var ei = errorItems[i];
            var isHO = ei.error_return_handed_over;
            h += '<tr style="border-bottom:1px solid #f1f5f9"><td style="padding:5px 10px;color:#6b7280">' + (i + 1) + '</td>';
            h += '<td style="padding:5px 10px;font-weight:700;color:#1e293b">' + (ei.order_code || '—') + '</td>';
            h += '<td style="padding:5px 10px;text-align:center"><span style="padding:2px 8px;border-radius:4px;font-size:9px;font-weight:700;color:' + (isHO ? '#059669' : '#dc2626') + ';background:' + (isHO ? '#dcfce7' : '#fee2e2') + '">' + (isHO ? '✅ Đã BG' : '⏳ Chưa BG') + '</span></td></tr>';
        }
        h += '</tbody></table></div></div>';

        // If already fully handed over — show details
        if (handedItems.length > 0) {
            var firstHanded = handedItems[0];
            h += '<div style="padding:12px;background:#f0fdf4;border:1px solid #86efac;border-radius:10px;margin-bottom:14px">';
            h += '<div style="font-size:11px;font-weight:800;color:#059669;margin-bottom:6px">✅ THÔNG TIN BÀN GIAO</div>';
            h += '<div style="font-size:12px;color:#334155;line-height:1.8">';
            h += '<div>🏭 <strong>QLX nhận:</strong> ' + (firstHanded.error_return_handed_to || '—') + '</div>';
            if (firstHanded.error_return_notes) h += '<div>📝 <strong>Nội dung:</strong> ' + firstHanded.error_return_notes + '</div>';
            h += '<div>👤 <strong>Người BG:</strong> ' + (firstHanded.error_return_by_name || '—') + '</div>';
            if (firstHanded.error_return_at) h += '<div>🕐 <strong>Thời gian:</strong> ' + vnFormat(firstHanded.error_return_at) + '</div>';
            h += '</div></div>';
        }

        // If there are pending items — show ONE unified form
        if (pendingItems.length > 0) {
            // Store pending IDs for submit
            var pendingIds = pendingItems.map(function(ei) { return ei.id; });
            h += '<input type="hidden" id="_errReturnPendingIds" value="' + pendingIds.join(',') + '">';

            h += '<div style="padding:14px;background:#eff6ff;border:1px solid #93c5fd;border-radius:10px">';
            h += '<div style="font-size:11px;font-weight:800;color:#1d4ed8;margin-bottom:10px">📦 BÀN GIAO HÀNG LỖI VỀ <span style="padding:2px 8px;border-radius:4px;font-size:10px;background:#dbeafe;color:#1e40af">' + pendingItems.length + ' đơn chờ</span></div>';

            h += '<div style="margin-bottom:10px">';
            h += '<label style="display:block;font-size:11px;font-weight:800;color:#334155;margin-bottom:4px">🏭 Bàn Giao Cho Quản Lý Xưởng <span style="color:#dc2626">*</span></label>';
            h += '<select id="_errReturnTo_unified" style="width:100%;padding:8px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;box-sizing:border-box;transition:border .2s;background:#fff;cursor:pointer" onfocus="this.style.borderColor=\'#0369a1\'" onblur="this.style.borderColor=\'#d1d5db\'">' + qlxSelectOptions + '</select>';
            h += '</div>';

            h += '<div style="margin-bottom:10px">';
            h += '<label style="display:block;font-size:11px;font-weight:800;color:#334155;margin-bottom:4px">📝 Nội Dung Yêu Cầu <span style="color:#dc2626">*</span></label>';
            h += '<textarea id="_errReturnNotes_unified" rows="3" placeholder="Nhập nội dung yêu cầu xử lý..." style="width:100%;padding:8px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;box-sizing:border-box;resize:vertical;font-family:inherit;transition:border .2s" onfocus="this.style.borderColor=\'#0369a1\'" onblur="this.style.borderColor=\'#d1d5db\'"></textarea>';
            h += '</div>';

            h += '<button id="_errReturnSubmitBtn" onclick="_dhtSubmitErrorReturnUnified(' + orderId + ')" style="width:100%;padding:10px;background:linear-gradient(135deg,#0369a1,#0284c7);color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:800;cursor:pointer;transition:all .2s" onmouseover="this.style.opacity=\'0.9\'" onmouseout="this.style.opacity=\'1\'">📦 Xác Nhận Bàn Giao QLX (' + pendingItems.length + ' đơn lỗi)</button>';
            h += '</div>';
        }
    } else {
        h += '<div style="text-align:center;padding:30px;color:#94a3b8;font-size:13px">Chưa có đơn lỗi nào cho đơn hàng này</div>';
    }

    // Close button
    h += '<div style="display:flex;gap:8px;margin-top:12px;justify-content:flex-end">';
    h += '<button onclick="document.getElementById(\'_dhtErrorReturnOv\').remove()" style="padding:8px 20px;background:#f1f5f9;color:#64748b;border:none;border-radius:8px;font-size:13px;cursor:pointer;font-weight:600">Đóng</button>';
    h += '</div>';

    h += '</div></div>';
    ov.innerHTML = h;
    document.body.appendChild(ov);
}

// Unified submit — patch ALL pending error records at once
async function _dhtSubmitErrorReturnUnified(orderId) {
    var selectEl = document.getElementById('_errReturnTo_unified');
    var handedToId = selectEl ? selectEl.value : '';
    var handedTo = (selectEl && selectEl.selectedIndex > 0) ? selectEl.options[selectEl.selectedIndex].text : '';
    var notes = (document.getElementById('_errReturnNotes_unified').value || '').trim();
    var pendingIdsStr = (document.getElementById('_errReturnPendingIds') || {}).value || '';
    var pendingIds = pendingIdsStr.split(',').map(Number).filter(function(n) { return n > 0; });

    if (!handedToId) {
        showToast('⚠️ Vui lòng chọn Quản Lý Xưởng', 'error');
        if (selectEl) selectEl.style.borderColor = '#dc2626';
        return;
    }
    if (!notes) {
        showToast('⚠️ Vui lòng nhập Nội Dung Yêu Cầu', 'error');
        var notesEl = document.getElementById('_errReturnNotes_unified');
        if (notesEl) { notesEl.style.borderColor = '#dc2626'; notesEl.focus(); }
        return;
    }
    if (!pendingIds.length) {
        showToast('⚠️ Không có đơn lỗi cần bàn giao', 'error');
        return;
    }

    // Disable button
    var btn = document.getElementById('_errReturnSubmitBtn');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Đang xử lý...'; btn.style.opacity = '0.6'; }

    try {
        // Patch ALL pending error records with same QLX + notes
        for (var i = 0; i < pendingIds.length; i++) {
            var result = await apiCall('/api/customer-errors/' + pendingIds[i] + '/error-return', 'PATCH', {
                handed_to: handedTo,
                handed_to_id: parseInt(handedToId),
                notes: notes
            });
            if (result.error) { showToast(result.error, 'error'); return; }
        }

        showToast('✅ Đã bàn giao ' + pendingIds.length + ' đơn lỗi cho QLX: ' + handedTo, 'success');

        var ov = document.getElementById('_dhtErrorReturnOv');
        if (ov) ov.remove();
        closeModal();
        await _dhtLoadOrders();
        setTimeout(function() { _dhtShowDetail(orderId); }, 400);

    } catch(e) {
        showToast('❌ Lỗi: ' + e.message, 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = '📦 Xác Nhận Bàn Giao QLX'; btn.style.opacity = '1'; }
    }
}
