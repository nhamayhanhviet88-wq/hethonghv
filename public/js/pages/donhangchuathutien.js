// ========== ĐƠN HÀNG CHƯA THU TIỀN — Bộ Phận Văn Phòng ==========
var _dhctt = { tree: [], categories: [], staff: [], orders: [], filter: {}, activeFilters: {}, sortCol: null, sortDir: null, page: 1, pageSize: 100 };

function _dhcttFmt(n) { return Number(n||0).toLocaleString('vi-VN') + 'đ'; }
function _dhcttFmtCount(n) { return Number(n||0).toLocaleString('vi-VN') + ' đơn'; }

// Custom formatDetailedQuantity for Chưa thu tiền to highlight/dim items depending on active carrier filter
var _dhcttFormatDetailedQuantity = function(items, totalQuantity, orderCode) {
    if (!items || !Array.isArray(items) || items.length === 0) {
        return totalQuantity || 0;
    }

    const code = (orderCode || '').toUpperCase();
    const isPetTem = code.indexOf('GCPET') >= 0 || code.indexOf('GCTEM') >= 0 || 
                     code.indexOf('SUAGCPET') >= 0 || code.indexOf('SUAGCTEM') >= 0 || 
                     code.indexOf('SUAPET') >= 0 || code.indexOf('SUATEM') >= 0 || 
                     code.indexOf('PET') >= 0 || code.indexOf('TEM') >= 0;

    const activeCarrierId = _dhctt.filter.carrier_id;
    const isCarrierFilterActive = activeCarrierId !== undefined;

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

        // Determine if this item matches the active carrier filter
        let isMatching = true;
        if (isCarrierFilterActive && Number(activeCarrierId) !== -2) {
            const itemCarrierId = item.actual_carrier_id || 0;
            const itemShipped = item.shipping_status === 'shipped';
            if (activeCarrierId === 0) {
                isMatching = !itemShipped || itemCarrierId === 0;
            } else {
                isMatching = itemShipped && Number(itemCarrierId) === Number(activeCarrierId);
            }
        }

        let innerHTML = '';
        if (isPetTem) {
            const prod = (item.product_name || item.description || '').toLowerCase();
            if (prod.indexOf('tờ') >= 0 || prod.indexOf('to') >= 0) {
                innerHTML = `<span style="color:#d97706;font-weight:800;">${qty} Tờ</span>`;
            } else if (prod.indexOf('mét') >= 0 || prod.indexOf('met') >= 0) {
                innerHTML = `<span style="color:#059669;font-weight:800;">${qty} Mét</span>`;
            } else {
                const name = item.product_name || item.description || '';
                const shortName = name.length > 12 ? name.slice(0, 10) + '..' : name;
                innerHTML = shortName ? `<span style="color:#475569;font-weight:800;">${qty} ${shortName}</span>` : `<span style="color:#475569;font-weight:800;">${qty}</span>`;
            }
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
                innerHTML = `<span style="color:#4f46e5;font-weight:800;">${qty} ${cat}</span>`;
            } else {
                const name = item.product_name || item.description || '';
                const shortName = name.length > 12 ? name.slice(0, 10) + '..' : name;
                innerHTML = shortName ? `<span style="color:#475569;font-weight:800;">${qty} ${shortName}</span>` : `<span style="color:#475569;font-weight:800;">${qty}</span>`;
            }
        }

        // Apply visual styling based on match status
        if (isCarrierFilterActive) {
            if (isMatching) {
                return `<span style="display:inline-block;padding:2px 6px;background:#fef08a;border:1.5px solid #ca8a04;border-radius:4px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">${innerHTML}</span>`;
            } else {
                return `<span style="opacity:0.35;filter:grayscale(0.6);text-decoration:line-through;font-size:10px;">${qty} ${item.product_name || item.description || ''}</span>`;
            }
        }
        return innerHTML;
    }).filter(Boolean);

    if (parts.length === 0) {
        return totalQuantity || 0;
    }

    return parts.join(' , ');
};
var _dhcttFormatCurrentStep = window.formatCurrentStep || function(stepName, doneCount, totalCount, orderCode, categoryName, isShipped) { return stepName || 'Chờ SX'; };

function _dhcttGetOrderShipDate(o, carrierId) {
    let shipDateVal = null;
    const cid = carrierId !== undefined && carrierId !== null ? Number(carrierId) : null;
    
    if (o.items && o.items.length > 0) {
        const shippedItems = o.items.filter(item => item.shipping_status === 'shipped');
        if (shippedItems.length > 0) {
            if (cid !== null && cid > 0) {
                const matchingItem = shippedItems.find(item => 
                    Number(item.actual_carrier_id) === cid
                );
                if (matchingItem && matchingItem.shipping_date) {
                    shipDateVal = matchingItem.shipping_date;
                }
            } else {
                const dates = shippedItems.map(item => item.shipping_date).filter(Boolean);
                if (dates.length > 0) {
                    // Sort descending to get the latest shipping date
                    shipDateVal = dates.slice().sort((a, b) => new Date(b) - new Date(a))[0];
                } else {
                    shipDateVal = o.shipped_at;
                }
            }
        } else {
            shipDateVal = null;
        }
    } else {
        if (o.shipping_status === 'shipped') {
            shipDateVal = o.shipped_at;
        }
    }
    return shipDateVal;
}

function _dhcttGetOrderCarriers(o) {
    var carriers = [];
    if (o.items && o.items.length > 0) {
        o.items.forEach(function(item) {
            var cid = Number(item.actual_carrier_id || 0);
            var cname = '';
            if (cid === 0) {
                cname = 'Chưa Gửi Đơn';
            } else {
                var found = (_dhctt.carriers || []).find(function(c){ return c.id === cid; });
                cname = found ? found.name : ('NVC #' + cid);
            }
            if (carriers.indexOf(cname) === -1) {
                carriers.push(cname);
            }
        });
    } else {
        var cid = 0;
        if (o.shipping_status === 'shipped' && o.actual_carrier_id) {
            cid = Number(o.actual_carrier_id);
        }
        var cname = '';
        if (cid === 0) {
            cname = 'Chưa Gửi Đơn';
        } else {
            var found = (_dhctt.carriers || []).find(function(c){ return c.id === cid; });
            cname = found ? found.name : ('NVC #' + cid);
        }
        carriers.push(cname);
    }
    return carriers.join(', ');
}

// ========== FILTER CHIPS ==========
var _dhcttFilterDefs = [
    { key: 'vat',  label: 'VAT',         bg: '#fef3c7', color: '#92400e', activeBg: '#f59e0b', activeColor: '#fff' },
    { key: 'gg',   label: 'Giảm Giá',    bg: '#d1fae5', color: '#065f46', activeBg: '#059669', activeColor: '#fff' },
    { key: 'za',   label: 'Đã Zalo',     bg: '#dbeafe', color: '#1e40af', activeBg: '#2563eb', activeColor: '#fff' },
    { key: 'noza', label: 'Chưa Zalo',   bg: '#f1f5f9', color: '#64748b', activeBg: '#475569', activeColor: '#fff' },
    { key: 'loi',  label: 'Báo Lỗi',     bg: '#fee2e2', color: '#dc2626', activeBg: '#dc2626', activeColor: '#fff' },
    { key: 'sua',  label: 'Lên Đơn Sửa', bg: '#ede9fe', color: '#6d28d9', activeBg: '#7c3aed', activeColor: '#fff' }
];

function _dhcttRenderFilterChips() {
    var el = document.getElementById('dhcttFilterChips'); if (!el) return;
    var af = _dhctt.activeFilters || {};
    var anyActive = Object.values(af).some(function(v){ return v; });
    el.innerHTML = _dhcttFilterDefs.map(function(f) {
        var active = af[f.key];
        var bg = active ? f.activeBg : f.bg;
        var clr = active ? f.activeColor : f.color;
        var border = active ? 'border:1.5px solid ' + f.activeBg : 'border:1px solid ' + f.color + '33';
        var shadow = active ? 'box-shadow:0 2px 6px ' + f.activeBg + '40;' : '';
        return '<button onclick="_dhcttToggleFilter(\'' + f.key + '\')" style="'
            + 'background:' + bg + ';color:' + clr + ';' + border + ';'
            + 'padding:4px 12px;border-radius:20px;font-size:10px;font-weight:700;cursor:pointer;'
            + 'transition:all .15s;' + shadow + '">'
            + (active ? '✓ ' : '') + f.label + '</button>';
    }).join('')
    + (anyActive ? ' <button onclick="_dhcttClearFilters()" style="background:none;border:1px solid #e2e8f0;color:#94a3b8;padding:4px 10px;border-radius:20px;font-size:10px;cursor:pointer;font-weight:600">✕ Xóa lọc</button>' : '');
}

function _dhcttToggleFilter(key) {
    _dhctt.activeFilters = _dhctt.activeFilters || {};
    if (key === 'za' && _dhctt.activeFilters.noza) _dhctt.activeFilters.noza = false;
    if (key === 'noza' && _dhctt.activeFilters.za) _dhctt.activeFilters.za = false;
    _dhctt.activeFilters[key] = !_dhctt.activeFilters[key];
    _dhctt.page = 1;
    _dhcttRenderTable();
}

function _dhcttClearFilters() {
    _dhctt.activeFilters = {};
    _dhcttRenderTable();
}

// ========== DATE FILTER ==========
function _dhcttDateFilterToday() {
    var d = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
    _dhctt.filter.year = d.getFullYear();
    _dhctt.filter.month = d.getMonth()+1;
    _dhctt.filter.day = d.getDate();
    _dhcttSyncDateInputs();
    _dhcttLoadOrders();
}
function _dhcttDateFilterMonth(offset) {
    var d = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
    d.setMonth(d.getMonth() + (offset || 0));
    _dhctt.filter.year = d.getFullYear();
    _dhctt.filter.month = d.getMonth()+1;
    delete _dhctt.filter.day;
    _dhcttSyncDateInputs();
    _dhcttLoadOrders();
}
function _dhcttDateFilterMonthPick() {
    var v = document.getElementById('dhcttMonthPick')?.value;
    if (!v) return;
    var parts = v.split('-');
    _dhctt.filter.year = Number(parts[0]);
    _dhctt.filter.month = Number(parts[1]);
    delete _dhctt.filter.day;
    _dhcttSyncDateInputs();
    _dhcttLoadOrders();
}
function _dhcttDateFilterYear() {
    var v = document.getElementById('dhcttYearPick')?.value;
    if (!v) return;
    _dhctt.filter.year = Number(v);
    delete _dhctt.filter.month;
    delete _dhctt.filter.day;
    _dhcttSyncDateInputs();
    _dhcttLoadOrders();
}
function _dhcttDateFilterCskh() {
    var v = document.getElementById('dhcttCskhPick')?.value;
    _dhctt.cskhFilter = v ? Number(v) : null;
    _dhcttRenderTable();
}
function _dhcttDateFilterClear() {
    _dhctt.filter = {};
    _dhctt.cskhFilter = null;
    var mp = document.getElementById('dhcttMonthPick'); if(mp) mp.value = '';
    var yp = document.getElementById('dhcttYearPick'); if(yp) yp.value = '';
    var cp = document.getElementById('dhcttCskhPick'); if(cp) cp.value = '';
    _dhcttLoadOrders();
}
function _dhcttSyncDateInputs() {
    var mp = document.getElementById('dhcttMonthPick');
    var yp = document.getElementById('dhcttYearPick');
    if (mp && _dhctt.filter.year && _dhctt.filter.month) {
        mp.value = _dhctt.filter.year + '-' + String(_dhctt.filter.month).padStart(2,'0');
    } else if (mp) { mp.value = ''; }
    if (yp && _dhctt.filter.year && !_dhctt.filter.month) {
        yp.value = String(_dhctt.filter.year);
    } else if (yp) { yp.value = ''; }
}
function _dhcttPopulateCskhDropdown() {
    var sel = document.getElementById('dhcttCskhPick'); if (!sel) return;
    var curVal = sel.value;
    var map = {};
    (_dhctt.orders || []).forEach(function(o) {
        if (o.cskh_user_id && o.cskh_name) map[o.cskh_user_id] = o.cskh_name;
    });
    var keys = Object.keys(map).sort(function(a,b){ return map[a].localeCompare(map[b], 'vi'); });
    var opts = '<option value="">Tất cả</option>';
    keys.forEach(function(k){ opts += '<option value="'+k+'">'+map[k]+'</option>'; });
    sel.innerHTML = opts;
    if (curVal) sel.value = curVal;
}

// ========== SORT DEFINITIONS ==========
var _dhcttSortDefs = [
    { key: 'category_name',    label: 'Lĩnh Vực',              type: 'text' },
    { key: null,               label: 'Hình Thức Vận Chuyển',   type: 'none' },
    { key: 'shipped_at',       label: 'Ngày Gửi',              type: 'date' },
    { key: null,               label: 'Tiến Độ',                type: 'none' },
    { key: 'remaining_amount', label: 'Còn Lại',                type: 'num' },
    { key: 'order_code',       label: 'Mã Đơn',                type: 'text' },
    { key: 'customer_name',    label: 'Tên Khách',              type: 'text' },
    { key: 'customer_phone',   label: 'Sđt',                    type: 'text' },
    { key: 'province',         label: 'Thành Phố',              type: 'text' },
    { key: 'cskh_name',        label: 'CSKH',                   type: 'text' },
    { key: 'total_quantity',   label: 'Tổng SL',                type: 'num' },
    { key: null,               label: '',                       type: 'none' }
];

function _dhcttSortCol(key) {
    if (_dhctt.sortCol === key) {
        if (_dhctt.sortDir === 'asc') { _dhctt.sortDir = 'desc'; }
        else { _dhctt.sortCol = null; _dhctt.sortDir = null; }
    } else {
        _dhctt.sortCol = key;
        _dhctt.sortDir = 'asc';
    }
    _dhcttRenderTable();
}

function _dhcttRenderTable() {
    _dhcttRenderFilterChips();
    var filtered = _dhctt.orders.slice();
    var af = _dhctt.activeFilters || {};
    if (af.vat) filtered = filtered.filter(function(o){ return o.has_vat; });
    if (af.gg) filtered = filtered.filter(function(o){ return Number(o.discount_amount) > 0; });
    if (af.za) filtered = filtered.filter(function(o){ return o.zalo_oa_sent; });
    if (af.noza) filtered = filtered.filter(function(o){ return !o.zalo_oa_sent; });
    if (af.loi) filtered = filtered.filter(function(o){ return o.has_error; });
    if (af.sua) filtered = filtered.filter(function(o){ return o.has_repair_order; });

    if (_dhctt.cskhFilter) {
        filtered = filtered.filter(function(o) { return Number(o.cskh_user_id) === _dhctt.cskhFilter; });
    }

    // Apply sorting
    if (_dhctt.sortCol && _dhctt.sortDir) {
        var def = _dhcttSortDefs.find(function(d){ return d.key === _dhctt.sortCol; });
        if (def) {
            var dir = _dhctt.sortDir === 'asc' ? 1 : -1;
            filtered.sort(function(a, b) {
                var va = a[_dhctt.sortCol], vb = b[_dhctt.sortCol];
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
    } else {
        // Default sorting requested by the user
        const carrierId = _dhctt.filter.carrier_id !== undefined ? Number(_dhctt.filter.carrier_id) : null;
        if (carrierId === 0 || carrierId === null) {
            // Chưa Gửi Đơn or default list:
            // 1. Unshipped orders (no shipping date) at the top, sorted by expected/rescheduled ship date ascending (oldest/more overdue first)
            // 2. Shipped orders (has shipping date) at the bottom, sorted by shipping date ascending (oldest shipped first)
            filtered.sort(function(a, b) {
                const getShipDateVal = (o) => {
                    const dStr = _dhcttGetOrderShipDate(o, carrierId);
                    return dStr ? new Date(dStr).getTime() : 0;
                };

                const shipA = getShipDateVal(a);
                const shipB = getShipDateVal(b);

                // If one has shipping date and the other does not:
                if (shipA === 0 && shipB > 0) return -1; // a comes first
                if (shipA > 0 && shipB === 0) return 1;  // b comes first

                if (shipA === 0 && shipB === 0) {
                    // Both have no shipping date: sort by expected ship date ascending
                    const getEffectiveDate = (o) => {
                        const dStr = o.rescheduled_ship_date || o.expected_ship_date || o.order_date;
                        if (!dStr) return 0;
                        const t = new Date(dStr).getTime();
                        return isNaN(t) ? 0 : t;
                    };
                    return getEffectiveDate(a) - getEffectiveDate(b);
                } else {
                    // Both have shipping dates: sort by shipping date ascending (oldest first)
                    return shipA - shipB;
                }
            });
        } else if (carrierId !== null) {
            // Shipped carriers: sort by resolved ship date ascending (oldest shipped first)
            filtered.sort(function(a, b) {
                const getResolvedShipDate = (o, cid) => {
                    const dStr = _dhcttGetOrderShipDate(o, cid);
                    if (!dStr) return 0;
                    const t = new Date(dStr).getTime();
                    return isNaN(t) ? 0 : t;
                };
                return getResolvedShipDate(a, carrierId) - getResolvedShipDate(b, carrierId);
            });
        }
    }

    var totalFiltered = filtered.length;
    var totalPages = Math.ceil(totalFiltered / _dhctt.pageSize) || 1;
    if (_dhctt.page > totalPages) _dhctt.page = totalPages;
    if (_dhctt.page < 1) _dhctt.page = 1;
    var startIdx = (_dhctt.page - 1) * _dhctt.pageSize;
    var paged = filtered.slice(startIdx, startIdx + _dhctt.pageSize);

    _dhcttRenderSortHeaders();
    _dhcttRenderOrderRows(paged);
    _dhcttRenderPagination(totalFiltered, totalPages);
}

function _dhcttRenderSortHeaders() {
    var thead = document.querySelector('#dhcttTable thead tr');
    if (!thead) return;
    var ths = '';
    for (var i = 0; i < _dhcttSortDefs.length; i++) {
        var d = _dhcttSortDefs[i];
        if (d.type === 'none') { ths += '<th style="color:#fff">' + (d.label || '') + '</th>'; continue; }
        var isActive = _dhctt.sortCol === d.key;
        var arrow = '';
        if (isActive && _dhctt.sortDir === 'asc') arrow = ' ▲';
        else if (isActive && _dhctt.sortDir === 'desc') arrow = ' ▼';
        var align = d.align ? ';text-align:' + d.align : '';
        if (isActive) {
            ths += '<th class="dhctt-th-sort" onclick="_dhcttSortCol(\'' + d.key + '\')" style="background:#ffd700;color:#122546;cursor:pointer;user-select:none' + align + '">' + d.label + '<span class="dhctt-sort-arrow">' + arrow + '</span></th>';
        } else {
            ths += '<th class="dhctt-th-sort" onclick="_dhcttSortCol(\'' + d.key + '\')" style="color:#fff;cursor:pointer;user-select:none' + align + '">' + d.label + '</th>';
        }
    }
    thead.innerHTML = ths;
}

function _dhcttRenderPagination(totalItems, totalPages) {
    var html = '';
    if (totalPages <= 1) {
        html = '';
    } else {
        html = '<div style="display:flex;align-items:center;justify-content:center;gap:4px;flex-wrap:wrap;padding:6px 0">';
        html += '<button onclick="_dhcttGoPage(' + (_dhctt.page - 1) + ')" ' + (_dhctt.page <= 1 ? 'disabled' : '')
            + ' style="padding:4px 10px;border-radius:6px;border:1px solid #cbd5e1;background:' + (_dhctt.page <= 1 ? '#f1f5f9' : '#fff')
            + ';color:' + (_dhctt.page <= 1 ? '#94a3b8' : '#0369a1') + ';font-size:11px;font-weight:700;cursor:' + (_dhctt.page <= 1 ? 'not-allowed' : 'pointer')
            + '">◀ Trước</button>';

        var pages = [];
        pages.push(1);
        var start = Math.max(2, _dhctt.page - 2);
        var end = Math.min(totalPages - 1, _dhctt.page + 2);
        if (start > 2) pages.push('...');
        for (var p = start; p <= end; p++) pages.push(p);
        if (end < totalPages - 1) pages.push('...');
        if (totalPages > 1) pages.push(totalPages);

        for (var i = 0; i < pages.length; i++) {
            var pg = pages[i];
            if (pg === '...') {
                html += '<span style="padding:4px 6px;color:#94a3b8;font-size:11px">...</span>';
            } else {
                var isActive = pg === _dhctt.page;
                html += '<button onclick="_dhcttGoPage(' + pg + ')" style="min-width:30px;padding:4px 8px;border-radius:6px;border:1px solid '
                    + (isActive ? '#0369a1' : '#cbd5e1') + ';background:' + (isActive ? '#0369a1' : '#fff')
                    + ';color:' + (isActive ? '#fff' : '#334155') + ';font-size:11px;font-weight:' + (isActive ? '800' : '600')
                    + ';cursor:pointer">' + pg + '</button>';
            }
        }

        html += '<button onclick="_dhcttGoPage(' + (_dhctt.page + 1) + ')" ' + (_dhctt.page >= totalPages ? 'disabled' : '')
            + ' style="padding:4px 10px;border-radius:6px;border:1px solid #cbd5e1;background:' + (_dhctt.page >= totalPages ? '#f1f5f9' : '#fff')
            + ';color:' + (_dhctt.page >= totalPages ? '#94a3b8' : '#0369a1') + ';font-size:11px;font-weight:700;cursor:' + (_dhctt.page >= totalPages ? 'not-allowed' : 'pointer')
            + '">Sau ▶</button>';

        var from = (_dhctt.page - 1) * _dhctt.pageSize + 1;
        var to = Math.min(_dhctt.page * _dhctt.pageSize, totalItems);
        html += '<span style="margin-left:8px;font-size:11px;color:#64748b;font-weight:600">'
            + 'Trang ' + _dhctt.page + '/' + totalPages + ' — hiển thị ' + from + '-' + to + ' / ' + totalItems + ' đơn</span>';
        html += '</div>';
    }
    var top = document.getElementById('dhcttPaginationTop');
    var bot = document.getElementById('dhcttPaginationBottom');
    if (top) {
        top.innerHTML = html;
        top.style.display = html ? 'block' : 'none';
    }
    if (bot) {
        bot.innerHTML = html;
        bot.style.display = html ? 'block' : 'none';
    }
}

function _dhcttGoPage(p) {
    var totalPages = Math.ceil((_dhctt.orders || []).length / _dhctt.pageSize) || 1;
    if (p < 1 || p > totalPages) return;
    _dhctt.page = p;
    _dhcttRenderTable();
    var tbl = document.getElementById('dhcttTable');
    if (tbl) tbl.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ========== SEARCH ==========
function _dhcttDoSearch() {
    var q = (document.getElementById('dhcttSearch')?.value || '').trim();
    var badge = document.getElementById('dhcttSearchBadge');
    var clearBtn = document.getElementById('dhcttSearchClear');
    if (q.length > 0) {
        _dhctt._preSearchFilter = _dhctt._preSearchFilter || Object.assign({}, _dhctt.filter);
        _dhctt._isSearching = true;
        if (badge) { badge.style.display = ''; badge.textContent = '🔍 Đang tìm: "' + q + '" — Tất cả đơn hàng chưa thu tiền'; }
        if (clearBtn) clearBtn.style.display = '';
    } else {
        _dhctt._isSearching = false;
        if (badge) badge.style.display = 'none';
        if (clearBtn) clearBtn.style.display = 'none';
    }
    _dhcttLoadOrders();
}

function _dhcttClearSearch() {
    var el = document.getElementById('dhcttSearch'); if (el) el.value = '';
    var badge = document.getElementById('dhcttSearchBadge'); if (badge) badge.style.display = 'none';
    var clearBtn = document.getElementById('dhcttSearchClear'); if (clearBtn) clearBtn.style.display = 'none';
    _dhctt._isSearching = false;
    if (_dhctt._preSearchFilter) { _dhctt.filter = _dhctt._preSearchFilter; _dhctt._preSearchFilter = null; }
    _dhcttSyncDateInputs();
    _dhcttLoadOrders();
}

// ========== LOADS ==========
// ========== LOADS ==========
async function _dhcttLoadTree() {
    var data = await apiCall('/api/dht/tree?unpaid=true');
    _dhctt.tree = data.tree || [];
    _dhctt.summaryVisibility = data.summaryVisibility || 'none';
    var sb = document.getElementById('dhcttSidebar'); if (!sb) return;
    _dhctt.open = _dhctt.open || {};

    var isFull = _dhctt.summaryVisibility === 'full';
    var _sbVal = function(total, count) { return isFull ? _dhcttFmt(total) : ''; };
    
    // Header
    var h = '<div class="dhctt-sb-title"><span style="color:var(--navy)">───</span> <span style="color:#b8860b;font-weight:900">✨ Chưa thu tiền ✨</span> <span style="color:var(--navy)">───</span></div>';
    
    // Grand Total
    const gCount = data.grandCount || 0;
    if (isFull) {
        h += '<div class="dhctt-sb-total" onclick="_dhcttFilterOnly({})"><span>▼ Tổng Còn Nợ <span style="font-size:11px;font-weight:normal;opacity:0.85;margin-left:3px;">(' + gCount + ' đơn)</span></span><span>'+_dhcttFmt(data.grandTotal||0)+'</span></div>';
    } else {
        h += '<div class="dhctt-sb-total" onclick="_dhcttFilterOnly({})"><span>▼ Tổng Còn Nợ <span style="font-size:11px;font-weight:normal;opacity:0.85;margin-left:3px;">(' + gCount + ' đơn)</span></span></div>';
    }

    // Initialize open state for first render if not set
    if (!_dhctt.open._init) {
        if (_dhctt.tree.length > 0) {
            var firstCid = _dhctt.tree[0].carrier_id;
            _dhctt.open['c' + firstCid] = true;
        }
        _dhctt.open._init = true;
    }

    _dhctt.tree.forEach(function(carrier) {
        var cKey = 'c' + carrier.carrier_id;
        var cOpen = !!_dhctt.open[cKey];
        var cActive = _dhctt.filter.carrier_id == carrier.carrier_id && !_dhctt.filter.year && !_dhctt.filter.month;
        
        var valSpan = isFull ? '<span style="background:linear-gradient(135deg,#ffd700,#daa520);color:#fff;padding:2px 10px;border-radius:10px;font-size:10px">'+_sbVal(carrier.total, carrier.count)+'</span>' : '';
        h += '<div class="dhctt-sb-year'+(cActive?' active':'')+'" onclick="_dhcttSelectCarrier('+carrier.carrier_id+')">'
            + '<span><span class="dhctt-arrow-btn" onclick="event.stopPropagation(); _dhcttToggleOnlyCarrier(\''+cKey+'\')">'+(cOpen?'▼':'▶')+'</span> 🚛 '+carrier.carrier_name+' <span style="font-size:10px;font-weight:normal;opacity:0.75;margin-left:2px;">('+carrier.count+' đơn)</span></span>'
            + valSpan
            + '</div>';
        
        h += '<div style="display:'+(cOpen?'block':'none')+'">';
        
        (carrier.years || []).forEach(function(yr) {
            var yKey = cKey + 'y' + yr.year;
            var yOpen = !!_dhctt.open[yKey];
            var yActive = _dhctt.filter.carrier_id == carrier.carrier_id && _dhctt.filter.year == yr.year && !_dhctt.filter.month;
            var yrValSpan = isFull ? '<span style="color:#b8860b;font-weight:800">'+_sbVal(yr.total, yr.count)+'</span>' : '';
            
            h += '<div class="dhctt-sb-cat'+(yActive?' active':'')+'" onclick="event.stopPropagation(); _dhcttSelectYear('+carrier.carrier_id+','+yr.year+')">'
                + '<span><span class="dhctt-arrow-btn" onclick="event.stopPropagation(); _dhcttToggleOnlyYear(\''+yKey+'\')">'+(yOpen?'▼':'▶')+'</span> Năm '+yr.year+' <span style="font-size:9.5px;font-weight:normal;opacity:0.75;margin-left:2px;">('+yr.count+' đơn)</span></span>'
                + yrValSpan
                + '</div>';
            
            h += '<div style="display:'+(yOpen?'block':'none')+'">';
            
            (yr.months || []).forEach(function(mo) {
                var mActive = _dhctt.filter.carrier_id == carrier.carrier_id && _dhctt.filter.year == yr.year && _dhctt.filter.month == mo.month;
                var mVal = isFull ? mo.total : mo.count;
                var moValSpan = isFull ? '<span style="color:'+(mVal>0?'#b8860b':'#999')+';font-weight:'+(mVal>0?'800':'400')+'">'+_sbVal(mo.total, mo.count)+'</span>' : '';
                
                h += '<div class="dhctt-sb-month'+(mActive?' active':'')+'" onclick="event.stopPropagation();_dhcttFilterOnly({carrier_id:'+carrier.carrier_id+',year:'+yr.year+',month:'+mo.month+'})">'
                    + '<span>▸ Tháng '+String(mo.month).padStart(2,'0')+' <span style="font-size:9.5px;font-weight:normal;opacity:0.75;margin-left:2px;">('+mo.count+' đơn)</span></span>'
                    + moValSpan
                    + '</div>';
            });
            
            h += '</div>';
        });
        
        h += '</div>';
    });

    sb.innerHTML = h;
}

function _dhcttToggleOnlyCarrier(key) {
    _dhctt.open = _dhctt.open || {};
    _dhctt.open[key] = !_dhctt.open[key];
    _dhcttLoadTree();
}

function _dhcttToggleOnlyYear(key) {
    _dhctt.open = _dhctt.open || {};
    _dhctt.open[key] = !_dhctt.open[key];
    _dhcttLoadTree();
}

function _dhcttSelectCarrier(carrierId) {
    _dhctt.filter = { carrier_id: carrierId };
    _dhcttLoadTree();
    _dhcttLoadOrders();
}

function _dhcttSelectYear(carrierId, year) {
    _dhctt.filter = { carrier_id: carrierId, year: year };
    _dhcttLoadTree();
    _dhcttLoadOrders();
}

function _dhcttFilterOnly(filter) {
    _dhctt.filter = filter;
    _dhcttLoadTree();
    _dhcttLoadOrders();
}

async function _dhcttLoadOrders() {
    const f = _dhctt.filter;
    let url = '/api/dht/orders?unpaid=true&';
    const search = (document.getElementById('dhcttSearch')?.value || '').trim();
    if (search) {
        url += `search=${encodeURIComponent(search)}&`;
    } else {
        if (f.carrier_id !== undefined) url += `carrier_id=${f.carrier_id}&`;
        if (f.year) url += `year=${f.year}&`;
        if (f.month) url += `month=${f.month}&`;
        if (f.day) url += `day=${f.day}&`;
        if (f.category_id) url += `category_id=${f.category_id}&`;
    }

    const data = await apiCall(url);
    _dhctt.orders = data.orders || [];
    _dhctt.page = 1;
    _dhcttPopulateCskhDropdown();
    _dhcttRenderTable();
}

function _dhcttUpdateInfo(count, filtered) {
    var info = document.getElementById('dhcttFilterInfo');
    if (info) {
        info.innerHTML = '<div style="font-size:12px;font-weight:700;color:var(--navy);background:#f1f5f9;padding:6px 14px;border-radius:8px;border:1px solid #cbd5e1;display:inline-flex;align-items:center">'
            + '🔎 Kết quả: <span style="color:#0284c7;font-weight:900;margin:0 4px">' + count + '</span> đơn chưa thu tiền'
            + '</div>';
    }

    var arr = filtered || [];
    var totalRemaining = 0;
    arr.forEach(function(o) {
        totalRemaining += Number(o.remaining_amount) || 0;
    });
    var fmt = function(n) { return Number(n||0).toLocaleString('vi-VN'); };
    var sc = document.getElementById('dhcttStatCards');
    if (sc) {
        sc.innerHTML = '';
    }
}

function _dhcttRenderOrderRows(filtered) {
    const tbody = document.getElementById('dhcttTbody');
    if (!tbody) return;

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="12"><div class="empty-state"><div class="icon">📭</div><h3>Không có đơn hàng chưa thu tiền</h3></div></td></tr>';
        _dhcttUpdateInfo(0, []); return;
    }

    const fmt = n => Number(n || 0).toLocaleString('vi-VN');
    const fmtD = d => { if (!d) return '—'; const dt = new Date(d); return `${dt.getDate()}/${dt.getMonth()+1}`; };
    const _todayVN = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
    _todayVN.setHours(0,0,0,0);

    tbody.innerHTML = filtered.map(o => {
        const remaining = Number(o.remaining_amount) || 0;
        const remColor = remaining > 0 ? 'var(--danger)' : 'var(--success)';
        const isShipped = o.shipping_status === 'shipped' || !!o.shipped_at;
        
        const priority = (o.shipping_priority || 'CHUẨN').toUpperCase();
        let priBadge = '';
        if (priority === 'GẤP') {
            priBadge = `<span style="margin-right: 6px; background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; font-size: 9px; padding: 1px 4px; border-radius: 3px; font-weight: bold; display: inline-block; vertical-align: middle;">Gấp</span>`;
        } else if (priority === 'GỬI') {
            priBadge = `<span style="margin-right: 6px; background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; font-size: 9px; padding: 1px 4px; border-radius: 3px; font-weight: bold; display: inline-block; vertical-align: middle;">Gửi</span>`;
        } else {
            priBadge = `<span style="margin-right: 6px; background: #f3e8ff; color: #7e22ce; border: 1px solid #d8b4fe; font-size: 9px; padding: 1px 4px; border-radius: 3px; font-weight: bold; display: inline-block; vertical-align: middle;">Chuẩn</span>`;
        }

        let badges = '';
        const bStyle = 'display:inline-block;padding:1px 5px;border-radius:3px;font-size:8px;font-weight:800;letter-spacing:0.3px;line-height:14px;';
        if (o.has_vat) badges += `<span style="${bStyle}background:#fef3c7;color:#92400e;">VAT</span> `;
        if (Number(o.discount_amount) > 0) badges += `<span style="${bStyle}background:#d1fae5;color:#065f46;">GG</span> `;
        if (o.zalo_oa_sent) badges += `<span style="${bStyle}background:#dbeafe;color:#1e40af;">ZA</span> `;
        if (o.has_error) badges += `<span style="${bStyle}background:#fee2e2;color:#dc2626;">LỖI</span> `;
        if (o.has_repair_order) badges += `<span style="${bStyle}background:#ede9fe;color:#6d28d9;">SỬA</span> `;
        if (o.sx_print_confirmed) badges += `<span style="${bStyle}background:#d1fae5;color:#059669;">✅SX</span> `;
        const badgeRow = badges ? `<div style="margin-top:2px;">${badges}</div>` : '';

        const _catColors = ['#7c3aed','#0891b2','#059669','#d97706','#dc2626','#2563eb','#c026d3','#0d9488','#ea580c','#4f46e5'];
        const _catBgs = ['#ede9fe','#cffafe','#d1fae5','#fef3c7','#fee2e2','#dbeafe','#fae8ff','#ccfbf1','#ffedd5','#e0e7ff'];
        const _catHash = (o.category_name || '').split('').reduce(function(a,c){return a + c.charCodeAt(0);}, 0) % _catColors.length;
        let _catColor = _catColors[_catHash];
        let _catBg = _catBgs[_catHash];

        if (o.category_name === 'CÔNG TY') {
            _catColor = '#d97706';
            _catBg = '#fef3c7';
        } else if (o.category_name === 'PET') {
            _catColor = '#2563eb';
            _catBg = '#dbeafe';
        } else if (o.category_name === 'TEM') {
            _catColor = '#7c3aed';
            _catBg = '#ede9fe';
        }

        const shipDateVal = _dhcttGetOrderShipDate(o, _dhctt.filter.carrier_id);
        const shipDateFmt = shipDateVal ? '🚛' + fmtD(shipDateVal) : '—';

        let tienDo = '';
        if (o.expected_ship_date) {
            const shipExpected = new Date(o.expected_ship_date); shipExpected.setHours(0,0,0,0);
            const diffDays = Math.round((_todayVN.getTime() - shipExpected.getTime()) / 86400000);
            if (shipDateVal) {
                const shipActual = new Date(new Date(shipDateVal).toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
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
                if (diffDays < 0) {
                    tienDo = `<span style="color:#2563eb;font-size:10px;font-weight:700">⏳ Còn ${Math.abs(diffDays)} ngày</span>`;
                } else if (diffDays === 0) {
                    tienDo = `<span style="color:#f59e0b;font-size:10px;font-weight:800">📦 Hôm nay!</span>`;
                } else {
                    tienDo = `<span style="color:#dc2626;font-size:10px;font-weight:800;animation:dhcttBlink 1s infinite">🔥 Quá hạn ${diffDays} ngày</span>`;
                }
            }
        }
        const priStyle = (o.shipping_priority === 'GẤP' ? 'background:#dc2626;color:#fff;' : (o.shipping_priority === 'GỬI' ? 'background:#2563eb;color:#fff;' : 'background:#7c3aed;color:#fff;'));
        const lastUpdate = o.last_updated_at ? `${vnFormat(o.last_updated_at)}` : '—';
        const lastUser = o.last_updated_by_name ? `<br><span style="color:var(--info);font-size:10px;">${o.last_updated_by_name}</span>` : '';

        // Delegate row click to existing _dhtShowDetail if it exists globally
        const clickHandler = window._dhtShowDetail ? `_dhtShowDetail(${o.id})` : '';

        return `<tr data-id="${o.id}" onclick="${clickHandler}" style="cursor:pointer;" title="Xem chi tiết">
            <td><span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:800;color:${_catColor};background:${_catBg};border:1px solid ${_catColor}22;white-space:nowrap">${o.category_name || '—'}</span></td>
            <td style="font-weight:600;">${_dhcttGetOrderCarriers(o)}</td>
            <td style="font-weight:600;">${shipDateFmt}</td>
            <td>${tienDo}</td>
            <td style="font-weight:700;color:${remColor};">${fmt(remaining)}</td>
            <td>${o.has_error ? '<span class="dhctt-error-icon" title="Đơn báo lỗi">!</span>' : ''}${priBadge}<strong style="color:${remaining > 0 ? '#c2410c' : '#0f766e'};">${o.order_code}</strong>${badgeRow}</td>
            <td>${o.customer_name || '—'}</td>
            <td>${o.customer_phone ? '<a href="tel:'+o.customer_phone+'" style="color:var(--info);" onclick="event.stopPropagation()">'+o.customer_phone+'</a>' : '—'}</td>
            <td>${o.province || '—'}</td>
            <td>${o.cskh_name || '—'}</td>
            <td style="text-align:center;font-weight:800;">${_dhcttFormatDetailedQuantity(o.items, o.total_quantity, o.order_code)}</td>
            <td></td>
        </tr>`;
    }).join('');

    _dhcttUpdateInfo(filtered.length, filtered);
}

// ========== MAIN RENDER ==========
async function renderDonhangchuathutienPage(content) {
    if (!document.getElementById('dhcttStyles')) {
        var st = document.createElement('style'); st.id = 'dhcttStyles';
        st.textContent = '.dhctt-wrap{display:flex;height:calc(100vh - 60px);overflow:hidden}'
            +'.dhctt-sidebar{width:270px;min-width:270px;background:#fff;border-right:1px solid var(--gray-200);overflow-y:auto;position:relative}'
            +'.dhctt-main{flex:1;min-width:0;display:flex;flex-direction:column;overflow-y:auto;padding:16px}.dhctt-main>*{flex-shrink:0}.dhctt-main .card{overflow:visible}'
            +'.dhctt-sb-title{font-size:13px;font-weight:800;padding:16px;border-bottom:1px solid var(--gray-200);text-align:center;position:relative;overflow:hidden}'
            +'.dhctt-sb-title::before{content:"";position:absolute;top:-50%;left:-50%;width:200%;height:200%;background:linear-gradient(45deg,transparent 30%,rgba(250,210,76,0.08) 50%,transparent 70%);animation:dhcttShimmer 3s infinite}'
            +'@keyframes dhcttShimmer{0%{transform:translateX(-100%) rotate(0)}100%{transform:translateX(100%) rotate(0)}}'
            +'.dhctt-sb-total{background:linear-gradient(135deg,#c2410c,#ea580c,#f97316);color:#fff;padding:12px 16px;font-size:13px;font-weight:800;display:flex;justify-content:space-between;cursor:pointer;position:relative;overflow:hidden}'
            +'.dhctt-sb-total::after{content:"";position:absolute;top:0;left:-100%;width:60%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent);animation:dhcttGlow 2.5s infinite}'
            +'@keyframes dhcttGlow{0%{left:-100%}100%{left:150%}}'
            +'.dhctt-sb-year{padding:8px 16px;font-weight:800;font-size:12px;color:var(--navy);cursor:pointer;display:flex;justify-content:space-between;align-items:center;background:#f8fafc;border-bottom:1px solid var(--gray-200)}'
            +'.dhctt-sb-year.active{background:#ffedd5;font-weight:900}'
            +'.dhctt-arrow-btn{display:inline-block;padding:2px 8px;margin-right:2px;cursor:pointer;transition:transform 0.2s ease,color 0.2s ease;font-size:10px}'
            +'.dhctt-arrow-btn:hover{color:#ea580c;transform:scale(1.25)}'
            +'.dhctt-sb-cat{padding:6px 16px 6px 28px;font-size:11px;font-weight:700;cursor:pointer;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #f0f0f0;color:#c2410c}'
            +'.dhctt-sb-cat:hover{background:#fffbeb}.dhctt-sb-cat.active{background:#ffedd5;font-weight:800}'
            +'.dhctt-sb-month{padding:5px 16px 5px 44px;font-size:11px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #fafafa}'
            +'.dhctt-sb-month:hover{background:#fffbeb}.dhctt-sb-month.active{background:#ffedd5;font-weight:700}'
            +'.dhctt-th-sort{transition:all .15s;white-space:nowrap}'
            +'.dhctt-th-sort:hover{filter:brightness(1.3)}'
            +'.dhctt-sort-arrow{font-size:10px;margin-left:3px;opacity:0.9}'
            +'@keyframes dhcttErrorPulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.2);opacity:0.7}}'
            +'.dhctt-error-icon{display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;background:#dc2626;color:#fff;font-size:10px;font-weight:900;margin-right:4px;animation:dhcttErrorPulse 1.5s ease-in-out infinite;box-shadow:0 0 6px rgba(220,38,38,0.6),0 0 12px rgba(220,38,38,0.3);vertical-align:middle;line-height:1}'
            +'@keyframes dhcttBlink{0%,100%{opacity:1}50%{opacity:0.4}}';
        document.head.appendChild(st);
    }

    const [catRes, staffRes, carrierRes] = await Promise.all([apiCall('/api/dht/categories'), apiCall('/api/dht/staff'), apiCall('/api/dht/carriers')]);
    _dhctt.categories = catRes.categories || [];
    _dhctt.staff = staffRes.staff || [];
    _dhctt.carriers = carrierRes.carriers || [];

    content.innerHTML = '<div class="dhctt-wrap"><div class="dhctt-sidebar" id="dhcttSidebar"><div style="padding:20px;text-align:center;color:var(--gray-400);font-size:12px">Đang tải...</div></div><div class="dhctt-main"><div style="display:flex;gap:10px;margin-bottom:8px;flex-wrap:wrap;align-items:center"><div id="dhcttSearchWrap" style="position:relative;display:flex;align-items:center;gap:0"><input type="text" id="dhcttSearch" class="form-control" placeholder="🔍 Tìm mã đơn, SĐT, tên khách..." style="width:320px;font-size:13px;padding:8px 36px 8px 14px;border-radius:10px 0 0 10px;border:2px solid #ea580c;border-right:none;transition:all .2s" onfocus="this.style.borderColor=&apos;#c2410c&apos;;this.style.boxShadow=&apos;0 0 0 3px rgba(194,65,12,0.15)&apos;" onblur="this.style.borderColor=&apos;#ea580c&apos;;this.style.boxShadow=&apos;none&apos;"><button onclick="_dhcttDoSearch()" style="background:linear-gradient(135deg,#c2410c,#ea580c);color:#fff;border:none;padding:8px 16px;border-radius:0 10px 10px 0;font-size:13px;font-weight:800;cursor:pointer;white-space:nowrap;height:100%;transition:all .15s" onmouseover="this.style.filter=&apos;brightness(1.1)&apos;" onmouseout="this.style.filter=&apos;&apos;">Tìm</button><button id="dhcttSearchClear" onclick="_dhcttClearSearch()" style="display:none;background:#fee2e2;color:#dc2626;border:1px solid #fca5a5;padding:4px 10px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;margin-left:6px;white-space:nowrap" title="Xóa tìm kiếm">✕</button></div><div id="dhcttSearchBadge" style="display:none;background:linear-gradient(135deg,#fef3c7,#fde68a);border:1px solid #f59e0b;padding:4px 12px;border-radius:8px;font-size:11px;font-weight:700;color:#92400e"></div><div id="dhcttFilterInfo" style="font-size:12px"></div>'
        +'<div id="dhcttStatCards" style="display:flex;gap:10px;flex:1;justify-content:center"></div>'
        +'</div>'
        +'<div id="dhcttFilterChips" style="display:none"></div>'
        +'<div id="dhcttDateBar" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:10px;padding:10px 14px;background:linear-gradient(135deg,#fff7ed,#ffedd5);border:1px solid #fed7aa;border-radius:10px">'
        +'<button onclick="_dhcttDateFilterToday()" style="background:#ea580c;color:#fff;border:none;border-radius:6px;padding:5px 14px;font-size:11px;font-weight:700;cursor:pointer">📅 Hôm Nay</button>'
        +'<button onclick="_dhcttDateFilterMonth(0)" style="background:#f97316;color:#fff;border:none;border-radius:6px;padding:5px 14px;font-size:11px;font-weight:700;cursor:pointer">📅 Tháng Này</button>'
        +'<span style="width:1px;height:24px;background:#fed7aa;margin:0 4px"></span>'
        +'<label style="font-size:11px;font-weight:700;color:#7c2d12">🗓️ CHỌN THÁNG</label>'
        +'<input type="month" id="dhcttMonthPick" class="form-control" style="width:160px;font-size:11px;padding:4px 8px" onchange="_dhcttDateFilterMonthPick()">'
        +'<span style="width:1px;height:24px;background:#fed7aa;margin:0 4px"></span>'
        +'<label style="font-size:11px;font-weight:700;color:#7c2d12">📆 CHỌN NĂM</label>'
        +'<select id="dhcttYearPick" class="form-control" style="width:90px;font-size:11px;padding:4px 8px" onchange="_dhcttDateFilterYear()"><option value="">Tất cả</option></select>'
        +'<span style="width:1px;height:24px;background:#fed7aa;margin:0 4px"></span>'
        +'<label style="font-size:11px;font-weight:700;color:#7c2d12">👤 CSKH</label>'
        +'<select id="dhcttCskhPick" class="form-control" style="width:150px;font-size:11px;padding:4px 8px" onchange="_dhcttDateFilterCskh()"><option value="">Tất cả</option></select>'
        +'<button onclick="_dhcttDateFilterClear()" style="background:none;border:1px solid #fed7aa;color:#c2410c;border-radius:6px;padding:4px 10px;font-size:11px;font-weight:700;cursor:pointer" title="Xóa lọc">✕ Xóa</button>'
        +'</div>'
        +'<div id="dhcttPaginationTop" style="margin:8px 0"></div>'
        +'<div class="card"><div class="card-body" style="overflow-x:auto;padding:8px"><table class="table" style="font-size:12px;white-space:nowrap" id="dhcttTable"><thead><tr style="background:#1e293b;color:#fff"><th>Lĩnh Vực</th><th>Hình Thức Vận Chuyển</th><th>Ngày Gửi</th><th>Tiến Độ</th><th>Còn Lại</th><th>Mã Đơn</th><th>Tên Khách</th><th>Sđt</th><th>Thành Phố</th><th>CSKH</th><th>Tổng SL</th><th></th></tr></thead><tbody id="dhcttTbody"><tr><td colspan="12" style="text-align:center;padding:40px">⏳</td></tr></tbody></table></div></div>'
        +'<div id="dhcttPaginationBottom" style="margin:8px 0"></div>'
        +'</div></div>';

    let _st; document.getElementById('dhcttSearch').addEventListener('input', () => { clearTimeout(_st); _st = setTimeout(() => _dhcttDoSearch(), 500); });
    document.getElementById('dhcttSearch').addEventListener('keydown', (e) => { if (e.key === 'Enter') { clearTimeout(_st); _dhcttDoSearch(); } });

    var nowVN = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
    _dhctt.filter = { carrier_id: 0, year: nowVN.getFullYear() };
    _dhcttSyncDateInputs();

    var ypEl = document.getElementById('dhcttYearPick');
    if (ypEl) { var cy = nowVN.getFullYear(); for (var yi = cy+1; yi >= cy-3; yi--) { ypEl.innerHTML += '<option value="'+yi+'">'+yi+'</option>'; } }

    await _dhcttLoadTree();
    await _dhcttLoadOrders();
}
