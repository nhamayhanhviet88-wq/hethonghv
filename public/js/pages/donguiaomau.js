// ========== ĐƠN GỬI ÁO MẪU — Bộ Phận Văn Phòng ==========
var _dgam = { tree: [], orders: [], filter: {}, page: 1, pageSize: 50, searchQuery: '' };
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
            +'.dgam-icon-btn.on-proof-pending{background:#ffedd5;border-color:#f97316}'
            +'.dgam-icon-btn.on-proof-uploaded{background:#f3e8ff;border-color:#a855f7}'
            +'#dgamSearchInput:focus{border-color:#0284c7;box-shadow:0 0 0 3px rgba(2,132,199,0.15);background:#fff}'
        ;
        document.head.appendChild(st);
    }

    content.innerHTML = '<div class="dgam-wrap"><div class="dgam-sidebar" id="dgamSidebar"><div style="padding:20px;text-align:center;color:var(--gray-400);font-size:12px">Đang tải...</div></div><div class="dgam-main">'
        +'<div style="display:flex;gap:12px;margin-bottom:8px;flex-wrap:wrap;align-items:center">'
        +'<div id="dgamFilterInfo" style="font-size:12px"></div>'
        +'<div id="dgamSearchContainer" style="position:relative;width:280px;margin-left:4px">'
        +'<input type="text" id="dgamSearchInput" placeholder="🔍 Tìm mã đơn, khách, SĐT..." oninput="_dgamOnSearchInput(this.value)" style="width:100%;font-family:inherit;font-size:12.5px;font-weight:600;padding:8px 30px 8px 32px;border:1.8px solid #cbd5e1;border-radius:10px;outline:none;transition:all 0.2s;box-shadow:inset 0 1px 2px rgba(0,0,0,0.02);">'
        +'<span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);font-size:13px;color:#94a3b8;pointer-events:none;">🔍</span>'
        +'<button id="dgamSearchClearBtn" onclick="_dgamClearSearch()" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);border:none;background:none;font-size:14px;color:#94a3b8;cursor:pointer;display:none;font-weight:700;padding:0;line-height:1;">✕</button>'
        +'</div>'
        +'<div id="dgamStatCards" style="display:flex;gap:10px;flex:1;justify-content:center"></div>'
        +'<div style="margin-left:auto"><button onclick="_dgamShowAdd()" style="font-size:13px;padding:9px 20px;background:linear-gradient(135deg,#0369a1,#0284c7,#0ea5e9);color:#fff;border:none;border-radius:10px;font-weight:900;cursor:pointer;box-shadow:0 3px 12px rgba(14,165,233,0.4);transition:all .2s" onmouseover="this.style.transform=\'scale(1.05)\'" onmouseout="this.style.transform=\'scale(1)\'">➕ Thêm Đơn</button></div>'
        +'</div>'
        +'<div id="dgamSubFilterContainer" style="display:flex;gap:10px;margin-bottom:12px;align-items:center;flex-wrap:wrap"></div>'
        +'<div id="dgamPaginationTop" style="margin:8px 0"></div>'
        +'<div class="card"><div class="card-body" style="overflow-x:auto;padding:8px"><table class="table" style="font-size:12px;white-space:nowrap" id="dgamTable"><thead><tr style="background:var(--gray-800)">'
        +'<th>Trạng Thái</th>'
        +'<th>Ngày LĐ</th>'
        +'<th>Còn Lại</th>'
        +'<th>Mã Đơn Áo Mẫu</th>'
        +'<th>Mã Đơn Chốt</th>'
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
        +'</tr></thead><tbody id="dgamTbody"><tr><td colspan="16" style="text-align:center;padding:40px">⏳</td></tr></tbody></table></div></div>'
        +'<div id="dgamPaginationBottom" style="margin:8px 0"></div>'
        +'</div></div>';

    var nowVN = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
    _dgam.filter = { year: nowVN.getFullYear() };
    _dgam.subFilter = null;
    _dgam.searchQuery = '';
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
function _dgamFilterAll() { var n = new Date(new Date().toLocaleString('en-US',{timeZone:'Asia/Ho_Chi_Minh'})); _dgam.filter={year:n.getFullYear()}; _dgam.subFilter=null; _dgam.page=1; _dgamLoadTree(); _dgamLoadOrders(); }
function _dgamFilterMonth(y, m) { _dgam.filter = { year: y, month: m }; _dgam.subFilter=null; _dgam.page = 1; _dgamLoadTree(); _dgamLoadOrders(); }

// ========== ORDERS ==========
async function _dgamLoadOrders() {
    var f = _dgam.filter, url = '/api/don-gui-ao-mau/orders?';
    if (!_dgam.searchQuery) {
        if (f.year) url += 'year=' + f.year + '&';
        if (f.month) url += 'month=' + f.month + '&';
    }
    var data = await apiCall(url);
    _dgam.orders = data.orders || [];
    _dgam.page = 1;
    _dgamRenderTable();
}

function _dgamRenderTable() {
    var all = _dgam.orders.slice();

    // Apply subFilter if active
    if (_dgam.subFilter) {
        all = all.filter(o => {
            if (_dgam.subFilter === 'chua_duyet') {
                return !o.status_duyet && o.order_status !== 'khong_duyet';
            }
            if (_dgam.subFilter === 'chua_hoan') {
                const isTargetCategory = ['Gửi mẫu áo', 'Gửi mẫu quần', 'Gửi mẫu váy'].includes(o.category);
                if (isTargetCategory) {
                    if (o.status_hoan_hang) {
                        return !o.hoan_hang_received_proof_image;
                    } else {
                        return o.order_status === 'da_gui' || o.order_status === 'hoan_thanh';
                    }
                }
                return false;
            }
            if (_dgam.subFilter === 'chua_kiem_tra') {
                const isTargetCategory = ['Gửi mẫu áo', 'Gửi mẫu quần', 'Gửi mẫu váy'].includes(o.category);
                const isInspectLocked = isTargetCategory && !o.hoan_hang_received_proof_image;
                return !o.status_kiem_tra && !isInspectLocked;
            }
            return true;
        });
    }

    // Apply search query if active
    if (_dgam.searchQuery) {
        const q = _dgam.searchQuery.toLowerCase().trim();
        all = all.filter(o => {
            const matchSampleCode = (o.sample_order_code || '').toLowerCase().includes(q);
            const matchClosedCodes = (o.closed_order_codes || '').toLowerCase().includes(q);
            const matchName = (o.customer_name || '').toLowerCase().includes(q);
            const matchPhone = (o.customer_phone || '').toLowerCase().includes(q);
            return matchSampleCode || matchClosedCodes || matchName || matchPhone;
        });
    }

    var total = all.length, totalPages = Math.ceil(total / _dgam.pageSize) || 1;
    if (_dgam.page > totalPages) _dgam.page = totalPages;
    if (_dgam.page < 1) _dgam.page = 1;
    var start = (_dgam.page - 1) * _dgam.pageSize;
    var paged = all.slice(start, start + _dgam.pageSize);
    _dgamRenderRows(paged);
    _dgamRenderPagination(total, totalPages);
    _dgamRenderInfo(total, all);
    
    // Render the sub-filters UI
    _dgamRenderSubFilters();
}

function _dgamRenderSubFilters() {
    const container = document.getElementById('dgamSubFilterContainer');
    if (!container) return;

    const totalOrders = _dgam.orders || [];
    const countChuaDuyet = totalOrders.filter(o => !o.status_duyet && o.order_status !== 'khong_duyet').length;
    const countChuaHoan = totalOrders.filter(o => {
        const isTargetCategory = ['Gửi mẫu áo', 'Gửi mẫu quần', 'Gửi mẫu váy'].includes(o.category);
        if (isTargetCategory) {
            if (o.status_hoan_hang) {
                return !o.hoan_hang_received_proof_image;
            } else {
                return o.order_status === 'da_gui' || o.order_status === 'hoan_thanh';
            }
        }
        return false;
    }).length;
    const countChuaKiemTra = totalOrders.filter(o => {
        const isTargetCategory = ['Gửi mẫu áo', 'Gửi mẫu quần', 'Gửi mẫu váy'].includes(o.category);
        const isInspectLocked = isTargetCategory && !o.hoan_hang_received_proof_image;
        return !o.status_kiem_tra && !isInspectLocked;
    }).length;

    const activeFilter = _dgam.subFilter || '';

    const btnStyle = (type, isActive) => {
        let bg, border, text, shadow, transform = 'scale(1)';
        
        if (type === 'chua_duyet') {
            if (isActive) {
                bg = 'linear-gradient(135deg, #f59e0b, #d97706)';
                border = '#d97706';
                text = '#ffffff';
                shadow = 'rgba(245, 158, 11, 0.4)';
                transform = 'scale(1.05)';
            } else {
                bg = '#fef3c7';
                border = '#fde68a';
                text = '#b45309';
                shadow = 'rgba(245, 158, 11, 0.08)';
            }
        } else if (type === 'chua_hoan') {
            if (isActive) {
                bg = 'linear-gradient(135deg, #ef4444, #dc2626)';
                border = '#dc2626';
                text = '#ffffff';
                shadow = 'rgba(239, 68, 68, 0.4)';
                transform = 'scale(1.05)';
            } else {
                bg = '#fee2e2';
                border = '#fca5a5';
                text = '#b91c1c';
                shadow = 'rgba(239, 68, 68, 0.08)';
            }
        } else if (type === 'chua_kiem_tra') {
            if (isActive) {
                bg = 'linear-gradient(135deg, #8b5cf6, #6d28d9)';
                border = '#6d28d9';
                text = '#ffffff';
                shadow = 'rgba(139, 92, 246, 0.4)';
                transform = 'scale(1.05)';
            } else {
                bg = '#ede9fe';
                border = '#ddd6fe';
                text = '#6d28d9';
                shadow = 'rgba(139, 92, 246, 0.08)';
            }
        }
        
        return `font-family: inherit; background:${bg}; border:1.8px solid ${border}; color:${text}; box-shadow:0 4px 12px ${shadow}; transform:${transform}; padding:8px 18px; border-radius:10px; font-weight:800; font-size:12px; cursor:pointer; display:inline-flex; align-items:center; gap:8px; transition:all 0.2s ease;`;
    };

    container.innerHTML = `
        <div style="font-weight:800; font-size:12px; color:#64748b; margin-right:8px; text-transform:uppercase; letter-spacing:0.5px;">Bộ lọc nhanh:</div>
        <button onclick="_dgamSetSubFilter('chua_duyet')" style="${btnStyle('chua_duyet', activeFilter === 'chua_duyet')}" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='${activeFilter === 'chua_duyet' ? 'scale(1.05)' : 'scale(1)'}'">
            <span>⏳ Chưa Duyệt</span>
            <span style="background:${activeFilter === 'chua_duyet' ? '#ffffff' : '#b45309'}; color:${activeFilter === 'chua_duyet' ? '#b45309' : '#ffffff'}; padding:2px 8px; border-radius:8px; font-size:11px; font-weight:800; min-width:20px; text-align:center; transition:all 0.2s;">${countChuaDuyet}</span>
        </button>
        <button onclick="_dgamSetSubFilter('chua_hoan')" style="${btnStyle('chua_hoan', activeFilter === 'chua_hoan')}" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='${activeFilter === 'chua_hoan' ? 'scale(1.05)' : 'scale(1)'}'">
            <span>🔄 Chưa Hoàn</span>
            <span style="background:${activeFilter === 'chua_hoan' ? '#ffffff' : '#b91c1c'}; color:${activeFilter === 'chua_hoan' ? '#b91c1c' : '#ffffff'}; padding:2px 8px; border-radius:8px; font-size:11px; font-weight:800; min-width:20px; text-align:center; transition:all 0.2s;">${countChuaHoan}</span>
        </button>
        <button onclick="_dgamSetSubFilter('chua_kiem_tra')" style="${btnStyle('chua_kiem_tra', activeFilter === 'chua_kiem_tra')}" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='${activeFilter === 'chua_kiem_tra' ? 'scale(1.05)' : 'scale(1)'}'">
            <span>🔍 Chưa Kiểm Tra</span>
            <span style="background:${activeFilter === 'chua_kiem_tra' ? '#ffffff' : '#6d28d9'}; color:${activeFilter === 'chua_kiem_tra' ? '#6d28d9' : '#ffffff'}; padding:2px 8px; border-radius:8px; font-size:11px; font-weight:800; min-width:20px; text-align:center; transition:all 0.2s;">${countChuaKiemTra}</span>
        </button>
        ${activeFilter ? `
            <button onclick="_dgamSetSubFilter(null)" style="background:none; border:none; color:#dc2626; font-size:11.5px; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:4px; padding:6px 10px;" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'">
                ✕ Xóa bộ lọc
            </button>
        ` : ''}
    `;
}

function _dgamSetSubFilter(filterName) {
    if (_dgam.subFilter === filterName) {
        _dgam.subFilter = null;
    } else {
        _dgam.subFilter = filterName;
    }
    _dgam.page = 1;
    _dgamRenderTable();
}

var _dgamSearchTimeout = null;
function _dgamOnSearchInput(val) {
    _dgam.searchQuery = val;
    const clearBtn = document.getElementById('dgamSearchClearBtn');
    if (clearBtn) {
        clearBtn.style.display = val ? 'block' : 'none';
    }
    _dgam.page = 1;
    
    if (_dgamSearchTimeout) clearTimeout(_dgamSearchTimeout);
    _dgamSearchTimeout = setTimeout(async function() {
        await _dgamLoadOrders();
    }, 250);
}

function _dgamClearSearch() {
    const input = document.getElementById('dgamSearchInput');
    if (input) {
        input.value = '';
    }
    if (_dgamSearchTimeout) clearTimeout(_dgamSearchTimeout);
    _dgam.searchQuery = '';
    const clearBtn = document.getElementById('dgamSearchClearBtn');
    if (clearBtn) {
        clearBtn.style.display = 'none';
    }
    _dgam.page = 1;
    _dgamLoadOrders();
}

var _dgamStatusMap = {
    'cho_duyet': { label: 'Chờ Duyệt', bg: '#fef3c7', color: '#92400e' },
    'khong_duyet': { label: 'Không Duyệt<br>Yêu cầu sửa đơn', bg: '#fee2e2', color: '#b91c1c' },
    'dang_gui_hang': { label: 'Đã Duyệt Gửi', bg: '#dcfce7', color: '#166534' },
    'da_duyet': { label: 'Đã Duyệt', bg: '#dcfce7', color: '#166534' },
    'da_gui': { label: 'Đã Gửi Mẫu', bg: '#dbeafe', color: '#1e40af' },
    'hoan_hang': { label: 'Yêu Cầu Hoàn Mẫu', bg: '#fee2e2', color: '#991b1b' },
    'hoan_mau_xong': { label: 'Mẫu Áo Đã Hoàn', bg: '#f3e8ff', color: '#7e22ce' },
    'hoan_thanh': { label: 'Đã Gửi Mẫu', bg: '#dbeafe', color: '#1e40af' },
    'da_chup_anh_mau_hoan': { label: 'Đã Chụp Ảnh Mẫu Hoàn', bg: '#ede9fe', color: '#6d28d9' },
    'trinh_da_kiem_tra': { label: 'Chị Trinh Đã Kiểm Tra', bg: '#ccfbf1', color: '#0f766e' }
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
        var st = o.status_hoan_hang 
            ? (o.status_gui_don_hoan 
                ? (o.status_kiem_tra 
                    ? _dgamStatusMap['trinh_da_kiem_tra'] 
                    : (o.hoan_hang_received_proof_image ? _dgamStatusMap['da_chup_anh_mau_hoan'] : _dgamStatusMap['hoan_mau_xong'])) 
                : _dgamStatusMap['hoan_hang']) 
            : (_dgamStatusMap[o.order_status] || { label: o.order_status || '—', bg: '#f1f5f9', color: '#475569' });
        var remaining = Number(o.remaining_amount) || 0;
        var remColor = remaining > 0 ? 'var(--danger)' : 'var(--success)';

        var userObj = window.currentUser || window._currentUser || (typeof currentUser !== 'undefined' ? currentUser : null);
        
        var isCanApprove = userObj && (userObj.role === 'giam_doc' || userObj.username === 'quanlyxuong' || userObj.full_name === 'Lê Công Thực');
        var approveBtnHtml = '';
        if (isCanApprove) {
            if (o.status_duyet) {
                approveBtnHtml = '<button class="dgam-icon-btn on-duyet" title="Xem chi tiết duyệt" onclick="_dgamShowActionDetail('+o.id+',\'duyet\')">✅</button>';
            } else {
                approveBtnHtml = '<button class="dgam-icon-btn" title="Duyệt" onclick="_dgamTogSt('+o.id+',\'status_duyet\','+!o.status_duyet+')">✅</button>';
            }
        } else {
            if (o.status_duyet) {
                approveBtnHtml = '<button class="dgam-icon-btn on-duyet" title="Xem chi tiết duyệt" onclick="_dgamShowActionDetail('+o.id+',\'duyet\')">✅</button>';
            } else {
                approveBtnHtml = '<button class="dgam-icon-btn" title="Chưa duyệt" style="opacity:0.5;cursor:not-allowed;" disabled>✅</button>';
            }
        }

        var catLower = (o.category || '').toLowerCase().trim();
        var noReturnNeeded = catLower.includes('tem') || catLower.includes('pet') || catLower.includes('khác') || catLower.includes('khac') || catLower.includes('vải') || catLower.includes('vai');
        var isQuanLyXuong = userObj && (userObj.username === 'quanlyxuong' || userObj.full_name === 'Lê Công Thực');
        var isDaGuiMau = o.order_status === 'da_gui' || o.order_status === 'hoan_thanh';
        var hoanBtnHtml = '';
        if (!isQuanLyXuong && !noReturnNeeded) {
            if (o.status_hoan_hang) {
                hoanBtnHtml = '<button class="dgam-icon-btn on-hoan" title="Thông tin hoàn hàng" onclick="_dgamOnHoanHangClick('+o.id+')">🔄</button>';
            } else if (isDaGuiMau) {
                if (remaining === 0) {
                    hoanBtnHtml = '<button class="dgam-icon-btn" title="Hoàn hàng" onclick="_dgamOnHoanHangClick('+o.id+')">🔄</button>';
                } else {
                    hoanBtnHtml = '<button class="dgam-icon-btn" title="Chỉ được hoàn hàng khi số tiền còn lại bằng 0" style="opacity:0.5;cursor:not-allowed;" onclick="showToast(\'🔒 Chỉ được hoàn hàng khi số tiền còn lại bằng 0!\', \'error\')">🔄</button>';
                }
            } else {
                hoanBtnHtml = '<button class="dgam-icon-btn" title="Chỉ được hoàn hàng khi trạng thái là Đã Gửi Mẫu" style="opacity:0.5;cursor:not-allowed;" disabled>🔄</button>';
            }
        }

        // Bằng chứng mẫu áo đã về (📸)
        var isMauAoDaHoan = o.status_hoan_hang && o.status_gui_don_hoan;
        var deptName = (userObj && userObj.department_name || '').toLowerCase();
        var isKeToan = deptName.includes('kế toán') || deptName.includes('ke toan');
        var isQLCCTrinh = userObj && userObj.full_name && (userObj.full_name.includes('Lê Việt Trinh') || userObj.full_name.includes('Le Viet Trinh') || userObj.username === 'trinh');
        var isGiamDoc = userObj && userObj.role === 'giam_doc';
        var isSale = !isKeToan && !isQuanLyXuong && !isQLCCTrinh && !isGiamDoc;
        var isTargetCategory = ['Gửi mẫu áo', 'Gửi mẫu quần', 'Gửi mẫu váy'].includes(o.category);

        var receivedProofBtnHtml = '';
        if (isTargetCategory) {
            if (isMauAoDaHoan) {
                if (o.hoan_hang_received_proof_image) {
                    receivedProofBtnHtml = '<button class="dgam-icon-btn on-proof-uploaded" title="Xem ảnh chứng minh mẫu về" onclick="_dgamShowReceivedProofModal('+o.id+')">📸</button>';
                } else {
                    if (isSale) {
                        receivedProofBtnHtml = '<button class="dgam-icon-btn on-proof-pending" title="Chụp ảnh chứng minh mẫu đã về" onclick="_dgamShowReceivedProofModal('+o.id+')">📸</button>';
                    } else {
                        receivedProofBtnHtml = '<button class="dgam-icon-btn" title="Chỉ nhân viên sale mới được chụp ảnh chứng minh" style="opacity:0.4;cursor:not-allowed;" disabled>📸</button>';
                    }
                }
            } else {
                receivedProofBtnHtml = '<button class="dgam-icon-btn" title="Chụp ảnh chứng minh mẫu đã về (Chỉ khi mẫu đã hoàn)" style="opacity:0.4;cursor:not-allowed;" disabled>📸</button>';
            }
        }

        // Kiểm tra đơn mẫu (🔍): Lê Việt Trinh và Giám đốc có quyền kiểm tra; các tài khoản khác chỉ xem (disabled)
        var isLeVietTrinh = userObj && userObj.full_name && (userObj.full_name.includes('Lê Việt Trinh') || userObj.full_name.includes('Le Viet Trinh'));
        var kiemTraBtnHtml = '';
        if (isLeVietTrinh || isGiamDoc) {
            if (isTargetCategory && !o.hoan_hang_received_proof_image) {
                kiemTraBtnHtml = '<button class="dgam-icon-btn" title="Mẫu áo chưa về nên chưa được kiểm tra" style="opacity:0.4;cursor:not-allowed;" onclick="showToast(\'🔒 Mẫu áo chưa về nên chưa được kiểm tra\', \'error\')">🔍</button>';
            } else {
                kiemTraBtnHtml = '<button class="dgam-icon-btn'+(o.status_kiem_tra?' on-ktra':'')+'" title="Kiểm tra" onclick="_dgamShowInspectConfirmModal('+o.id+')">🔍</button>';
            }
        } else {
            if (o.status_kiem_tra) {
                kiemTraBtnHtml = '<button class="dgam-icon-btn on-ktra" title="Xem chi tiết kiểm tra" onclick="_dgamShowActionDetail('+o.id+',\'kiem_tra\')">🔍</button>';
            } else {
                kiemTraBtnHtml = '<button class="dgam-icon-btn" title="Chưa kiểm tra" style="opacity:0.5;cursor:not-allowed;" disabled>🔍</button>';
            }
        }

        var statusHtml = '<td style="text-align:center" onclick="event.stopPropagation()">'
            +'<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px">'
            +'<div><span style="display:inline-block;padding:4px 8px;border-radius:4px;font-size:10px;font-weight:700;background:'+st.bg+';color:'+st.color+';white-space:' + (st.label.includes('<br>') ? 'normal' : 'nowrap') + ';line-height:1.3;text-align:center;">'+st.label+'</span></div>'
            +'<div style="display:flex;gap:2px;justify-content:center">'
            +approveBtnHtml
            +hoanBtnHtml
            +receivedProofBtnHtml
            +kiemTraBtnHtml
            +'</div>'
            +'</div>'
            +'</td>';

        var prodDisplay = o.product_name || '—';
        if (o.linh_vuc) {
            prodDisplay = '<span style="background:#fef3c7;color:#d97706;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;margin-right:4px">' + o.linh_vuc + '</span>' + prodDisplay;
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

        var codesHtml = '—';
        if (o.closed_order_codes) {
            codesHtml = '<div style="max-height:80px;overflow-y:auto;font-size:11px;line-height:1.4;font-weight:700;color:#0369a1">' + o.closed_order_codes + '</div>';
        }

        return '<tr style="cursor:pointer" onclick="_dgamShowDetail('+o.id+')">'
            +statusHtml
            +'<td>'+fmtHM_DM(o.created_at)+'</td>'
            +'<td style="font-weight:700;color:'+remColor+'">'+_dgamFmt(remaining)+'</td>'
            +'<td><strong style="color:'+(remaining>0?'#c2410c':'#0f766e')+'">'+(o.sample_order_code||'—')+'</strong></td>'
            +'<td>'+codesHtml+'</td>'
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
    if (field === 'status_duyet' && val === true) {
        var o = (_dgam.orders || []).find(x => x.id === id);
        if (o) {
            var imgHtml = o.sample_image 
                ? '<img src="' + o.sample_image + '" style="max-width:100%;max-height:220px;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.15);margin:12px 0;object-fit:contain;cursor:pointer;" onclick="_dgamShowImagePreview(\'' + o.sample_image + '\')" title="Bấm để phóng to">'
                : '<div style="background:#f1f5f9;color:#94a3b8;padding:24px;border-radius:12px;text-align:center;font-size:13px;font-weight:600;margin:12px 0;">🚫 Không có ảnh mẫu</div>';
            
            var priorityUpper = (o.shipping_priority || 'CHUẨN').toUpperCase();
            var shipDateStr = '—';
            if (o.ship_date) {
                var dObj = new Date(o.ship_date);
                var formattedDate = dObj.getDate() + '/' + (dObj.getMonth() + 1);
                if (priorityUpper === 'CHUẨN' && o.ship_time) {
                    shipDateStr = o.ship_time + ' ' + formattedDate;
                } else {
                    shipDateStr = formattedDate;
                }
            }

            var priorityValue = o.shipping_priority || 'CHUẨN';
            var priorityColor = '#0f172a'; // Default
            if (priorityUpper === 'GẤP') {
                priorityColor = '#dc2626'; // Red
            } else if (priorityUpper === 'CHUẨN') {
                priorityColor = '#7c3aed'; // Purple
            }

            var bodyHTML = '<div style="text-align:center;font-family:inherit;padding:12px 6px;">'
                +'<div style="font-size:42px;margin-bottom:12px;">📋</div>'
                +'<h3 style="font-size:18px;font-weight:800;color:#1e293b;margin-bottom:8px;">Xác nhận duyệt gửi đơn hàng mẫu</h3>'
                +'<p style="font-size:13.5px;color:#64748b;line-height:1.5;margin-bottom:16px;">Vui lòng kiểm tra kỹ thông tin sản phẩm mẫu trước khi duyệt:</p>'
                +'<div style="background:#f8fafc;border:1.5px solid #cbd5e1;border-radius:12px;padding:16px;text-align:left;max-width:380px;margin:0 auto;box-shadow:inset 0 2px 4px rgba(0,0,0,0.02);">'
                +'<div style="margin-bottom:8px;font-size:13px;"><strong style="color:#475569;">👤 Khách hàng:</strong> <span style="font-weight:700;color:#0f172a;">'+(o.customer_name||'—')+'</span></div>'
                +'<div style="margin-bottom:0px;font-size:13px;"><strong style="color:#475569;">👤 CSKH:</strong> <span style="font-weight:700;color:#0f172a;">'+(o.created_by_name||'—')+'</span></div>'
                +'<div style="border-top:1.5px solid #e2e8f0;margin:12px 0;"></div>'
                +'<div style="margin-bottom:8px;font-size:13px;"><strong style="color:#475569;">🏷️ Mã đơn mẫu:</strong> <span style="font-weight:700;color:#0f766e;">'+(o.sample_order_code||'—')+'</span></div>'
                +'<div style="margin-bottom:8px;font-size:13px;"><strong style="color:#475569;">👕 Sản phẩm:</strong> <span style="font-weight:700;color:#0f172a;">'+(o.product_name||'—')+'</span></div>'
                +'<div style="margin-bottom:0px;font-size:13px;"><strong style="color:#475569;">🔢 Số lượng:</strong> <span style="font-weight:800;color:#2563eb;font-size:14px;">'+(o.quantity||0)+'</span></div>'
                +'<div style="border-top:1.5px solid #e2e8f0;margin:12px 0;"></div>'
                +'<div style="margin-bottom:8px;font-size:13px;"><strong style="color:#475569;">⚡ Tiêu chuẩn gửi:</strong> <span style="font-weight:700;color:'+priorityColor+';">'+priorityValue+'</span></div>'
                +'<div style="margin-bottom:0px;font-size:13px;"><strong style="color:#475569;">📅 Ngày gửi dự kiến:</strong> <span style="font-weight:800;color:#0369a1;">'+shipDateStr+'</span></div>'
                +'</div>'
                +imgHtml
                +'</div>';
                
            var footerHTML = '<button class="btn btn-secondary" onclick="closeModal()" style="padding:10px 24px;font-weight:600;margin-right:8px;">Hủy</button>'
                +'<button class="btn btn-danger" id="dgamRejectBtn" style="padding:10px 24px;font-weight:700;background:linear-gradient(135deg,#ef4444,#dc2626);border:none;box-shadow:0 4px 12px rgba(239,68,68,0.3);margin-right:8px;" onclick="_dgamExecuteReject('+id+')">❌ Không Duyệt</button>'
                +'<button class="btn btn-success" id="dgamConfirmApproveBtn" style="padding:10px 28px;font-weight:700;background:linear-gradient(135deg,#10b981,#059669);border:none;box-shadow:0 4px 12px rgba(16,185,129,0.3);" onclick="_dgamExecuteApprove('+id+')">✅ Duyệt Gửi</button>';
                
            openModal('Duyệt Gửi Đơn Mẫu', bodyHTML, footerHTML);
            return;
        }
    }

    try {
        await apiCall('/api/don-gui-ao-mau/' + id + '/status', 'PATCH', { field: field, value: val });
        if (typeof showToast === 'function') {
            showToast('✅ Đã cập nhật trạng thái thành công!');
        }
        await _dgamLoadOrders();
    } catch (err) {
        if (typeof showToast === 'function') {
            showToast(err.message || 'Lỗi khi cập nhật trạng thái', 'error');
        }
    }
}

async function _dgamExecuteApprove(id) {
    const btnApprove = document.getElementById('dgamConfirmApproveBtn');
    const btnReject = document.getElementById('dgamRejectBtn');
    if (btnApprove) { btnApprove.disabled = true; btnApprove.innerText = 'Đang xử lý...'; }
    if (btnReject) btnReject.disabled = true;
    try {
        await apiCall('/api/don-gui-ao-mau/' + id + '/status', 'PATCH', { field: 'status_duyet', value: true });
        closeModal();
        if (typeof showToast === 'function') {
            showToast('✅ Đã duyệt gửi đơn mẫu thành công!');
        }
        await _dgamLoadOrders();
    } catch(err) {
        if (btnApprove) { btnApprove.disabled = false; btnApprove.innerText = '✅ Duyệt Gửi'; }
        if (btnReject) btnReject.disabled = false;
        if (typeof showToast === 'function') {
            showToast(err.message || 'Lỗi khi duyệt gửi', 'error');
        }
    }
}

async function _dgamExecuteReject(id) {
    const btnApprove = document.getElementById('dgamConfirmApproveBtn');
    const btnReject = document.getElementById('dgamRejectBtn');
    if (btnApprove) btnApprove.disabled = true;
    if (btnReject) { btnReject.disabled = true; btnReject.innerText = 'Đang xử lý...'; }
    try {
        await apiCall('/api/don-gui-ao-mau/' + id + '/status', 'PATCH', { field: 'status_duyet', value: false, isReject: true });
        closeModal();
        if (typeof showToast === 'function') {
            showToast('❌ Đã từ chối duyệt đơn mẫu!');
        }
        await _dgamLoadOrders();
    } catch(err) {
        if (btnApprove) btnApprove.disabled = false;
        if (btnReject) { btnReject.disabled = false; btnReject.innerText = '❌ Không Duyệt'; }
        if (typeof showToast === 'function') {
            showToast(err.message || 'Lỗi khi từ chối duyệt', 'error');
        }
    }
}

function _dgamRenderPagination(totalItems, totalPages) {
    var html = '';
    if (totalPages <= 1) {
        html = '';
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
    var label = '';
    if (_dgam.searchQuery) {
        label = '<span style="color:#38bdf8">🔍</span> TÌM KIẾM TOÀN BỘ';
    } else {
        var f = _dgam.filter, parts = [];
        if (f.year) parts.push('<span style="color:#0ea5e9">📆</span> NĂM ' + f.year);
        if (f.month) parts.push('<span style="color:#60a5fa">🗓️</span> THÁNG ' + f.month);
        label = parts.length > 0 ? parts.join(' <span style="opacity:0.5;margin:0 6px">•</span> ') : 'Tất cả';
    }
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

async function _dgamPasteChuanProofImg(e) {
    const items = (e.clipboardData || e.originalEvent?.clipboardData)?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
            const blob = items[i].getAsFile();
            const compressed = await _dgamResizeAndStoreImage(blob);
            _dgam.chuanProofImgBase64 = compressed;
            const img = document.getElementById('dgamChuanProofImg');
            const ph = document.getElementById('dgamChuanProofImgPlaceholder');
            const btn = document.getElementById('dgamChuanProofImgDeleteBtn');
            if (img) { img.src = compressed; img.style.display = 'block'; }
            if (ph) ph.style.display = 'none';
            if (btn) btn.style.display = 'block';
            const zone = document.getElementById('dgamChuanProofImgZone');
            if (zone) { zone.style.borderColor = '#059669'; zone.style.background = '#f0fdf4'; }
            if (typeof showToast === 'function') {
                showToast('✅ Đã dán ảnh chứng minh thành công!');
            }
            e.preventDefault();
            return;
        }
    }
    if (typeof showToast === 'function') {
        showToast('Không tìm thấy hình ảnh trong clipboard!', 'error');
    }
}

function _dgamDeleteChuanProofImg() {
    _dgam.chuanProofImgBase64 = null;
    const img = document.getElementById('dgamChuanProofImg');
    const ph = document.getElementById('dgamChuanProofImgPlaceholder');
    const btn = document.getElementById('dgamChuanProofImgDeleteBtn');
    const zone = document.getElementById('dgamChuanProofImgZone');
    if (img) { img.src = ''; img.style.display = 'none'; }
    if (ph) ph.style.display = 'block';
    if (btn) btn.style.display = 'none';
    if (zone) {
        zone.style.borderColor = '#cbd5e1';
        zone.style.background = '#f8fafc';
    }
    if (typeof showToast === 'function') {
        showToast('Đã xóa ảnh chứng minh, vui lòng dán lại!');
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
        el.value = '';
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
        } else {
            timeContainer.style.display = 'none';
            if (hourInput) hourInput.value = '';
            if (minuteInput) minuteInput.value = '';
            _dgamDeleteChuanProofImg();
        }
    }
}

async function _dgamShowAdd(editingOrder) {
    try {
        const [draftsRes, catsRes, carriersRes, holidaysRes] = await Promise.all([
            apiCall('/api/don-gui-ao-mau/drafts'),
            apiCall('/api/dht/categories'),
            apiCall('/api/dht/carriers'),
            apiCall('/api/penalty/holidays').catch(() => ({ holidays: [] }))
        ]);
        _dgamDraftsList = draftsRes.drafts || [];
        if (editingOrder && !_dgamDraftsList.some(d => d.id == editingOrder.id)) {
            _dgamDraftsList.push(editingOrder);
        }
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
    _dgam.chuanProofImgBase64 = null;

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
        <button class="btn btn-primary" onclick="_dgamSubmitAdd()" style="width:auto;background:linear-gradient(135deg,#0369a1,#0ea5e9);border:none;color:#fff !important;">💾 Tạo Đơn</button>
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
            <div style="margin-bottom: 12px;">
                <label style="display:block; margin-bottom:6px; font-weight:700; color:#475569; font-size:12.5px;">⏰ Yêu Cầu Chuẩn Giờ Hàng Ra (24h) <span style="color:var(--danger)">*</span></label>
                <div style="display:flex; align-items:center; gap:8px;">
                    <select id="dgamAddShipHour" class="form-control" style="width:110px; text-align:center;">
                        <option value="">Giờ</option>
                        ${Array.from({length: 24}, (_, i) => String(i).padStart(2, '0')).map(h => `<option value="${h}">${h}</option>`).join('')}
                    </select>
                    <span style="font-size:18px; font-weight:bold; color:#64748b;">:</span>
                    <select id="dgamAddShipMinute" class="form-control" style="width:110px; text-align:center;">
                        <option value="">Phút</option>
                        ${Array.from({length: 12}, (_, i) => String(i * 5).padStart(2, '0')).map(m => `<option value="${m}">${m}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="form-group" style="margin-top: 16px;">
                <label style="font-weight:700; color:#475569; font-size:12.5px; display:block; margin-bottom:6px;">📸 Ảnh chứng minh Tiêu Chuẩn CHUẨN <span style="color:var(--danger)">*</span> (bắt buộc)</label>
                <div id="dgamChuanProofImgZone" tabindex="0" style="border:2px dashed #cbd5e1;border-radius:12px;padding:24px;text-align:center;cursor:pointer;background:#f8fafc;transition:all .2s;min-height:110px;display:flex;align-items:center;justify-content:center;flex-direction:column;position:relative;" onpaste="_dgamPasteChuanProofImg(event)" onclick="this.focus()" onfocus="this.style.borderColor='#0ea5e9';this.style.background='#f0f9ff'" onblur="this.style.borderColor='#cbd5e1';this.style.background='#f8fafc'">
                    <div id="dgamChuanProofImgPlaceholder" style="color:#64748b;font-size:13px;"><span style="font-size:24px">📋</span><br>Click vào đây rồi <b>Ctrl+V</b> dán hình ảnh</div>
                    <img id="dgamChuanProofImg" style="display:none;max-width:100%;max-height:180px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.08)">
                    <button id="dgamChuanProofImgDeleteBtn" type="button" style="display:none;position:absolute;top:8px;right:8px;background:#ef4444;color:#fff;border:none;border-radius:6px;padding:5px 12px;font-size:11px;font-weight:600;cursor:pointer;box-shadow:0 2px 6px rgba(239,68,68,0.25);z-index:10;transition:all 0.2s;" onclick="event.stopPropagation(); _dgamDeleteChuanProofImg();" onmouseover="this.style.background='#dc2626'" onmouseout="this.style.background='#ef4444'">✕ Xóa & dán lại</button>
                </div>
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
    _dgam.chuanProofImgBase64 = null;

    const shipDateEl = document.getElementById('dgamAddShipDate');
    if (shipDateEl) shipDateEl.value = '';

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
        _dgamUpdateCategoryDropdown();
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

        _dgamUpdateCategoryDropdown();

        const cat = document.getElementById('dgamAddCategory').value;
        if (['Gửi mẫu áo', 'Gửi mẫu quần', 'Gửi mẫu váy'].includes(cat)) {
            _dgamCalcRemaining();
        }
    }
}

function _dgamUpdateCategoryDropdown() {
    const depCodeInput = document.getElementById('dgamAddDepositCode');
    const catSelect = document.getElementById('dgamAddCategory');
    if (!depCodeInput || !catSelect) return;

    const depCode = depCodeInput.value.trim();
    // Có cọc nếu mã cọc khác rỗng và khác "Không có cọc"
    const hasDeposit = depCode !== '' && depCode !== 'Không có cọc';

    const selectedValue = catSelect.value;
    
    // Xóa sạch và xây dựng lại options
    catSelect.innerHTML = '<option value="">-- Chọn phân loại --</option>';

    const allOptions = [
        { value: 'Gửi mẫu áo', text: 'Gửi mẫu áo' },
        { value: 'Gửi mẫu vải', text: 'Gửi mẫu vải' },
        { value: 'Gửi Tem', text: 'Gửi Tem' },
        { value: 'Gửi Pet', text: 'Gửi Pet' },
        { value: 'Gửi Khác', text: 'Gửi Khác' },
        { value: 'Gửi mẫu quần', text: 'Gửi mẫu quần' },
        { value: 'Gửi mẫu váy', text: 'Gửi mẫu váy' }
    ];

    allOptions.forEach(opt => {
        if (hasDeposit) {
            // Có cọc: Chỉ cho phép 'Gửi mẫu áo', 'Gửi mẫu quần', 'Gửi mẫu váy'
            if (['Gửi mẫu áo', 'Gửi mẫu quần', 'Gửi mẫu váy'].includes(opt.value)) {
                catSelect.appendChild(new Option(opt.text, opt.value));
            }
        } else {
            // Không cọc: Hiển thị đầy đủ
            catSelect.appendChild(new Option(opt.text, opt.value));
        }
    });

    // Phục hồi lựa chọn trước đó nếu lựa chọn đó vẫn tồn tại trong danh sách mới
    let stillExists = false;
    for (let i = 0; i < catSelect.options.length; i++) {
        if (catSelect.options[i].value === selectedValue) {
            stillExists = true;
            break;
        }
    }

    if (stillExists) {
        catSelect.value = selectedValue;
    } else {
        catSelect.value = '';
        _dgamOnCategoryChange();
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

            if (!_dgam.chuanProofImgBase64) {
                showToast('Vui lòng dán Ảnh chứng minh Tiêu Chuẩn CHUẨN!', 'error');
                return;
            }
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
            order_status: 'cho_duyet',
            chuan_proof_image: (shippingPriority === 'CHUẨN') ? _dgam.chuanProofImgBase64 : null
        };
    } else {
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

            if (!_dgam.chuanProofImgBase64) {
                showToast('Vui lòng dán Ảnh chứng minh Tiêu Chuẩn CHUẨN!', 'error');
                return;
            }
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
            order_status: 'cho_duyet',
            chuan_proof_image: (shippingPriority === 'CHUẨN') ? _dgam.chuanProofImgBase64 : null
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
        const logs = data.logs || [];
        const closedOrders = data.closedOrders || [];
        const fmt = n => Number(n || 0).toLocaleString('vi-VN');

        const titleText = `${o.sample_order_code} — ${fmt(o.remaining_amount)}đ`;

        // 1. Thao tác nhanh
        let editBtnHTML = '';
        if (o.order_status === 'khong_duyet' || o.order_status === 'cho_duyet') {
            editBtnHTML = `<button class="btn btn-primary" onclick="_dgamEditOrder(${o.id})" style="padding:6px 16px;font-size:12px;font-weight:700;color:#fff !important;background:linear-gradient(135deg,#0284c7,#3b82f6);border:none;margin:0;">✏️ Sửa Đơn</button>`;
        }

        let actionsHTML = `<div style="display:flex;justify-content:space-between;align-items:center;background:#fff;border-radius:12px;border:1px solid #e2e8f0;padding:12px 16px;margin-bottom:16px;box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
                <span style="font-weight:800;font-size:14px;color:var(--navy)">Trạng thái gửi Zalo:</span>
                <span style="background:#e0f2fe;color:#0369a1;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700;">📨 Luôn tự động gửi Zalo OA</span>
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
                ${editBtnHTML}
                <button class="btn btn-secondary" onclick="window.print()" style="padding:6px 16px;font-size:12px;font-weight:700;color:#fff !important;margin:0;">🖨️ In Phiếu</button>
            </div>
        </div>`;

        // 2. Chi tiết cọc / thanh toán
        var displayPayments = payments.slice();
        if (displayPayments.length === 0 && Number(o.deposit_amount) > 0) {
            displayPayments.push({
                payment_code: o.deposit_code || '—',
                amount: o.deposit_amount,
                payment_date: o.order_date || o.created_at,
                payment_type: 'dat_coc',
                payment_method: null,
                transfer_note: 'Đặt cọc khi tạo đơn',
                _synthetic: true
            });
        }

        const fmtDt = d => { if (!d) return '—'; const dt = new Date(d); return `${dt.getDate()}/${dt.getMonth()+1}/${dt.getFullYear()}`; };

        var payHTML = `<div style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;padding:12px;margin-bottom:16px;box-shadow: 0 1px 3px rgba(0,0,0,0.02);">`;
        payHTML += `<div style="font-weight:800;font-size:14px;color:#1e3a8a;margin-bottom:12px">💳 Chi tiết cọc / thanh toán <span style="background:#10b981;color:#fff;padding:2px 8px;border-radius:10px;font-size:11px;margin-left:6px">${displayPayments.length}</span></div>`;
        if (displayPayments.length > 0) {
            payHTML += `<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px">`;
            payHTML += `<thead><tr style="background:#1e3a8a;color:#fff"><th style="padding:8px 10px;text-align:left;font-size:10px;font-weight:700">MÃ THANH TOÁN</th><th style="padding:8px 10px;text-align:right;font-size:10px;font-weight:700">SỐ TIỀN</th><th style="padding:8px 10px;text-align:center;font-size:10px;font-weight:700">NGÀY TT</th><th style="padding:8px 10px;text-align:center;font-size:10px;font-weight:700">LOẠI</th><th style="padding:8px 10px;text-align:left;font-size:10px;font-weight:700">NỘI DUNG</th></tr></thead><tbody>`;
            const typeLabels = { thanh_toan: 'Thanh Toán', dat_coc: 'Cọc', tt_sll: 'TT SLL', pending: '⏳ Chờ', tra_lai_coc: 'Trả Lại Cọc' };
            for (const p of displayPayments) {
                payHTML += `<tr style="border-bottom:1px solid #f1f5f9${p._synthetic ? ';background:#fffbeb' : ''}">`;
                payHTML += `<td style="padding:8px 10px;font-weight:700;color:#1e40af">${p.payment_code || '—'}</td>`;
                payHTML += `<td style="padding:8px 10px;text-align:right;font-weight:800;color:#dc2626">${fmt(p.amount)}đ</td>`;
                payHTML += `<td style="padding:8px 10px;text-align:center">${fmtDt(p.payment_date)}</td>`;
                
                let badgeStyle = 'background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:6px;font-size:10px;font-weight:700;display:inline-block;';
                let typeText = typeLabels[p.payment_type] || p.payment_type || '—';
                
                if (p.money_source === 'nha_van_chuyen') {
                    badgeStyle = 'background:#fee2e2;color:#b91c1c;border:1px solid #fca5a5;padding:2px 8px;border-radius:6px;font-size:10px;font-weight:700;display:inline-block;';
                    typeText = 'NVC';
                } else if (p.money_source === 'khach_hang_sll' || p.payment_type === 'tt_sll' || p.payment_type === 'child_sll') {
                    badgeStyle = 'background:#fef3c7;color:#b45309;border:1px solid #fde68a;padding:2px 8px;border-radius:6px;font-size:10px;font-weight:700;display:inline-block;';
                    typeText = 'KH SLL';
                } else if (p.payment_type === 'dat_coc') {
                    badgeStyle = 'background:linear-gradient(135deg,#f97316,#ea580c);color:#fff;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;display:inline-block;text-shadow:0 1px 2px rgba(0,0,0,.15);';
                    typeText = 'Đặt Cọc';
                } else if (p.payment_type === 'thanh_toan') {
                    badgeStyle = 'background:#dcfce7;color:#15803d;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;display:inline-block;';
                    typeText = 'Thanh Toán';
                }
                payHTML += `<td style="padding:8px 10px;text-align:center"><span style="${badgeStyle}">${typeText}</span></td>`;
                payHTML += `<td style="padding:8px 10px;color:#64748b;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${(p.transfer_note||'').replace(/"/g,'&quot;')}">${p.transfer_note || '—'}</td>`;
                payHTML += `</tr>`;
            }
            payHTML += `</tbody></table></div>`;
        } else {
            payHTML += `<div style="text-align:center;padding:16px;color:#94a3b8;font-size:13px">Chưa có thanh toán / cọc nào được ghi nhận</div>`;
        }
        payHTML += `</div>`;

        // 2B. Tổng kết tài chính
        const remColor = o.remaining_amount > 0 ? '#dc2626' : '#059669';
        var finHTML = `<div style="background:linear-gradient(135deg,#fefce8,#fef9c3);border-radius:12px;border:1px solid #fde68a;padding:12px;margin-bottom:16px;box-shadow: 0 1px 3px rgba(0,0,0,0.02);">`;
        finHTML += `<div style="font-weight:800;font-size:14px;color:#92400e;margin-bottom:12px">💰 Tổng kết tài chính</div>`;
        
        const hasCarrierPayment = payments.some(p => p.money_source === 'nha_van_chuyen');
        const shipDeduct = o.ship_ck_deduct !== undefined ? (Number(o.ship_ck_deduct) || 0) : ((!hasCarrierPayment && o.shipping_fee_payer === 'hv' && o.shipping_fee_method === 'ck') ? (Number(o.shipping_fee) || 0) : 0);
        const otherPaid = Math.max(0, (Number(o.total_amount) || 0) - (Number(o.remaining_amount) || 0) - (Number(o.deposit_amount) || 0) - shipDeduct);
        const totalPaid = (Number(o.deposit_amount) || 0) + otherPaid;

        let finRows = [
            ['Tổng Tiền Hàng Thực Tế', fmt(o.total_amount) + 'đ', '#1e293b', true],
            ['Đã thanh toán (cọc)', fmt(totalPaid) + 'đ', '#10b981', true]
        ];
        if (shipDeduct > 0) {
            finRows.push(['🚚 Cước Vận Chuyển (HV Trả CK)', fmt(shipDeduct) + 'đ', '#f97316', true]);
        }
        finRows.push(['Còn lại', fmt(o.remaining_amount) + 'đ', remColor, true]);
        
        for (const [label, val, color, bold] of finRows) {
            const fontWt = bold ? '800' : '600';
            const fSize = bold ? '13px' : '12px';
            finHTML += `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(0,0,0,0.05);font-size:${fSize};font-weight:${fontWt};color:${color}">`;
            finHTML += `<span>${label}</span>`;
            finHTML += `<span>${val}</span>`;
            finHTML += `</div>`;
        }
        finHTML += `</div>`;

        // 3. Chi tiết sản phẩm gửi
        const typeLabels = {
            'gui_mau_ao': 'Gửi mẫu áo',
            'gui_mau_vai': 'Gửi mẫu vải',
            'gui_tem': 'Gửi Tem',
            'gui_pet': 'Gửi Pet',
            'gui_khac': 'Gửi Khác'
        };
        const categoryLabel = typeLabels[o.category] || o.category || '—';
        const linhVucBadge = o.linh_vuc ? `<span style="background:#fef3c7;color:#d97706;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;margin-right:6px;white-space:nowrap">${o.linh_vuc}</span>` : '';

        let prodHTML = `<div style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;padding:16px;margin-bottom:16px;box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
            <div style="font-weight:800;font-size:14px;color:var(--navy);margin-bottom:12px">👕 Chi Tiết Sản Phẩm Gửi</div>
            <table class="table" style="width:100%;border-collapse:collapse;margin-bottom:12px;">
                <thead>
                    <tr style="background:#f8fafc;border-bottom:1.5px solid #e2e8f0">
                        <th style="padding:10px;text-align:left;font-size:11px;font-weight:700;color:#fff !important">PHÂN LOẠI</th>
                        <th style="padding:10px;text-align:left;font-size:11px;font-weight:700;color:#fff !important">LĨNH VỰC</th>
                        <th style="padding:10px;text-align:left;font-size:11px;font-weight:700;color:#fff !important">SẢN PHẨM / NỘI DUNG</th>
                        <th style="padding:10px;text-align:center;font-size:11px;font-weight:700;color:#fff !important;width:80px">SL</th>
                        <th style="padding:10px;text-align:right;font-size:11px;font-weight:700;color:#fff !important;width:120px">ĐƠN GIÁ</th>
                        <th style="padding:10px;text-align:right;font-size:11px;font-weight:700;color:#fff !important;width:120px">TỔNG TIỀN</th>
                    </tr>
                </thead>
                <tbody>
                    <tr style="border-bottom:1px solid #f1f5f9">
                        <td style="padding:10px;font-size:13px;font-weight:700;color:#1e293b">${categoryLabel}</td>
                        <td style="padding:10px;font-size:13px;font-weight:700;color:#1e293b;white-space:nowrap">${linhVucBadge || '—'}</td>
                        <td style="padding:10px;font-size:13px;font-weight:700;color:#1e293b">${o.product_name || '—'}</td>
                        <td style="padding:10px;text-align:center;font-size:13px;font-weight:700;color:#1e293b">${o.quantity || 0}</td>
                        <td style="padding:10px;text-align:right;font-size:13px;font-weight:700;color:#1e293b">${fmt(o.price)}đ</td>
                        <td style="padding:10px;text-align:right;font-size:13px;font-weight:700;color:var(--success)">${fmt(o.total_amount)}đ</td>
                    </tr>
                </tbody>
            </table>`;

        if (o.sample_image) {
            prodHTML += `<div style="text-align:center;margin-top:16px;background:#f8fafc;padding:16px;border-radius:8px;border:1px dashed #cbd5e1">
                <div style="font-size:11px;font-weight:700;color:#64748b;margin-bottom:8px">🖼️ HÌNH ẢNH MẪU CHỤP</div>
                <img src="${o.sample_image}" style="max-width:240px;max-height:220px;border-radius:8px;border:1px solid #e2e8f0;cursor:pointer;object-fit:contain;box-shadow:0 4px 12px rgba(0,0,0,0.1)" onclick="_dgamShowImagePreview('${o.sample_image}')" title="Click để xem ảnh gốc">
            </div>`;
        }
        prodHTML += `</div>`;

        // 4. Chỉ thị gửi hàng & Vận chuyển (Sale Dặn Kế Toán Trước Gửi Hàng)
        const row = (label, val) => `<tr><td style="padding:8px 12px;font-size:12px;color:#64748b;font-weight:600;white-space:nowrap;vertical-align:top;width:180px">${label}</td><td style="padding:8px 12px;font-size:13px;font-weight:700;color:#1e293b;word-break:break-word">${val}</td></tr>`;

        let progressSaleHTML = '<span style="color:#94a3b8;font-style:italic">Chưa có ngày gửi dự kiến</span>';
        if (o.ship_date) {
            const shipVN = new Date(o.ship_date);
            shipVN.setHours(0,0,0,0);
            const todayVN = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
            todayVN.setHours(0,0,0,0);
            const remainDays = Math.round((shipVN - todayVN) / 86400000);
            if (remainDays > 0) {
                progressSaleHTML = `<span style="color:#0369a1;font-weight:900;font-size:14px">⏳ Còn ${remainDays} ngày</span>`;
            } else if (remainDays < 0) {
                progressSaleHTML = `<span style="color:#dc2626;font-weight:900;font-size:14px">⚠️ Quá hạn ${Math.abs(remainDays)} ngày</span>`;
            } else {
                progressSaleHTML = `<span style="color:#059669;font-weight:900;font-size:14px">✅ Hôm nay</span>`;
            }
        }

        const formatExpectedShipDateWithDay = (dateStr) => {
            if (!dateStr) return '<span style="color:#94a3b8;font-style:italic">Chưa có</span>';
            const d = new Date(dateStr);
            const days = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
            const dayName = days[d.getDay()];
            return `<strong>${dayName} - Ngày ${d.toLocaleDateString('vi-VN')}</strong>`;
        };

        const tcColor2 = (o.shipping_priority === 'GẤP') ? '#dc2626' : (o.shipping_priority === 'CHUẨN') ? '#7c3aed' : '#f59e0b';
        const tcValue = `<span style="color:${tcColor2};font-weight:900;font-size:14px">${o.shipping_priority || 'CHUẨN'}</span>`;
        const timeValue = o.ship_time ? `<span style="font-weight:800;color:#0369a1">${o.ship_time}</span>` : '<span style="color:#94a3b8;font-style:italic">—</span>';

        let saleKtHTML = `<div style="background:linear-gradient(135deg,#fff7ed,#ffedd5);border-radius:12px;border:2px solid #fb923c;padding:16px;margin-bottom:16px">
            <div style="font-weight:900;font-size:15px;color:#9a3412;margin-bottom:12px">${o.status_hoan_hang ? '📋 Sale Dặn Kế Toán Trước Gửi Hàng lần 1' : '📋 Sale Dặn Kế Toán Trước Gửi Hàng'}</div>
            <table style="width:100%;border-collapse:collapse">
                ${row('🚚 Vận Chuyển YC Của Sale', o.shipping_method || '—')}
                ${row('📝 Nội Dung Dặn KT', o.sale_note_for_accountant ? `<span style="white-space: pre-wrap;">${o.sale_note_for_accountant}</span>` : '<span style="color:#94a3b8;font-style:italic">—</span>')}
                ${row('🏷️ TC Gửi', tcValue)}
                ${row('📊 Tiến Độ Ra Hàng', progressSaleHTML)}
                ${row('📅 Ngày gửi dự kiến', formatExpectedShipDateWithDay(o.ship_date))}
                ${row('⏰ Yêu Cầu Chuẩn Giờ Hàng Ra', timeValue)}
            </table>`;

        if (o.shipping_priority === 'CHUẨN' && o.chuan_proof_image) {
            saleKtHTML += `<div style="text-align:center;margin-top:16px;background:#f8fafc;padding:16px;border-radius:8px;border:1px dashed #cbd5e1">
                <div style="font-size:11px;font-weight:700;color:#64748b;margin-bottom:8px">📸 ẢNH CHỨNG MINH TIÊU CHUẨN CHUẨN</div>
                <img src="${o.chuan_proof_image}" style="max-width:240px;max-height:220px;border-radius:8px;border:1px solid #e2e8f0;cursor:pointer;object-fit:contain;box-shadow:0 4px 12px rgba(0,0,0,0.1)" onclick="_dgamShowImagePreview('${o.chuan_proof_image}')" title="Click để xem ảnh gốc">
            </div>`;
        }
        saleKtHTML += `</div>`;

        if (o.status_hoan_hang) {
            let progressHoanSaleHTML = '<span style="color:#94a3b8;font-style:italic">Chưa có ngày gửi dự kiến</span>';
            if (o.hoan_hang_ship_date) {
                const shipVN = new Date(o.hoan_hang_ship_date);
                shipVN.setHours(0,0,0,0);
                const todayVN = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
                todayVN.setHours(0,0,0,0);
                const remainDays = Math.round((shipVN - todayVN) / 86400000);
                if (remainDays > 0) {
                    progressHoanSaleHTML = `<span style="color:#0369a1;font-weight:900;font-size:14px">⏳ Còn ${remainDays} ngày</span>`;
                } else if (remainDays < 0) {
                    progressHoanSaleHTML = `<span style="color:#dc2626;font-weight:900;font-size:14px">⚠️ Quá hạn ${Math.abs(remainDays)} ngày</span>`;
                } else {
                    progressHoanSaleHTML = `<span style="color:#059669;font-weight:900;font-size:14px">✅ Hôm nay</span>`;
                }
            }

            const tcColorHoan = (o.hoan_hang_shipping_priority === 'GẤP') ? '#dc2626' : (o.hoan_hang_shipping_priority === 'CHUẨN') ? '#7c3aed' : '#f59e0b';
            const tcValueHoan = `<span style="color:${tcColorHoan};font-weight:900;font-size:14px">${o.hoan_hang_shipping_priority || 'CHUẨN'}</span>`;
            const timeValueHoan = o.hoan_hang_ship_time ? `<span style="font-weight:800;color:#0369a1">${o.hoan_hang_ship_time}</span>` : '<span style="color:#94a3b8;font-style:italic">—</span>';

            saleKtHTML += `<div style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);border-radius:12px;border:2px solid #22c55e;padding:16px;margin-bottom:16px">
                <div style="font-weight:900;font-size:15px;color:#15803d;margin-bottom:12px">📋 Sale Dặn Kế Toán Trước Gửi Hàng lần 2</div>
                <table style="width:100%;border-collapse:collapse">
                    ${row('🚚 Vận Chuyển YC Của Sale', o.hoan_hang_shipping_method || '—')}
                    ${row('📝 Nội Dung Dặn KT', o.hoan_hang_sale_note ? `<span style="white-space: pre-wrap;">${o.hoan_hang_sale_note}</span>` : '<span style="color:#94a3b8;font-style:italic">—</span>')}
                    ${row('🏷️ TC Gửi', tcValueHoan)}
                    ${row('📊 Tiến Độ Ra Hàng', progressHoanSaleHTML)}
                    ${row('📅 Ngày gửi dự kiến', formatExpectedShipDateWithDay(o.hoan_hang_ship_date))}
                    ${row('⏰ Yêu Cầu Chuẩn Giờ Hàng Ra', timeValueHoan)}
                </table>`;

            if (o.hoan_hang_shipping_priority === 'CHUẨN' && o.hoan_hang_chuan_proof_image) {
                saleKtHTML += `<div style="text-align:center;margin-top:16px;background:#f8fafc;padding:16px;border-radius:8px;border:1px dashed #cbd5e1">
                    <div style="font-size:11px;font-weight:700;color:#64748b;margin-bottom:8px">📸 ẢNH CHỨNG MINH TIÊU CHUẨN CHUẨN (Lần 2)</div>
                    <img src="${o.hoan_hang_chuan_proof_image}" style="max-width:240px;max-height:220px;border-radius:8px;border:1px solid #e2e8f0;cursor:pointer;object-fit:contain;box-shadow:0 4px 12px rgba(0,0,0,0.1)" onclick="_dgamShowImagePreview('${o.hoan_hang_chuan_proof_image}')" title="Click để xem ảnh gốc">
                </div>`;
            }
            saleKtHTML += `</div>`;
        }

        // 5. Thông tin khách hàng & Người lên đơn
        let closedOrdersHTML = '';
        if (closedOrders.length > 0) {
            closedOrdersHTML = `
                <div style="margin-top:16px;border-top:1px solid #e2e8f0;padding-top:16px">
                    <div style="font-weight:800;font-size:13px;color:#0ea5e9;margin-bottom:8px;display:flex;align-items:center;gap:6px">
                        📋 Mã Đơn Khách Hàng Đã Chốt <span style="background:#e0f2fe;color:#0369a1;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700">${closedOrders.length}</span>
                    </div>
                    <div style="overflow-x:auto;border:1px solid #e2e8f0;border-radius:8px">
                        <table style="width:100%;border-collapse:collapse;font-size:12px;text-align:left">
                            <thead>
                                <tr style="background:#1e293b;border-bottom:1px solid #e2e8f0">
                                    <th style="padding:8px 12px;font-weight:700;color:#ffffff !important">Mã Đơn</th>
                                    <th style="padding:8px 12px;font-weight:700;color:#ffffff !important;text-align:center">Số Lượng</th>
                                    <th style="padding:8px 12px;font-weight:700;color:#ffffff !important;text-align:right">Tổng Doanh Số</th>
                                    <th style="padding:8px 12px;font-weight:700;color:#ffffff !important;text-align:center">Ngày Lên Đơn</th>
                                </tr>
                            </thead>
                            <tbody>
            `;
            closedOrders.forEach(co => {
                const formattedAmt = fmt(co.total_amount);
                const formattedDate = co.order_date ? new Date(co.order_date).toLocaleDateString('vi-VN') : '—';
                closedOrdersHTML += `
                                <tr style="border-bottom:1px solid #f1f5f9" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='none'">
                                    <td style="padding:8px 12px;font-weight:700;color:#0369a1">${co.order_code}</td>
                                    <td style="padding:8px 12px;text-align:center;font-weight:700;color:#334155">${co.total_quantity || 0}</td>
                                    <td style="padding:8px 12px;text-align:right;font-weight:700;color:#059669">${formattedAmt}đ</td>
                                    <td style="padding:8px 12px;text-align:center;color:#64748b">${formattedDate}</td>
                                </tr>
                `;
            });
            closedOrdersHTML += `
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        } else {
            closedOrdersHTML = `
                <div style="margin-top:16px;border-top:1px solid #e2e8f0;padding-top:16px">
                    <div style="font-weight:800;font-size:13px;color:#64748b;margin-bottom:4px">📋 Mã Đơn Khách Hàng Đã Chốt</div>
                    <div style="font-size:12px;color:#94a3b8;font-style:italic">Khách hàng chưa có đơn hàng chốt nào</div>
                </div>
            `;
        }

        let infoHTML = `<div style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;padding:16px;margin-bottom:16px;box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
            <div style="font-weight:800;font-size:14px;color:var(--navy);margin-bottom:12px">👤 Thông Tin Đơn Hàng & Khách Hàng</div>
            <table style="width:100%;border-collapse:collapse">
                ${row('Tên Khách Hàng', `<strong>${o.customer_name || '—'}</strong>`)}
                <tr><td style="padding:8px 12px;font-size:12px;color:#9a3412;font-weight:800;white-space:nowrap;vertical-align:top;width:180px">📞 Số Điện Thoại</td><td style="padding:8px 12px;font-size:13px;font-weight:900;color:#9a3412;background:#fff7ed;border-radius:6px">${o.customer_phone ? '<a href="tel:'+o.customer_phone+'" style="color:#9a3412;text-decoration:underline" onclick="event.stopPropagation()">'+o.customer_phone+'</a>' : '—'}</td></tr>
                <tr><td style="padding:8px 12px;font-size:12px;color:#9a3412;font-weight:800;white-space:nowrap;vertical-align:top;width:180px">📍 Địa chỉ nhận mẫu</td><td style="padding:8px 12px;font-size:13px;font-weight:900;color:#9a3412;background:#fff7ed;border-radius:6px;word-break:word-break">${o.address || '—'}</td></tr>
                <tr><td style="padding:8px 12px;font-size:12px;color:#9a3412;font-weight:800;white-space:nowrap;vertical-align:top;width:180px">🏙️ Tỉnh / Thành Phố</td><td style="padding:8px 12px;font-size:13px;font-weight:900;color:#9a3412;background:#fff7ed;border-radius:6px">${o.province || '—'}</td></tr>
                ${row('Người lên đơn', o.created_by_name || '—')}
                ${row('Ngày lên đơn', o.order_date ? new Date(o.order_date).toLocaleDateString('vi-VN') : '—')}
            </table>
            ${closedOrdersHTML}
        </div>`;

        // 5B. Thông tin vận chuyển
        let shipInfoHTML = `<div style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;padding:16px;margin-bottom:16px;box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
            <div style="font-weight:800;font-size:14px;color:var(--navy);margin-bottom:12px">🚚 Thông tin vận chuyển</div>`;

        let hasShipment1 = o.status_gui_don || o.order_status === 'da_gui' || o.order_status === 'hoan_thanh';
        let hasShipment2 = o.status_gui_don_hoan === true;

        if (hasShipment1) {
            const timeValue = o.shipped_at ? new Date(o.shipped_at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }).replace(',', '') : '—';
            const carrierName = o.actual_carrier_name || '—';
            let trackingDisplay = o.tracking_code || '—';
            if (o.tracking_code && o.actual_carrier_tracking_url) {
                const trackingUrl = o.actual_carrier_tracking_url.replace('{code}', encodeURIComponent(o.tracking_code));
                trackingDisplay = `<a href="${trackingUrl}" target="_blank" rel="noopener" style="font-weight:700;color:#1e40af;text-decoration:underline;cursor:pointer" title="Tra cứu vận đơn">${o.tracking_code} 🔗</a>`;
            }

            const payerLabel = o.shipping_fee_payer === 'hv' ? ((o.tracking_code && o.tracking_code.trim()) ? 'HV trả cước vận chuyển' : (o.shipping_fee_method === 'ck' ? 'HV trả CK' : (o.shipping_fee_method === 'tm' ? 'HV trả TM' : 'HV trả cước vận chuyển'))) : o.shipping_fee_payer === 'khach' ? 'Khách trả' : '—';
            const payerColor = o.shipping_fee_payer === 'hv' ? '#7c3aed' : '#059669';
            const feeAmt = Number(o.shipping_fee || 0);

            let billHtml = '—';
            if (o.shipping_bill_link) {
                const billCid = `_dgamBillImgModal_${o.id}`;
                billHtml = `<span id="${billCid}" style="color:#64748b;font-size:11px">⏳ Đang tải bill...</span>`;
                
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
                        
                        if (imgSrc && imgSrc.includes('/uploads/')) {
                            imgSrc = imgSrc.substring(imgSrc.indexOf('/uploads/'));
                        }
                        let linkHref = _origUrl;
                        if (linkHref && linkHref.includes('/uploads/')) {
                            linkHref = linkHref.substring(linkHref.indexOf('/uploads/'));
                        }
                        
                        const img = document.createElement('img');
                        img.src = imgSrc;
                        img.style.cssText = 'max-width:180px;max-height:140px;border-radius:6px;border:1px solid #e2e8f0;cursor:pointer;object-fit:contain;box-shadow:0 2px 6px rgba(0,0,0,.08);margin-top:4px;';
                        img.onerror = function() {
                            el.innerHTML = '<a href="' + linkHref + '" target="_blank" style="color:#3b82f6;font-weight:700">📷 Xem bill (link)</a>';
                        };
                        img.onclick = function() {
                            _dgamShowImagePreview(imgSrc);
                        };
                        el.innerHTML = '';
                        el.appendChild(img);
                    }, 100);
                })(billCid, o.shipping_bill_link);
            }

            shipInfoHTML += `
                <div style="background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:12px;padding:14px;box-shadow:0 2px 4px rgba(22,163,74,0.03);margin-bottom:14px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;border-bottom:1.5px solid #dcfce7;padding-bottom:8px;flex-wrap:wrap;gap:6px;">
                        <span style="font-weight:800;color:#166534;font-size:13px;">📦 LẦN 1 GỬI — ${(o.product_name || 'MẪU ÁO').toUpperCase()} <span style="background:#dcfce7;color:#166534;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700;">SL: ${o.quantity || 1}</span></span>
                        <span style="background:#16a34a;color:white;padding:3px 10px;border-radius:20px;font-weight:800;font-size:10px;letter-spacing:0.5px;">🟢 ĐÃ GỬI</span>
                    </div>
                    <div style="font-size:12px;color:#1e293b;display:grid;grid-template-columns:140px 1fr;gap:6px 12px;align-items:start;">
                        <span style="color:#64748b;font-weight:600;">👤 Người gửi:</span> <span style="font-weight:700;color:#1e293b">${o.shipped_by_name || '—'}</span>
                        <span style="color:#64748b;font-weight:600;">📅 Thời gian gửi:</span> <span style="font-weight:700;color:#1e293b">${timeValue}</span>
                        <span style="color:#64748b;font-weight:600;">🚛 Đơn vị vận chuyển:</span> <span style="font-weight:700;color:#1e293b">${carrierName}</span>
                        ${o.tracking_code ? `<span style="color:#64748b;font-weight:600;">📦 Mã vận đơn:</span> <span>${trackingDisplay}</span>` : ''}
                        <span style="color:#64748b;font-weight:600;">🤝 Người nhận:</span> <span style="font-weight:700;color:#1e293b">${o.customer_name || '—'}</span>
                        <span style="color:#64748b;font-weight:600;">💳 Người trả ship:</span> <span><span style="font-weight:800;color:${payerColor}">${payerLabel}</span></span>
                        ${(o.shipping_fee_payer === 'hv' && o.shipping_fee_method === 'tm') ? `
                            <span style="color:#64748b;font-weight:600;">💵 Mã Tiền Chi TM:</span> 
                            <span style="font-weight:700;color:#d97706">${o.shipping_cashflow_code || '—'}</span>
                        ` : ''}
                        <span style="color:#64748b;font-weight:600;">💰 Cước Vận Chuyển:</span> <span style="font-weight:800;color:#dc2626">${fmt(feeAmt)}đ</span>
                        ${o.shipping_bill_link ? `<span style="color:#64748b;font-weight:600;vertical-align:top;padding-top:4px;">🔗 Bill gửi hàng:</span> <div>${billHtml}</div>` : ''}
                    </div>
                </div>`;
        }

        if (hasShipment2) {
            const timeValueHoan = o.hoan_hang_shipped_at ? new Date(o.hoan_hang_shipped_at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }).replace(',', '') : '—';
            const carrierNameHoan = o.hoan_actual_carrier_name || '—';
            let trackingDisplayHoan = o.hoan_hang_tracking_code || '—';
            if (o.hoan_hang_tracking_code && o.actual_carrier_tracking_url) {
                const trackingUrlHoan = o.actual_carrier_tracking_url.replace('{code}', encodeURIComponent(o.hoan_hang_tracking_code));
                trackingDisplayHoan = `<a href="${trackingUrlHoan}" target="_blank" rel="noopener" style="font-weight:700;color:#1e40af;text-decoration:underline;cursor:pointer" title="Tra cứu vận đơn">${o.hoan_hang_tracking_code} 🔗</a>`;
            }

            const payerLabelHoan = o.return_payer === 'hv' ? ((o.hoan_hang_tracking_code && o.hoan_hang_tracking_code.trim()) ? 'HV trả cước vận chuyển' : (o.return_payment_method === 'ck' ? 'HV trả CK' : (o.return_payment_method === 'tm' ? 'HV trả TM' : 'HV trả cước vận chuyển'))) : o.return_payer === 'khach' ? 'Khách trả' : '—';
            const payerColorHoan = o.return_payer === 'hv' ? '#7c3aed' : '#059669';
            const feeAmtHoan = Number(o.return_shipping_fee || 0);

            let billHtmlHoan = '—';
            if (o.hoan_hang_shipping_bill_link) {
                const billCidHoan = `_dgamBillImgModalHoan_${o.id}`;
                billHtmlHoan = `<span id="${billCidHoan}" style="color:#64748b;font-size:11px">⏳ Đang tải bill...</span>`;
                
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
                        
                        if (imgSrc && imgSrc.includes('/uploads/')) {
                            imgSrc = imgSrc.substring(imgSrc.indexOf('/uploads/'));
                        }
                        let linkHref = _origUrl;
                        if (linkHref && linkHref.includes('/uploads/')) {
                            linkHref = linkHref.substring(linkHref.indexOf('/uploads/'));
                        }
                        
                        const img = document.createElement('img');
                        img.src = imgSrc;
                        img.style.cssText = 'max-width:180px;max-height:140px;border-radius:6px;border:1px solid #e2e8f0;cursor:pointer;object-fit:contain;box-shadow:0 2px 6px rgba(0,0,0,.08);margin-top:4px;';
                        img.onerror = function() {
                            el.innerHTML = '<a href="' + linkHref + '" target="_blank" style="color:#3b82f6;font-weight:700">📷 Xem bill (link)</a>';
                        };
                        img.onclick = function() {
                            _dgamShowImagePreview(imgSrc);
                        };
                        el.innerHTML = '';
                        el.appendChild(img);
                    }, 100);
                })(billCidHoan, o.hoan_hang_shipping_bill_link);
            }

            shipInfoHTML += `
                <div style="background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:12px;padding:14px;box-shadow:0 2px 4px rgba(22,163,74,0.03);">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;border-bottom:1.5px solid #dcfce7;padding-bottom:8px;flex-wrap:wrap;gap:6px;">
                        <span style="font-weight:800;color:#166534;font-size:13px;">📦 LẦN 2 GỬI — ${(o.product_name || 'MẪU ÁO').toUpperCase()} <span style="background:#dcfce7;color:#166534;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700;">SL: ${o.quantity || 1}</span></span>
                        <span style="background:#16a34a;color:white;padding:3px 10px;border-radius:20px;font-weight:800;font-size:10px;letter-spacing:0.5px;">🟢 ĐÃ GỬI (HOÀN)</span>
                    </div>
                    <div style="font-size:12px;color:#1e293b;display:grid;grid-template-columns:140px 1fr;gap:6px 12px;align-items:start;">
                        <span style="color:#64748b;font-weight:600;">👤 Người gửi:</span> <span style="font-weight:700;color:#1e293b">${o.hoan_shipped_by_name || '—'}</span>
                        <span style="color:#64748b;font-weight:600;">📅 Thời gian gửi:</span> <span style="font-weight:700;color:#1e293b">${timeValueHoan}</span>
                        <span style="color:#64748b;font-weight:600;">🚛 Đơn vị vận chuyển:</span> <span style="font-weight:700;color:#1e293b">${carrierNameHoan}</span>
                        ${o.hoan_hang_tracking_code ? `<span style="color:#64748b;font-weight:600;">📦 Mã vận đơn:</span> <span>${trackingDisplayHoan}</span>` : ''}
                        <span style="color:#64748b;font-weight:600;">🤝 Người nhận:</span> <span style="font-weight:700;color:#1e293b">${o.customer_name || '—'}</span>
                        <span style="color:#64748b;font-weight:600;">💳 Người trả ship:</span> <span><span style="font-weight:800;color:${payerColorHoan}">${payerLabelHoan}</span></span>
                        ${(o.return_payer === 'hv' && o.return_payment_method === 'tm') ? `
                            <span style="color:#64748b;font-weight:600;">💵 Mã Tiền Chi TM:</span> 
                            <span style="font-weight:700;color:#d97706">${o.hoan_shipping_cashflow_code || '—'}</span>
                        ` : ''}
                        <span style="color:#64748b;font-weight:600;">💰 Cước Vận Chuyển:</span> <span style="font-weight:800;color:#dc2626">${fmt(feeAmtHoan)}đ</span>
                        ${o.hoan_hang_shipping_bill_link ? `<span style="color:#64748b;font-weight:600;vertical-align:top;padding-top:4px;">🔗 Bill gửi hàng:</span> <div>${billHtmlHoan}</div>` : ''}
                    </div>
                </div>`;
        }

        if (!hasShipment1 && !hasShipment2) {
            shipInfoHTML += `
                <table style="width:100%;border-collapse:collapse">
                    ${row('Người trả ship', o.payer === 'hv' ? (o.payment_method === 'ck' ? 'HV trả CK' : (o.payment_method === 'tm' ? 'HV trả TM' : 'HV trả')) : o.payer === 'khach' ? 'Khách trả' : o.payer || '—')}
                    ${(o.payer === 'hv' && o.payment_method === 'tm') ? row('Mã Tiền Chi TM', o.shipping_cashflow_code || '—') : ''}
                    ${row('Tiền ship dự kiến', `${fmt(o.shipping_fee)}đ (${o.payment_method || '—'})`)}
                </table>`;
        }

        shipInfoHTML += `</div>`;

        // 6. Lịch sử cập nhật
        let historyLogs = [];
        for (const log of logs) {
            historyLogs.push({
                created_at: log.created_at,
                action: log.action || 'update',
                summary: log.summary || '',
                performer_name: log.performer_name || 'Hệ thống'
            });
        }
        for (const p of payments) {
            const typeLabels = { dat_coc: 'Đặt cọc', thanh_toan: 'Thanh toán' };
            const typeLabel = typeLabels[p.payment_type] || p.payment_type || 'Đặt cọc';
            historyLogs.push({
                created_at: p.payment_date || p.created_at,
                action: 'payment',
                summary: `Thực hiện ${typeLabel}: +${fmt(p.amount)}đ (${p.payment_method || '—'}) - Nội dung: ${p.transfer_note || '—'}`,
                performer_name: p.customer_name || 'Khách hàng'
            });
        }

        // Sort by date DESC
        historyLogs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        let paymentHTML = `<div style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;padding:16px;margin-bottom:16px;box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
            <div style="font-weight:800;font-size:14px;color:var(--navy);margin-bottom:12px">📝 Lịch sử cập nhật <span style="background:#64748b;color:#fff;padding:2px 8px;border-radius:10px;font-size:11px;margin-left:6px">${historyLogs.length}</span></div>`;

        if (historyLogs.length > 0) {
            const actionStyles = {
                create:  { color: '#059669', bg: '#f0fdf4', border: '#059669', icon: '🟢' },
                update:  { color: '#d97706', bg: '#fffbeb', border: '#f59e0b', icon: '🟡' },
                status:  { color: '#2563eb', bg: '#eff6ff', border: '#3b82f6', icon: '🔵' },
                payment: { color: '#059669', bg: '#f0fdf4', border: '#10b981', icon: '💰' }
            };

            for (const log of historyLogs) {
                const st = actionStyles[log.action] || actionStyles.update;
                const formattedTime = new Date(log.created_at).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

                paymentHTML += `<div style="padding:10px 12px;border-left:3px solid ${st.border};margin-bottom:8px;background:${st.bg};border-radius:0 8px 8px 0;text-align:left">
                    <div style="font-size:11px;color:#64748b">${st.icon} ${formattedTime}</div>
                    <div style="font-size:13px;font-weight:700;color:#1e293b;margin-top:2px">👤 <span style="color:var(--info)">${log.performer_name || '—'}</span> ${log.summary}</div>
                </div>`;
            }
        } else {
            paymentHTML += `<div style="text-align:center;padding:12px;color:#94a3b8;font-size:12px;font-style:italic">Chưa có lịch sử cập nhật nào cho đơn mẫu này</div>`;
        }
        paymentHTML += `</div>`;

        const bodyHTML = actionsHTML + prodHTML + payHTML + finHTML + saleKtHTML + infoHTML + shipInfoHTML + paymentHTML;
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

async function _dgamShowActionDetail(id, type) {
    try {
        const data = await apiCall(`/api/don-gui-ao-mau/${id}/detail`);
        if (!data || !data.order) {
            showToast('Không tìm thấy thông tin đơn mẫu', 'error');
            return;
        }
        const o = data.order;
        const logs = data.logs || [];
        
        let title = '';
        let body = '';
        
        if (type === 'duyet') {
            title = 'Thông Tin Duyệt Gửi';
            const log = logs.find(l => l.action === 'status' && l.summary && l.summary.includes('duyệt đơn') && l.summary.includes('Bật'));
            const performer = log ? log.performer_name : 'Quản lý xưởng';
            const timeStr = log ? new Date(log.created_at).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : (o.approved_at ? new Date(o.approved_at).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : '—');
            
            body = `
                <div style="text-align:center;padding:20px 10px;">
                    <div style="font-size:48px;margin-bottom:15px;">✅</div>
                    <h3 style="color:#0f172a;font-size:18px;font-weight:800;margin-bottom:8px;">Đơn hàng đã được duyệt gửi</h3>
                    <p style="color:#64748b;font-size:14px;margin-bottom:20px;">Thông tin chi tiết về việc duyệt đơn mẫu:</p>
                    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:15px;max-width:400px;margin:0 auto;text-align:left;">
                        <div style="margin-bottom:8px;font-size:13px;color:#334155;"><span style="font-weight:700;">Người duyệt:</span> <span style="color:#2563eb;font-weight:700;">${performer}</span></div>
                        <div style="font-size:13px;color:#334155;"><span style="font-weight:700;">Thời gian duyệt:</span> <span>${timeStr}</span></div>
                    </div>
                </div>
            `;
        } else if (type === 'kiem_tra') {
            title = 'Thông Tin Kiểm Tra';
            const fmt = n => Number(n || 0).toLocaleString('vi-VN');
            const log = logs.find(l => l.action === 'status' && l.summary && l.summary.includes('kiểm tra') && l.summary.includes('Bật'));
            const performer = log ? log.performer_name : 'Lê Việt Trinh';
            const inspector = o.inspect_by_name || performer;
            const timeInspectStr = o.kiem_tra_at 
                ? new Date(o.kiem_tra_at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }).replace(',', '') 
                : (log ? new Date(log.created_at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }).replace(',', '') : '—');
            const refundStr = o.hoan_tien_amount ? fmt(o.hoan_tien_amount) + 'đ' : '0đ';

            body = `
                <div style="padding: 10px 0;">
                    <div style="background:#f0fdf4; border:1.5px solid #22c55e; border-radius:16px; padding:20px 24px; text-align:left; box-shadow:0 4px 12px rgba(34,197,94,0.05);">
                        <div style="display:flex; align-items:center; gap:10px; font-size:15px; font-weight:700; color:#15803d; margin-bottom:8px;">
                            <span style="display:inline-flex; align-items:center; justify-content:center; width:22px; height:22px; background:#cbd5e1; border:1.5px solid #cbd5e1; border-radius:4px; color:#fff; font-size:13px; font-weight:900; flex-shrink:0;">✓</span>
                            <span>Đã xác nhận mẫu áo đã về công ty để hoàn tiền</span>
                        </div>
                        <div style="height:1px; background:#bbf7d0; margin:16px 0;"></div>
                        <div style="display:flex; flex-direction:column; gap:12px; font-size:14.5px; color:#166534; font-weight:600;">
                            <div style="display:flex; align-items:center; gap:8px;">
                                <span style="font-size:18px;">💰</span>
                                <span>Số tiền hoàn: <strong style="font-weight:800; color:#15803d;">${refundStr}</strong></span>
                            </div>
                            <div style="display:flex; align-items:center; gap:8px;">
                                <span style="font-size:18px;">👤</span>
                                <span>Người kiểm tra: <strong style="font-weight:800; color:#15803d;">${inspector}</strong></span>
                            </div>
                            <div style="display:flex; align-items:center; gap:8px;">
                                <span style="font-size:18px;">⏰</span>
                                <span>Thời gian kiểm tra: <strong style="font-weight:800; color:#15803d;">${timeInspectStr}</strong></span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
        
        const footer = `<button class="btn btn-secondary" onclick="closeModal()" style="padding:10px 28px">Đóng</button>`;
        openModal(title, body, footer);
    } catch(e) {
        console.error('Error opening action details:', e);
        showToast('Lỗi tải thông tin chi tiết', 'error');
    }
}
window._dgamShowActionDetail = _dgamShowActionDetail;

async function _dgamShowInspectConfirmModal(id) {
    try {
        const data = await apiCall(`/api/don-gui-ao-mau/${id}/detail`);
        if (!data || !data.order) {
            showToast('Không tìm thấy thông tin đơn mẫu', 'error');
            return;
        }
        const o = data.order;
        const payments = data.payments || [];
        const logs = data.logs || [];
        const closedOrders = data.closedOrders || [];
        const fmt = n => Number(n || 0).toLocaleString('vi-VN');

        const titleText = `🔍 KIỂM TRA ĐƠN MẪU: ${o.sample_order_code}`;

        // 1. Chi tiết sản phẩm gửi + Hình ảnh mẫu chụp (ảnh 2)
        const typeLabels = {
            'gui_mau_ao': 'Gửi mẫu áo',
            'gui_mau_vai': 'Gửi mẫu vải',
            'gui_tem': 'Gửi Tem',
            'gui_pet': 'Gửi Pet',
            'gui_khac': 'Gửi Khác'
        };
        const categoryLabel = typeLabels[o.category] || o.category || '—';
        const linhVucBadge = o.linh_vuc ? `<span style="background:#fef3c7;color:#d97706;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;margin-right:6px;white-space:nowrap">${o.linh_vuc}</span>` : '';

        let prodHTML = `<div style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;padding:16px;margin-bottom:16px;box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
            <div style="font-weight:800;font-size:14px;color:var(--navy);margin-bottom:12px">👕 Chi Tiết Sản Phẩm Gửi</div>
            <table class="table" style="width:100%;border-collapse:collapse;margin-bottom:12px;">
                <thead>
                    <tr style="background:#f8fafc;border-bottom:1.5px solid #e2e8f0">
                        <th style="padding:10px;text-align:left;font-size:11px;font-weight:700;color:#fff !important">PHÂN LOẠI</th>
                        <th style="padding:10px;text-align:left;font-size:11px;font-weight:700;color:#fff !important">LĨNH VỰC</th>
                        <th style="padding:10px;text-align:left;font-size:11px;font-weight:700;color:#fff !important">SẢN PHẨM / NỘI DUNG</th>
                        <th style="padding:10px;text-align:center;font-size:11px;font-weight:700;color:#fff !important;width:80px">SL</th>
                        <th style="padding:10px;text-align:right;font-size:11px;font-weight:700;color:#fff !important;width:120px">ĐƠN GIÁ</th>
                        <th style="padding:10px;text-align:right;font-size:11px;font-weight:700;color:#fff !important;width:120px">TỔNG TIỀN</th>
                    </tr>
                </thead>
                <tbody>
                    <tr style="border-bottom:1px solid #f1f5f9">
                        <td style="padding:10px;font-size:13px;font-weight:700;color:#1e293b">${categoryLabel}</td>
                        <td style="padding:10px;font-size:13px;font-weight:700;color:#1e293b;white-space:nowrap">${linhVucBadge || '—'}</td>
                        <td style="padding:10px;font-size:13px;font-weight:700;color:#1e293b">${o.product_name || '—'}</td>
                        <td style="padding:10px;text-align:center;font-size:13px;font-weight:700;color:#1e293b">${o.quantity || 0}</td>
                        <td style="padding:10px;text-align:right;font-size:13px;font-weight:700;color:#1e293b">${fmt(o.price)}đ</td>
                        <td style="padding:10px;text-align:right;font-size:13px;font-weight:700;color:var(--success)">${fmt(o.total_amount)}đ</td>
                    </tr>
                </tbody>
            </table>`;

        if (o.sample_image) {
            prodHTML += `<div style="text-align:center;margin-top:16px;background:#f8fafc;padding:16px;border-radius:8px;border:1px dashed #cbd5e1">
                <div style="font-size:11px;font-weight:700;color:#64748b;margin-bottom:8px">🖼️ HÌNH ẢNH MẪU CHỤP</div>
                <img src="${o.sample_image}" style="max-width:240px;max-height:220px;border-radius:8px;border:1px solid #e2e8f0;cursor:pointer;object-fit:contain;box-shadow:0 4px 12px rgba(0,0,0,0.1)" onclick="_dgamShowImagePreview('${o.sample_image}')" title="Click để xem ảnh gốc">
            </div>`;
        }
        prodHTML += `</div>`;

        // 2. Chi tiết cọc / thanh toán (ảnh 3)
        var displayPayments = payments.slice();
        if (displayPayments.length === 0 && Number(o.deposit_amount) > 0) {
            displayPayments.push({
                payment_code: o.deposit_code || '—',
                amount: o.deposit_amount,
                payment_date: o.order_date || o.created_at,
                payment_type: 'dat_coc',
                payment_method: null,
                transfer_note: 'Đặt cọc khi tạo đơn',
                _synthetic: true
            });
        }

        const fmtDt = d => { if (!d) return '—'; const dt = new Date(d); return `${dt.getDate()}/${dt.getMonth()+1}/${dt.getFullYear()}`; };

        var payHTML = `<div style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;padding:12px;margin-bottom:16px;box-shadow: 0 1px 3px rgba(0,0,0,0.02);">`;
        payHTML += `<div style="font-weight:800;font-size:14px;color:#1e3a8a;margin-bottom:12px">💳 Chi tiết cọc / thanh toán <span style="background:#10b981;color:#fff;padding:2px 8px;border-radius:10px;font-size:11px;margin-left:6px">${displayPayments.length}</span></div>`;
        if (displayPayments.length > 0) {
            payHTML += `<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px">`;
            payHTML += `<thead><tr style="background:#1e3a8a;color:#fff"><th style="padding:8px 10px;text-align:left;font-size:10px;font-weight:700">MÃ THANH TOÁN</th><th style="padding:8px 10px;text-align:right;font-size:10px;font-weight:700">SỐ TIỀN</th><th style="padding:8px 10px;text-align:center;font-size:10px;font-weight:700">NGÀY TT</th><th style="padding:8px 10px;text-align:center;font-size:10px;font-weight:700">LOẠI</th><th style="padding:8px 10px;text-align:left;font-size:10px;font-weight:700">NỘI DUNG</th></tr></thead><tbody>`;
            const typeLabelsPay = { thanh_toan: 'Thanh Toán', dat_coc: 'Cọc', tt_sll: 'TT SLL', pending: '⏳ Chờ', tra_lai_coc: 'Trả Lại Cọc' };
            for (const p of displayPayments) {
                payHTML += `<tr style="border-bottom:1px solid #f1f5f9${p._synthetic ? ';background:#fffbeb' : ''}">`;
                payHTML += `<td style="padding:8px 10px;font-weight:700;color:#1e40af">${p.payment_code || '—'}</td>`;
                payHTML += `<td style="padding:8px 10px;text-align:right;font-weight:800;color:#dc2626">${fmt(p.amount)}đ</td>`;
                payHTML += `<td style="padding:8px 10px;text-align:center">${fmtDt(p.payment_date)}</td>`;
                
                let badgeStyle = 'background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:6px;font-size:10px;font-weight:700;display:inline-block;';
                let typeText = typeLabelsPay[p.payment_type] || p.payment_type || '—';
                
                if (p.money_source === 'nha_van_chuyen') {
                    badgeStyle = 'background:#fee2e2;color:#b91c1c;border:1px solid #fca5a5;padding:2px 8px;border-radius:6px;font-size:10px;font-weight:700;display:inline-block;';
                    typeText = 'NVC';
                } else if (p.money_source === 'khach_hang_sll' || p.payment_type === 'tt_sll' || p.payment_type === 'child_sll') {
                    badgeStyle = 'background:#fef3c7;color:#b45309;border:1px solid #fde68a;padding:2px 8px;border-radius:6px;font-size:10px;font-weight:700;display:inline-block;';
                    typeText = 'KH SLL';
                } else if (p.payment_type === 'dat_coc') {
                    badgeStyle = 'background:linear-gradient(135deg,#f97316,#ea580c);color:#fff;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;display:inline-block;text-shadow:0 1px 2px rgba(0,0,0,.15);';
                    typeText = 'Đặt Cọc';
                } else if (p.payment_type === 'thanh_toan') {
                    badgeStyle = 'background:#dcfce7;color:#15803d;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;display:inline-block;';
                    typeText = 'Thanh Toán';
                }
                payHTML += `<td style="padding:8px 10px;text-align:center"><span style="${badgeStyle}">${typeText}</span></td>`;
                payHTML += `<td style="padding:8px 10px;color:#64748b;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${(p.transfer_note||'').replace(/"/g,'&quot;')}">${p.transfer_note || '—'}</td>`;
                payHTML += `</tr>`;
            }
            payHTML += `</tbody></table></div>`;
        } else {
            payHTML += `<div style="text-align:center;padding:16px;color:#94a3b8;font-size:13px">Chưa có thanh toán / cọc nào được ghi nhận</div>`;
        }
        payHTML += `</div>`;

        // 3. Tổng kết tài chính (ảnh 4)
        const remColor = o.remaining_amount > 0 ? '#dc2626' : '#059669';
        var finHTML = `<div style="background:linear-gradient(135deg,#fefce8,#fef9c3);border-radius:12px;border:1px solid #fde68a;padding:12px;margin-bottom:16px;box-shadow: 0 1px 3px rgba(0,0,0,0.02);">`;
        finHTML += `<div style="font-weight:800;font-size:14px;color:#92400e;margin-bottom:12px">💰 Tổng kết tài chính</div>`;
        
        const hasCarrierPayment = payments.some(p => p.money_source === 'nha_van_chuyen');
        const shipDeduct = o.ship_ck_deduct !== undefined ? (Number(o.ship_ck_deduct) || 0) : ((!hasCarrierPayment && o.shipping_fee_payer === 'hv' && o.shipping_fee_method === 'ck') ? (Number(o.shipping_fee) || 0) : 0);
        const otherPaid = Math.max(0, (Number(o.total_amount) || 0) - (Number(o.remaining_amount) || 0) - (Number(o.deposit_amount) || 0) - shipDeduct);
        const totalPaid = (Number(o.deposit_amount) || 0) + otherPaid;

        let finRows = [
            ['Tổng Tiền Hàng Thực Tế', fmt(o.total_amount) + 'đ', '#1e293b', true],
            ['Đã thanh toán (cọc)', fmt(totalPaid) + 'đ', '#10b981', true]
        ];
        if (shipDeduct > 0) {
            finRows.push(['🚚 Cước Vận Chuyển (HV Trả CK)', fmt(shipDeduct) + 'đ', '#f97316', true]);
        }
        finRows.push(['Còn lại', fmt(o.remaining_amount) + 'đ', remColor, true]);
        
        for (const [label, val, color, bold] of finRows) {
            const fontWt = bold ? '800' : '600';
            const fSize = bold ? '13px' : '12px';
            finHTML += `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(0,0,0,0.05);font-size:${fSize};font-weight:${fontWt};color:${color}">`;
            finHTML += `<span>${label}</span>`;
            finHTML += `<span>${val}</span>`;
            finHTML += `</div>`;
        }
        finHTML += `</div>`;

        // 4. Thông tin vận chuyển (ảnh 5)
        let shipInfoHTML = `<div style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;padding:16px;margin-bottom:16px;box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
            <div style="font-weight:800;font-size:14px;color:var(--navy);margin-bottom:12px">🚚 Thông tin vận chuyển</div>`;

        let hasShipment1 = o.status_gui_don || o.order_status === 'da_gui' || o.order_status === 'hoan_thanh';
        let hasShipment2 = o.status_gui_don_hoan === true;

        if (hasShipment1) {
            const timeValue = o.shipped_at ? new Date(o.shipped_at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }).replace(',', '') : '—';
            const carrierName = o.actual_carrier_name || '—';
            let trackingDisplay = o.tracking_code || '—';
            if (o.tracking_code && o.actual_carrier_tracking_url) {
                const trackingUrl = o.actual_carrier_tracking_url.replace('{code}', encodeURIComponent(o.tracking_code));
                trackingDisplay = `<a href="${trackingUrl}" target="_blank" rel="noopener" style="font-weight:700;color:#1e40af;text-decoration:underline;cursor:pointer" title="Tra cứu vận đơn">${o.tracking_code} 🔗</a>`;
            }

            const payerLabel = o.shipping_fee_payer === 'hv' ? ((o.tracking_code && o.tracking_code.trim()) ? 'HV trả cước vận chuyển' : (o.shipping_fee_method === 'ck' ? 'HV trả CK' : (o.shipping_fee_method === 'tm' ? 'HV trả TM' : 'HV trả cước vận chuyển'))) : o.shipping_fee_payer === 'khach' ? 'Khách trả' : '—';
            const payerColor = o.shipping_fee_payer === 'hv' ? '#7c3aed' : '#059669';
            const feeAmt = Number(o.shipping_fee || 0);

            let billHtml = '—';
            if (o.shipping_bill_link) {
                const billCid = `_dgamBillImgModalInspect_${o.id}`;
                billHtml = `<span id="${billCid}" style="color:#64748b;font-size:11px">⏳ Đang tải bill...</span>`;
                
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
                        
                        if (imgSrc && imgSrc.includes('/uploads/')) {
                            imgSrc = imgSrc.substring(imgSrc.indexOf('/uploads/'));
                        }
                        let linkHref = _origUrl;
                        if (linkHref && linkHref.includes('/uploads/')) {
                            linkHref = linkHref.substring(linkHref.indexOf('/uploads/'));
                        }
                        
                        const img = document.createElement('img');
                        img.src = imgSrc;
                        img.style.cssText = 'max-width:180px;max-height:140px;border-radius:6px;border:1px solid #e2e8f0;cursor:pointer;object-fit:contain;box-shadow:0 2px 6px rgba(0,0,0,.08);margin-top:4px;';
                        img.onerror = function() {
                            el.innerHTML = '<a href="' + linkHref + '" target="_blank" style="color:#3b82f6;font-weight:700">📷 Xem bill (link)</a>';
                        };
                        img.onclick = function() {
                            _dgamShowImagePreview(imgSrc);
                        };
                        el.innerHTML = '';
                        el.appendChild(img);
                    }, 100);
                })(billCid, o.shipping_bill_link);
            }

            shipInfoHTML += `
                <div style="background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:12px;padding:14px;box-shadow:0 2px 4px rgba(22,163,74,0.03);margin-bottom:14px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;border-bottom:1.5px solid #dcfce7;padding-bottom:8px;flex-wrap:wrap;gap:6px;">
                        <span style="font-weight:800;font-size:12px;color:#15803d">📦 LẦN 1 GỬI — ${o.product_name || '—'} (SL: ${o.quantity || 0})</span>
                        <span style="background:#22c55e;color:#fff;font-size:9px;font-weight:800;padding:2px 8px;border-radius:10px;">🟢 ĐÃ GỬI</span>
                    </div>
                    <table style="width:100%;font-size:12px;border-collapse:collapse;">
                        <tr><td style="padding:4px 0;color:#64748b;width:120px">👤 Người gửi:</td><td style="padding:4px 0;font-weight:700;color:#1e293b">${o.created_by_name || '—'}</td></tr>
                        <tr><td style="padding:4px 0;color:#64748b">📅 Thời gian gửi:</td><td style="padding:4px 0;font-weight:700;color:#1e293b">${timeValue}</td></tr>
                        <tr><td style="padding:4px 0;color:#64748b">🚚 Đơn vị vận chuyển:</td><td style="padding:4px 0;font-weight:700;color:#1e293b">${carrierName}</td></tr>
                        <tr><td style="padding:4px 0;color:#64748b">📦 Mã vận đơn:</td><td style="padding:4px 0;font-weight:700;color:#1e293b">${trackingDisplay}</td></tr>
                        <tr><td style="padding:4px 0;color:#64748b">💳 Người trả ship:</td><td style="padding:4px 0;font-weight:700;color:${payerColor}">${payerLabel}</td></tr>
                        <tr><td style="padding:4px 0;color:#64748b">💰 Cước Vận Chuyển:</td><td style="padding:4px 0;font-weight:800;color:#dc2626">${fmt(feeAmt)}đ</td></tr>
                        <tr><td style="padding:4px 0;color:#64748b">📎 Bill gửi hàng:</td><td style="padding:4px 0;" id="_dgamBillImgModalInspect_${o.id}">${billHtml}</td></tr>
                    </table>
                </div>`;
        }

        if (hasShipment2) {
            const timeValue = o.hoan_hang_shipped_at ? new Date(o.hoan_hang_shipped_at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }).replace(',', '') : '—';
            const carrierName = o.hoan_hang_actual_carrier_name || '—';
            let trackingDisplay = o.hoan_hang_tracking_code || '—';
            if (o.hoan_hang_tracking_code && o.hoan_hang_actual_carrier_tracking_url) {
                const trackingUrl = o.hoan_hang_actual_carrier_tracking_url.replace('{code}', encodeURIComponent(o.hoan_hang_tracking_code));
                trackingDisplay = `<a href="${trackingUrl}" target="_blank" rel="noopener" style="font-weight:700;color:#1e40af;text-decoration:underline;cursor:pointer" title="Tra cứu vận đơn">${o.hoan_hang_tracking_code} 🔗</a>`;
            }

            const payerLabel = o.return_payer === 'hv' ? ((o.hoan_hang_tracking_code && o.hoan_hang_tracking_code.trim()) ? 'HV trả cước vận chuyển' : (o.return_payment_method === 'ck' ? 'HV trả CK' : (o.return_payment_method === 'tm' ? 'HV trả TM' : 'HV trả cước hoàn'))) : o.return_payer === 'khach' ? 'Khách trả' : '—';
            const payerColor = o.return_payer === 'hv' ? '#7c3aed' : '#059669';
            const feeAmt = Number(o.return_shipping_fee || 0);

            let billHtml = '—';
            if (o.hoan_hang_shipping_bill_link) {
                const billCid = `_dgamBillImgModalInspect2_${o.id}`;
                billHtml = `<span id="${billCid}" style="color:#64748b;font-size:11px">⏳ Đang tải bill...</span>`;
                
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
                        
                        if (imgSrc && imgSrc.includes('/uploads/')) {
                            imgSrc = imgSrc.substring(imgSrc.indexOf('/uploads/'));
                        }
                        let linkHref = _origUrl;
                        if (linkHref && linkHref.includes('/uploads/')) {
                            linkHref = linkHref.substring(linkHref.indexOf('/uploads/'));
                        }
                        
                        const img = document.createElement('img');
                        img.src = imgSrc;
                        img.style.cssText = 'max-width:180px;max-height:140px;border-radius:6px;border:1px solid #e2e8f0;cursor:pointer;object-fit:contain;box-shadow:0 2px 6px rgba(0,0,0,.08);margin-top:4px;';
                        img.onerror = function() {
                            el.innerHTML = '<a href="' + linkHref + '" target="_blank" style="color:#3b82f6;font-weight:700">📷 Xem bill (link)</a>';
                        };
                        img.onclick = function() {
                            _dgamShowImagePreview(imgSrc);
                        };
                        el.innerHTML = '';
                        el.appendChild(img);
                    }, 100);
                })(billCid, o.hoan_hang_shipping_bill_link);
            }

            shipInfoHTML += `
                <div style="background:#eff6ff;border:1.5px solid #bfdbfe;border-radius:12px;padding:14px;box-shadow:0 2px 4px rgba(59,130,246,0.03);">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;border-bottom:1.5px solid #dbeafe;padding-bottom:8px;flex-wrap:wrap;gap:6px;">
                        <span style="font-weight:800;font-size:12px;color:#1d4ed8">📦 LẦN 2 GỬI — ${o.product_name || '—'} (SL: ${o.quantity || 0})</span>
                        <span style="background:#3b82f6;color:#fff;font-size:9px;font-weight:800;padding:2px 8px;border-radius:10px;">🟢 ĐÃ GỬI (HOÀN)</span>
                    </div>
                    <table style="width:100%;font-size:12px;border-collapse:collapse;">
                        <tr><td style="padding:4px 0;color:#64748b;width:120px">👤 Người gửi:</td><td style="padding:4px 0;font-weight:700;color:#1e293b">${o.updated_by_name || '—'}</td></tr>
                        <tr><td style="padding:4px 0;color:#64748b">📅 Thời gian gửi:</td><td style="padding:4px 0;font-weight:700;color:#1e293b">${timeValue}</td></tr>
                        <tr><td style="padding:4px 0;color:#64748b">🚚 Đơn vị vận chuyển:</td><td style="padding:4px 0;font-weight:700;color:#1e293b">${carrierName}</td></tr>
                        <tr><td style="padding:4px 0;color:#64748b">📦 Mã vận đơn:</td><td style="padding:4px 0;font-weight:700;color:#1e293b">${trackingDisplay}</td></tr>
                        <tr><td style="padding:4px 0;color:#64748b">💳 Người trả ship:</td><td style="padding:4px 0;font-weight:700;color:${payerColor}">${payerLabel}</td></tr>
                        <tr><td style="padding:4px 0;color:#64748b">💰 Cước Vận Chuyển:</td><td style="padding:4px 0;font-weight:800;color:#dc2626">${fmt(feeAmt)}đ</td></tr>
                        <tr><td style="padding:4px 0;color:#64748b">📎 Bill gửi hàng:</td><td style="padding:4px 0;" id="_dgamBillImgModalInspect2_${o.id}">${billHtml}</td></tr>
                    </table>
                </div>`;
        } else {
            shipInfoHTML += `<div style="text-align:center;padding:16px;color:#94a3b8;font-size:13px;font-style:italic">Chưa có thông tin gửi hàng lần nào</div>`;
        }
        shipInfoHTML += `</div>`;

        // 5. Bằng chứng mẫu áo đã về (nếu có)
        let proofHTML = '';
        if (o.hoan_hang_received_proof_image) {
            proofHTML = `
            <div style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;padding:16px;margin-bottom:16px;box-shadow: 0 1px 3px rgba(0,0,0,0.02);text-align:center;">
                <div style="font-weight:800;font-size:14px;color:var(--navy);margin-bottom:12px;text-align:left;">📸 Bằng Chứng Mẫu Áo Đã Về</div>
                <img src="${o.hoan_hang_received_proof_image}" style="max-width:320px;max-height:240px;border-radius:8px;border:1px solid #e2e8f0;cursor:pointer;object-fit:contain;box-shadow:0 4px 12px rgba(0,0,0,0.1)" onclick="_dgamShowImagePreview('${o.hoan_hang_received_proof_image}')" title="Click để xem ảnh gốc">
            </div>
            `;
        }

        // 6. Checkbox xác nhận (bắt buộc tích mới cho ấn)
        let confirmCheckHTML = '';
        if (o.status_kiem_tra) {
            const timeInspectVal = o.kiem_tra_at ? new Date(o.kiem_tra_at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }).replace(',', '') : '—';
            confirmCheckHTML = `
            <div style="background:#f0fdf4;border:1.5px solid #22c55e;border-radius:12px;padding:16px;margin-bottom:16px;text-align:left;">
                <label style="display:inline-flex;align-items:center;gap:10px;font-size:14px;font-weight:700;color:#15803d;cursor:pointer;margin-bottom:8px;">
                    <input type="checkbox" id="dgamInspectCheckbox" checked disabled style="width:18px;height:18px;cursor:pointer;">
                    Đã xác nhận mẫu áo đã về công ty để hoàn tiền
                </label>
                <div style="border-top:1px solid #bbf7d0;padding-top:8px;font-size:12.5px;color:#166534;font-weight:600;display:flex;flex-direction:column;gap:4px;">
                    <div>💰 Số tiền hoàn: <span style="font-weight:800;color:#15803d;">${o.hoan_tien_amount ? fmt(o.hoan_tien_amount) + 'đ' : '— (Không có)'}</span></div>
                    <div>👤 Người kiểm tra: <span style="font-weight:800;color:#15803d;">${o.inspect_by_name || '—'}</span></div>
                    <div>⏰ Thời gian kiểm tra: <span style="font-weight:800;color:#15803d;">${timeInspectVal}</span></div>
                </div>
            </div>
            `;
        } else {
            confirmCheckHTML = `
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin-bottom:14px;text-align:left;">
                <label style="font-size:13.5px;font-weight:800;color:#334155;margin-bottom:6px;display:block;">Số Tiền Hoàn : không bắt buộc</label>
                <input type="number" id="dgamRefundAmountInput" placeholder="Nhập số tiền hoàn (nếu có)..." style="width:100%;padding:10px 12px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:13.5px;font-weight:700;color:#1e293b;outline:none;transition:border-color 0.15s;" onfocus="this.style.borderColor='#8b5cf6'" onblur="this.style.borderColor='#cbd5e1'">
            </div>
            <div style="background:#faf5ff;border:1.5px dashed #8b5cf6;border-radius:12px;padding:16px;margin-bottom:16px;text-align:center;">
                <label style="display:inline-flex;align-items:center;gap:10px;font-size:14px;font-weight:700;color:#6b21a8;cursor:pointer;">
                    <input type="checkbox" id="dgamInspectCheckbox" onchange="_dgamToggleConfirmBtn()" style="width:18px;height:18px;cursor:pointer;">
                    Đã xác nhận mẫu áo đã về công ty để hoàn tiền
                </label>
            </div>
            `;
        }

        const bodyHTML = prodHTML + payHTML + finHTML + shipInfoHTML + proofHTML + confirmCheckHTML;
        
        let footerHTML = '';
        if (o.status_kiem_tra) {
            footerHTML = `
                <div style="display:flex;justify-content:space-between;width:100%;align-items:center;gap:12px;">
                    <button class="btn btn-danger" onclick="_dgamSaveInspectStatus(${o.id}, false)" style="background:#ef4444;color:#fff;border:none;padding:12px 24px;border-radius:8px;font-weight:800;font-size:13px;cursor:pointer;">❌ Bỏ kiểm tra</button>
                    <button class="btn btn-secondary" onclick="closeModal()" style="padding:12px 28px">Đóng</button>
                </div>
            `;
        } else {
            footerHTML = `
                <div style="display:flex;justify-content:space-between;width:100%;align-items:center;gap:12px;">
                    <button id="dgamConfirmInspectBtn" class="btn" disabled onclick="_dgamSaveInspectStatus(${o.id}, true)" style="background:linear-gradient(135deg, #8b5cf6, #6d28d9);color:#fff;border:none;padding:12px 30px;border-radius:8px;font-weight:800;font-size:14px;box-shadow:0 4px 12px rgba(109, 40, 217, 0.3);transition:all 0.2s;opacity:0.5;cursor:not-allowed;">💜 Xác nhận kiểm tra xong</button>
                    <button class="btn btn-secondary" onclick="closeModal()" style="padding:12px 28px">Đóng</button>
                </div>
            `;
        }

        openModal(titleText, bodyHTML, footerHTML);

        // Widen modal
        setTimeout(() => {
            const mc = document.querySelector('.modal-content');
            if (mc) { mc.style.maxWidth = '900px'; mc.style.width = '95vw'; }
        }, 30);
    } catch (e) {
        console.error('Error opening inspect modal:', e);
        showToast('Lỗi tải thông tin chi tiết', 'error');
    }
}

function _dgamToggleConfirmBtn() {
    const cb = document.getElementById('dgamInspectCheckbox');
    const btn = document.getElementById('dgamConfirmInspectBtn');
    if (cb && btn) {
        if (cb.checked) {
            btn.removeAttribute('disabled');
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
        } else {
            btn.setAttribute('disabled', 'true');
            btn.style.opacity = '0.5';
            btn.style.cursor = 'not-allowed';
        }
    }
}

async function _dgamSaveInspectStatus(id, value) {
    try {
        let hoanTienVal = null;
        if (value) {
            const input = document.getElementById('dgamRefundAmountInput');
            if (input && input.value !== '') {
                hoanTienVal = parseFloat(input.value) || 0;
            }
        }
        closeModal();
        await apiCall('/api/don-gui-ao-mau/' + id + '/status', 'PATCH', { 
            field: 'status_kiem_tra', 
            value: value,
            hoan_tien_amount: hoanTienVal
        });
        if (typeof showToast === 'function') {
            showToast('✅ Đã cập nhật trạng thái thành công!');
        }
        await _dgamLoadOrders();
    } catch (e) {
        console.error(e);
        if (typeof showToast === 'function') {
            showToast(e.message || 'Lỗi cập nhật trạng thái kiểm tra', 'error');
        }
    }
}

window._dgamShowInspectConfirmModal = _dgamShowInspectConfirmModal;
window._dgamToggleConfirmBtn = _dgamToggleConfirmBtn;
window._dgamSaveInspectStatus = _dgamSaveInspectStatus;

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

async function _dgamOnHoanHangClick(id) {
    try {
        const res = await apiCall('/api/don-gui-ao-mau/' + id + '/detail');
        if (!res || !res.order) return showToast('Không tìm thấy thông tin đơn hàng', 'error');
        const order = res.order;

        if (!order.status_hoan_hang && order.order_status !== 'da_gui' && order.order_status !== 'hoan_thanh') {
            showToast('Chỉ được hoàn hàng khi trạng thái là Đã Gửi Mẫu', 'error');
            return;
        }

        const formatDgamDate = (dStr) => {
            if (!dStr) return '—';
            try {
                const d = new Date(dStr);
                if (isNaN(d.getTime())) return dStr;
                const date = String(d.getDate()).padStart(2, '0');
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const year = d.getFullYear();
                return `${date}/${month}/${year}`;
            } catch (e) {
                return dStr;
            }
        };
        const formatDgamTime = (dStr) => {
            if (!dStr) return '—';
            try {
                const d = new Date(dStr);
                if (isNaN(d.getTime())) return dStr;
                const hr = String(d.getHours()).padStart(2, '0');
                const min = String(d.getMinutes()).padStart(2, '0');
                const date = String(d.getDate()).padStart(2, '0');
                const month = String(d.getMonth() + 1).padStart(2, '0');
                return `${hr}:${min} ${date}/${month}`;
            } catch (e) {
                return dStr;
            }
        };

        let carriers = [];
        try {
            const c = await apiCall('/api/shipping/carriers');
            carriers = c.carriers || [];
        } catch(e) {
            console.error('Error fetching carriers:', e);
        }

        let modal = document.getElementById('dgamHoanHangModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'dgamHoanHangModal';
            modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);backdrop-filter:blur(4px);z-index:9999;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity 0.2s;';
            document.body.appendChild(modal);
        }

        if (order.status_hoan_hang) {
            let carrierName = order.hoan_actual_carrier_name || order.hoan_hang_shipping_method || '—';
            let trackingCodeHtml = order.hoan_hang_tracking_code 
                ? `<span style="font-weight:bold;color:#1e3a8a;">${order.hoan_hang_tracking_code}</span>` 
                : '<span style="color:#6b7280;font-style:italic;">(Chưa có mã vận đơn)</span>';
            if (order.hoan_hang_shipping_bill_link) {
                trackingCodeHtml += ` <a href="${order.hoan_hang_shipping_bill_link}" target="_blank" style="margin-left:8px;color:#3b82f6;text-decoration:underline;font-weight:700;">📄 Xem Bill</a>`;
            }

            const timeValueHoan = order.hoan_hang_shipped_at ? new Date(order.hoan_hang_shipped_at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }).replace(',', '') : '—';
            const carrierNameHoan = order.hoan_actual_carrier_name || '—';
            let trackingDisplayHoan = order.hoan_hang_tracking_code || '—';
            if (order.hoan_hang_tracking_code && order.actual_carrier_tracking_url) {
                const trackingUrlHoan = order.actual_carrier_tracking_url.replace('{code}', encodeURIComponent(order.hoan_hang_tracking_code));
                trackingDisplayHoan = `<a href="${trackingUrlHoan}" target="_blank" rel="noopener" style="font-weight:700;color:#1e40af;text-decoration:underline;cursor:pointer" title="Tra cứu vận đơn">${order.hoan_hang_tracking_code} 🔗</a>`;
            }

            const payerLabelHoan = order.return_payer === 'hv' ? ((order.hoan_hang_tracking_code && order.hoan_hang_tracking_code.trim()) ? 'HV trả cước vận chuyển' : (order.return_payment_method === 'ck' ? 'HV trả CK' : (order.return_payment_method === 'tm' ? 'HV trả TM' : 'HV trả cước vận chuyển'))) : order.return_payer === 'khach' ? 'Khách trả' : '—';
            const payerColorHoan = order.return_payer === 'hv' ? '#7c3aed' : '#059669';
            const feeAmtHoan = Number(order.return_shipping_fee || 0);

            let billHtmlHoan = '—';
            if (order.hoan_hang_shipping_bill_link) {
                const billCidHoan = `_dgamBillImgModalHoan2_${order.id}`;
                billHtmlHoan = `<span id="${billCidHoan}" style="color:#64748b;font-size:11px">⏳ Đang tải bill...</span>`;
                
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
                        
                        if (imgSrc && imgSrc.includes('/uploads/')) {
                            imgSrc = imgSrc.substring(imgSrc.indexOf('/uploads/'));
                        }
                        let linkHref = _origUrl;
                        if (linkHref && linkHref.includes('/uploads/')) {
                            linkHref = linkHref.substring(linkHref.indexOf('/uploads/'));
                        }
                        
                        const img = document.createElement('img');
                        img.src = imgSrc;
                        img.style.cssText = 'max-width:180px;max-height:140px;border-radius:6px;border:1px solid #e2e8f0;cursor:pointer;object-fit:contain;box-shadow:0 2px 6px rgba(0,0,0,.08);margin-top:4px;';
                        img.onerror = function() {
                            el.innerHTML = '<a href="' + linkHref + '" target="_blank" style="color:#3b82f6;font-weight:700">📷 Xem bill (link)</a>';
                        };
                        img.onclick = function() {
                            _dgamShowImagePreview(imgSrc);
                        };
                        el.innerHTML = '';
                        el.appendChild(img);
                    }, 100);
                })(billCidHoan, order.hoan_hang_shipping_bill_link);
            }

            modal.innerHTML = `
                <style>
                    @keyframes dgamModalFadeIn {
                        from { transform: scale(0.95); opacity: 0; }
                        to { transform: scale(1); opacity: 1; }
                    }
                </style>
                <div style="background:#fff;border-radius:16px;box-shadow:0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);width:500px;max-width:95%;max-height:90vh;display:flex;flex-direction:column;animation:dgamModalFadeIn 0.25s ease-out;overflow:hidden;">
                    <div style="padding:16px 20px;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;background:#f8fafc;">
                        <h3 style="margin:0;font-size:16px;font-weight:800;color:#0f172a;display:flex;align-items:center;gap:8px;">🔄 Thông Tin Yêu Cầu Hoàn Hàng</h3>
                        <button onclick="_dgamCloseHoanHangModal()" style="background:none;border:none;color:#94a3b8;font-size:24px;cursor:pointer;line-height:1;padding:0;margin:0;">&times;</button>
                    </div>
                    <div style="padding:20px;overflow-y:auto;flex:1;display:flex;flex-direction:column;gap:14px;font-size:13px;line-height:1.5;color:#334155;">
                        <div style="display:grid;grid-template-columns:140px 1fr;gap:8px;border-bottom:1px dashed #f1f5f9;padding-bottom:8px;">
                            <span style="font-weight:600;color:#64748b;">Mã Đơn Áo Mẫu:</span>
                            <span style="font-weight:700;color:#0f172a;">${order.sample_order_code || '—'}</span>
                        </div>
                        <div style="display:grid;grid-template-columns:140px 1fr;gap:8px;border-bottom:1px dashed #f1f5f9;padding-bottom:8px;">
                            <span style="font-weight:600;color:#64748b;">Ngày Gửi Hàng:</span>
                            <span style="font-weight:700;color:#0f172a;background:#eff6ff;color:#1d4ed8;padding:2px 6px;border-radius:4px;width:fit-content;">${order.hoan_hang_ship_date ? formatDgamDate(order.hoan_hang_ship_date) : '—'}</span>
                        </div>
                        <div style="display:grid;grid-template-columns:140px 1fr;gap:8px;border-bottom:1px dashed #f1f5f9;padding-bottom:8px;">
                            <span style="font-weight:600;color:#64748b;">Tiêu Chuẩn Gửi:</span>
                            <span style="font-weight:700;color:${order.hoan_hang_shipping_priority === 'GẤP' ? '#ef4444' : order.hoan_hang_shipping_priority === 'CHUẨN' ? '#eab308' : '#3b82f6'};">${order.hoan_hang_shipping_priority || '—'}</span>
                        </div>
                        ${order.hoan_hang_shipping_priority === 'CHUẨN' ? `
                            <div style="display:grid;grid-template-columns:140px 1fr;gap:8px;border-bottom:1px dashed #f1f5f9;padding-bottom:8px;">
                                <span style="font-weight:600;color:#64748b;">Giờ Hàng Ra (24h):</span>
                                <span style="font-weight:700;color:#eab308;">⏰ ${order.hoan_hang_ship_time || '—'}</span>
                            </div>
                            <div style="display:grid;grid-template-columns:140px 1fr;gap:8px;border-bottom:1px dashed #f1f5f9;padding-bottom:8px;align-items:center;">
                                <span style="font-weight:600;color:#64748b;">Ảnh Chứng Minh:</span>
                                <div>
                                    ${order.hoan_hang_chuan_proof_image 
                                        ? `<img src="${order.hoan_hang_chuan_proof_image}" style="max-height:80px;border-radius:6px;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,0.15);" onclick="_dgamShowImagePreview('${order.hoan_hang_chuan_proof_image}')">` 
                                        : '—'}
                                </div>
                            </div>
                        ` : ''}
                        <div style="display:grid;grid-template-columns:140px 1fr;gap:8px;border-bottom:1px dashed #f1f5f9;padding-bottom:8px;">
                            <span style="font-weight:600;color:#64748b;">Nhà Vận Chuyển:</span>
                            <span style="font-weight:700;color:#0f172a;">${order.hoan_hang_shipping_method || '—'}</span>
                        </div>
                        <div style="display:grid;grid-template-columns:140px 1fr;gap:8px;border-bottom:1px dashed #f1f5f9;padding-bottom:8px;">
                            <span style="font-weight:600;color:#64748b;">Nội Dung Dặn Kế Toán:</span>
                            <span style="font-weight:600;color:#0f172a;white-space:pre-wrap;background:#f8fafc;padding:6px 10px;border-radius:6px;border:1px solid #f1f5f9;display:block;">${order.hoan_hang_sale_note || '—'}</span>
                        </div>
                        <div style="border-top:1.5px solid #e2e8f0;margin-top:4px;padding-top:12px;">
                            <h4 style="margin:0 0 10px 0;font-size:12px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px;">🚛 Trạng Thái Gửi Hàng Của Kế Toán</h4>
                            ${order.status_gui_don_hoan ? `
                                <div style="background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:12px;padding:14px;box-shadow:0 2px 4px rgba(22,163,74,0.03);">
                                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;border-bottom:1.5px solid #dcfce7;padding-bottom:8px;flex-wrap:wrap;gap:6px;">
                                        <span style="font-weight:800;color:#166534;font-size:13px;">📦 LẦN 2 GỬI — ${(order.product_name || 'MẪU ÁO').toUpperCase()} <span style="background:#dcfce7;color:#166534;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700;">SL: ${order.quantity || 1}</span></span>
                                        <span style="background:#16a34a;color:white;padding:3px 10px;border-radius:20px;font-weight:800;font-size:10px;letter-spacing:0.5px;">🟢 ĐÃ GỬI (HOÀN)</span>
                                    </div>
                                    <div style="font-size:12px;color:#1e293b;display:grid;grid-template-columns:140px 1fr;gap:6px 12px;align-items:start;">
                                        <span style="color:#64748b;font-weight:600;">👤 Người gửi:</span> <span style="font-weight:700;color:#1e293b">${order.hoan_shipped_by_name || '—'}</span>
                                        <span style="color:#64748b;font-weight:600;">📅 Thời gian gửi:</span> <span style="font-weight:700;color:#1e293b">${timeValueHoan}</span>
                                        <span style="color:#64748b;font-weight:600;">🚛 Đơn vị vận chuyển:</span> <span style="font-weight:700;color:#1e293b">${carrierNameHoan}</span>
                                        ${order.hoan_hang_tracking_code ? `<span style="color:#64748b;font-weight:600;">📦 Mã vận đơn:</span> <span>${trackingDisplayHoan}</span>` : ''}
                                        <span style="color:#64748b;font-weight:600;">🤝 Người nhận:</span> <span style="font-weight:700;color:#1e293b">${order.customer_name || '—'}</span>
                                        <span style="color:#64748b;font-weight:600;">💳 Người trả ship:</span> <span><span style="font-weight:800;color:${payerColorHoan}">${payerLabelHoan}</span></span>
                                        ${(order.return_payer === 'hv' && order.return_payment_method === 'tm') ? `
                                            <span style="color:#64748b;font-weight:600;">💵 Mã Tiền Chi TM:</span> 
                                            <span style="font-weight:700;color:#d97706">${order.hoan_shipping_cashflow_code || '—'}</span>
                                        ` : ''}
                                        <span style="color:#64748b;font-weight:600;">💰 Cước Vận Chuyển:</span> <span style="font-weight:800;color:#dc2626">${Number(feeAmtHoan).toLocaleString('vi-VN')}đ</span>
                                        ${order.hoan_hang_shipping_bill_link ? `<span style="color:#64748b;font-weight:600;vertical-align:top;padding-top:4px;">🔗 Bill gửi hàng:</span> <div>${billHtmlHoan}</div>` : ''}
                                    </div>
                                </div>
                            ` : `
                                <div style="background:#fff7ed;border:1.5px solid #fed7aa;border-radius:12px;padding:14px;box-shadow:0 2px 4px rgba(234,179,8,0.03);">
                                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;border-bottom:1.5px solid #ffedd5;padding-bottom:8px;flex-wrap:wrap;gap:6px;">
                                        <span style="font-weight:800;color:#c2410c;font-size:13px;">📦 LẦN 2 GỬI — ${(order.product_name || 'MẪU ÁO').toUpperCase()} <span style="background:#ffedd5;color:#c2410c;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700;">SL: ${order.quantity || 1}</span></span>
                                        <span style="background:#ea580c;color:white;padding:3px 10px;border-radius:20px;font-weight:800;font-size:10px;letter-spacing:0.5px;">⏳ CHỜ KẾ TOÁN GỬI</span>
                                    </div>
                                    <div style="font-size:12px;color:#1e293b;display:grid;grid-template-columns:140px 1fr;gap:6px 12px;align-items:start;">
                                        <span style="color:#64748b;font-weight:600;">Trạng Thái:</span> <span style="font-weight:700;color:#c2410c">🔴 Chờ kế toán gửi hàng</span>
                                    </div>
                                </div>
                            `}
                        </div>
                    </div>
                    <div style="padding:14px 20px;border-top:1px solid #e2e8f0;display:flex;justify-content:end;background:#f8fafc;">
                        <button onclick="_dgamCloseHoanHangModal()" style="padding:8px 16px;border:1px solid #d1d5db;border-radius:8px;background:#fff;color:#374151;cursor:pointer;font-weight:600;font-size:13px;transition:all 0.15s;" onmouseover="this.style.background='#f3f4f6'" onmouseout="this.style.background='#fff'">Đóng</button>
                    </div>
                </div>
            `;
        } else {
            let carrierOptions = carriers.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
            let hourOptions = '';
            for (let i = 0; i < 24; i++) {
                let v = (i < 10 ? '0' : '') + i;
                hourOptions += `<option value="${v}">${v}</option>`;
            }
            let minuteOptions = '';
            for (let i = 0; i < 60; i += 5) {
                let v = (i < 10 ? '0' : '') + i;
                minuteOptions += `<option value="${v}">${v}</option>`;
            }
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowStr = tomorrow.toISOString().split('T')[0];
            const todayStr = new Date().toISOString().split('T')[0];

            modal.innerHTML = `
                <style>
                    @keyframes dgamModalFadeIn {
                        from { transform: scale(0.95); opacity: 0; }
                        to { transform: scale(1); opacity: 1; }
                    }
                </style>
                <div style="background:#fff;border-radius:16px;box-shadow:0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);width:480px;max-width:95%;max-height:90vh;display:flex;flex-direction:column;animation:dgamModalFadeIn 0.25s ease-out;overflow:hidden;">
                    <div style="padding:16px 20px;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;background:#f8fafc;">
                        <h3 style="margin:0;font-size:16px;font-weight:800;color:#0f172a;display:flex;align-items:center;gap:8px;">🔄 Yêu Cầu Hoàn Hàng Mẫu</h3>
                        <button onclick="_dgamCloseHoanHangModal()" style="background:none;border:none;color:#94a3b8;font-size:24px;cursor:pointer;line-height:1;padding:0;margin:0;">&times;</button>
                    </div>
                    <form id="dgamHoanHangForm" onsubmit="_dgamSubmitHoanHang(event, ${id})" style="margin:0;padding:20px;overflow-y:auto;flex:1;display:flex;flex-direction:column;gap:14px;font-size:13px;">
                        <div>
                            <label style="display:block;font-weight:700;margin-bottom:6px;color:#334155;">Ngày Gửi Hàng *</label>
                            <input type="date" id="hoan_hang_ship_date" required min="${todayStr}" style="width:100%;padding:8px 12px;border:1px solid #cbd5e1;border-radius:8px;font-size:13px;font-family:inherit;outline:none;transition:border-color 0.15s;" onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='#cbd5e1'">
                        </div>
                        <div>
                            <label style="display:block;font-weight:700;margin-bottom:6px;color:#334155;">Tiêu Chuẩn Gửi *</label>
                            <select id="hoan_hang_shipping_priority" required style="width:100%;padding:8px 12px;border:1px solid #cbd5e1;border-radius:8px;font-size:13px;font-family:inherit;background-color:#fff;outline:none;" onchange="_dgamOnPriorityChange(this.value)">
                                <option value="GỬI">GỬI</option>
                                <option value="CHUẨN">CHUẨN</option>
                                <option value="GẤP">GẤP</option>
                            </select>
                        </div>
                        <div id="hoan_chuan_fields" style="display:none;flex-direction:column;gap:14px;background:#fefefe;border:1.5px dashed #eab308;padding:12px;border-radius:10px;">
                            <div>
                                <label style="display:block;font-weight:700;margin-bottom:6px;color:#854d0e;">⏰ Yêu Cầu Chuẩn Giờ Hàng Ra (24h) *</label>
                                <div style="display:flex;gap:6px;align-items:center;">
                                    <select id="hoan_hang_ship_hour" style="flex:1;padding:8px 12px;border:1px solid #cbd5e1;border-radius:8px;font-size:13px;font-family:inherit;background-color:#fff;outline:none;">
                                        <option value="">Giờ</option>
                                        ${hourOptions}
                                    </select>
                                    <span style="font-weight:800;">:</span>
                                    <select id="hoan_hang_ship_minute" style="flex:1;padding:8px 12px;border:1px solid #cbd5e1;border-radius:8px;font-size:13px;font-family:inherit;background-color:#fff;outline:none;">
                                        <option value="">Phút</option>
                                        ${minuteOptions}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label style="display:block;font-weight:700;margin-bottom:6px;color:#854d0e;">📸 Ảnh chứng minh Tiêu Chuẩn CHUẨN *</label>
                                <div id="hoan_proof_zone" tabindex="0" style="border:2px dashed #cbd5e1;border-radius:10px;padding:20px;text-align:center;cursor:pointer;background:#f8fafc;transition:all 0.2s;min-height:80px;display:flex;align-items:center;justify-content:center;flex-direction:column;outline:none;" onpaste="_dgamPasteHoanProofImg(event)" onclick="this.focus()" onfocus="this.style.borderColor='#3b82f6';this.style.background='#f0f9ff';" onblur="this.style.borderColor='#cbd5e1';this.style.background='#f8fafc';">
                                    <div id="hoan_proof_placeholder" style="color:#94a3b8;font-size:12px;display:flex;flex-direction:column;align-items:center;gap:6px;">
                                        <span style="font-size:28px;color:#d97706;">📋</span>
                                        <span style="color:#64748b;font-weight:500;">Click vào đây rồi <strong style="color:#475569;">Ctrl+V</strong> dán hình ảnh</span>
                                    </div>
                                    <div id="hoan_proof_preview_container" style="display:none;position:relative;width:100%;text-align:center;">
                                        <img id="hoan_proof_preview" style="max-height:120px;border-radius:8px;box-shadow:0 4px 10px rgba(0,0,0,0.1);max-width:100%;object-fit:contain;">
                                        <button type="button" onclick="_dgamRemoveProofImage(); event.stopPropagation();" style="position:absolute;top:-8px;right:-8px;background:#ef4444;color:white;border:none;width:20px;height:20px;border-radius:50%;font-size:11px;font-weight:bold;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 4px rgba(0,0,0,0.2);">✕</button>
                                    </div>
                                </div>
                                <input type="hidden" id="hoan_hang_chuan_proof_image">
                            </div>
                        </div>
                        <div>
                            <label style="display:block;font-weight:700;margin-bottom:6px;color:#334155;">Nhà Vận Chuyển *</label>
                            <select id="hoan_hang_shipping_method" required style="width:100%;padding:8px 12px;border:1px solid #cbd5e1;border-radius:8px;font-size:13px;font-family:inherit;background-color:#fff;outline:none;">
                                <option value="">-- Chọn nhà vận chuyển --</option>
                                ${carrierOptions}
                            </select>
                        </div>
                        <div>
                            <label style="display:block;font-weight:700;margin-bottom:6px;color:#334155;">📝 Nội Dung Sale Dặn Kế Toán Gửi Hàng *</label>
                            <textarea id="hoan_hang_sale_note" required rows="3" placeholder="Ví dụ: Kế toán gửi hoàn áo mẫu cho khách Lê Văn A..." style="width:100%;padding:8px 12px;border:1px solid #cbd5e1;border-radius:8px;font-size:13px;font-family:inherit;outline:none;resize:vertical;transition:border-color 0.15s;" onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='#cbd5e1'"></textarea>
                        </div>
                        <div style="padding-top:10px;border-top:1px solid #e2e8f0;display:flex;justify-content:end;gap:10px;margin-top:10px;">
                            <button type="button" onclick="_dgamCloseHoanHangModal()" style="padding:8px 16px;border:1px solid #d1d5db;border-radius:8px;background:#fff;color:#374151;cursor:pointer;font-weight:600;font-size:13px;transition:all 0.15s;" onmouseover="this.style.background='#f3f4f6'" onmouseout="this.style.background='#fff'">Hủy</button>
                            <button type="submit" id="dgamHoanSubmitBtn" style="padding:8px 20px;border:none;border-radius:8px;background:#3b82f6;color:white;cursor:pointer;font-weight:700;font-size:13px;box-shadow:0 4px 10px rgba(59,130,246,0.3);transition:all 0.15s;" onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='#3b82f6'">Lưu Yêu Cầu</button>
                        </div>
                    </form>
                </div>
            `;
        }

        modal.style.display = 'flex';
        setTimeout(() => { modal.style.opacity = '1'; }, 10);

    } catch (e) {
        console.error('Error opening hoan hang modal:', e);
        showToast('Lỗi tải thông tin hoàn hàng', 'error');
    }
}

function _dgamCloseHoanHangModal() {
    const modal = document.getElementById('dgamHoanHangModal');
    if (modal) {
        modal.style.opacity = '0';
        setTimeout(() => { modal.style.display = 'none'; }, 200);
    }
}

function _dgamOnPriorityChange(val) {
    const fields = document.getElementById('hoan_chuan_fields');
    const hourSelect = document.getElementById('hoan_hang_ship_hour');
    const minSelect = document.getElementById('hoan_hang_ship_minute');
    if (val === 'CHUẨN') {
        fields.style.display = 'flex';
        if (hourSelect) hourSelect.required = true;
        if (minSelect) minSelect.required = true;
    } else {
        fields.style.display = 'none';
        if (hourSelect) { hourSelect.required = false; hourSelect.value = ''; }
        if (minSelect) { minSelect.required = false; minSelect.value = ''; }
        _dgamRemoveProofImage();
    }
}

function _dgamSetProofImage(url) {
    const proofInp = document.getElementById('hoan_hang_chuan_proof_image');
    if (proofInp) proofInp.value = url;
    const img = document.getElementById('hoan_proof_preview');
    if (img) img.src = url;
    const container = document.getElementById('hoan_proof_preview_container');
    if (container) container.style.display = 'block';
    const placeholder = document.getElementById('hoan_proof_placeholder');
    if (placeholder) placeholder.style.display = 'none';
    const zone = document.getElementById('hoan_proof_zone');
    if (zone) {
        zone.style.borderColor = '#059669';
        zone.style.background = '#f0fdf4';
    }
}

function _dgamRemoveProofImage() {
    const proofVal = document.getElementById('hoan_hang_chuan_proof_image');
    if (proofVal) proofVal.value = '';
    const previewContainer = document.getElementById('hoan_proof_preview_container');
    if (previewContainer) previewContainer.style.display = 'none';
    const placeholder = document.getElementById('hoan_proof_placeholder');
    if (placeholder) placeholder.style.display = 'flex';
    const zone = document.getElementById('hoan_proof_zone');
    if (zone) {
        zone.style.borderColor = '#cbd5e1';
        zone.style.background = '#f8fafc';
    }
}

async function _dgamPasteHoanProofImg(e) {
    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
    for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
            const file = items[i].getAsFile();
            if (file) {
                try {
                    showToast('Đang tải ảnh lên...', 'info');
                    const formData = new FormData();
                    formData.append('image', file);
                    const uploadResult = await fetch('/api/upload', {
                        method: 'POST',
                        headers: {
                            'Authorization': 'Bearer ' + localStorage.getItem('token')
                        },
                        body: formData
                    });
                    const r = await uploadResult.json();
                    if (r && r.url) {
                        _dgamSetProofImage(r.url);
                        showToast('Tải ảnh chứng minh thành công!', 'success');
                    } else {
                        showToast('Lỗi tải ảnh lên: ' + (r.error || 'Unknown error'), 'error');
                    }
                } catch (uploadErr) {
                    console.error('Upload proof err:', uploadErr);
                    showToast('Lỗi tải ảnh chứng minh: ' + uploadErr.message, 'error');
                }
            }
        }
    }
}

async function _dgamSubmitHoanHang(e, id) {
    e.preventDefault();
    const submitBtn = document.getElementById('dgamHoanSubmitBtn');
    submitBtn.disabled = true;
    submitBtn.innerText = 'Đang lưu...';

    const ship_date = document.getElementById('hoan_hang_ship_date').value;
    const priority = document.getElementById('hoan_hang_shipping_priority').value;
    const method = document.getElementById('hoan_hang_shipping_method').value;
    const note = document.getElementById('hoan_hang_sale_note').value;
    const hour = document.getElementById('hoan_hang_ship_hour')?.value || '';
    const minute = document.getElementById('hoan_hang_ship_minute')?.value || '';
    const ship_time = (hour && minute) ? `${hour}:${minute}` : '';
    const proof = document.getElementById('hoan_hang_chuan_proof_image').value;

    if (priority === 'CHUẨN') {
        if (!hour || !minute) {
            showToast('Vui lòng chọn đầy đủ Giờ và Phút hàng ra cho đơn chuẩn!', 'error');
            submitBtn.disabled = false;
            submitBtn.innerText = 'Lưu Yêu Cầu';
            return;
        }
        if (!proof) {
            showToast('Vui lòng dán Ảnh chứng minh cho đơn chuẩn!', 'error');
            submitBtn.disabled = false;
            submitBtn.innerText = 'Lưu Yêu Cầu';
            return;
        }
    }

    try {
        const body = {
            hoan_hang_ship_date: ship_date,
            hoan_hang_shipping_priority: priority,
            hoan_hang_shipping_method: method,
            hoan_hang_sale_note: note,
            hoan_hang_ship_time: ship_time,
            hoan_hang_chuan_proof_image: proof
        };

        const res = await apiCall('/api/don-gui-ao-mau/' + id + '/hoan-hang', 'POST', body);
        if (res && res.success) {
            showToast('Báo hoàn hàng mẫu thành công!', 'success');
            _dgamCloseHoanHangModal();
            if (typeof _dgamLoadOrders === 'function') {
                _dgamLoadOrders();
            } else {
                location.reload();
            }
        } else {
            showToast('Lỗi: ' + (res.error || 'Không thể gửi yêu cầu hoàn hàng'), 'error');
            submitBtn.disabled = false;
            submitBtn.innerText = 'Lưu Yêu Cầu';
        }
    } catch (err) {
        console.error('Error submitting hoan hang request:', err);
        showToast('Lỗi: ' + err.message, 'error');
        submitBtn.disabled = false;
        submitBtn.innerText = 'Lưu Yêu Cầu';
    }
}

// ========== RECEIVED PROOF PHOTO MODAL & UPLOAD/COMPRESSION ==========
var _dgamCompressedBlob = null;

function _dgamCompressImage(file, callback) {
    var reader = new FileReader();
    reader.onload = function(e) {
        var img = new Image();
        img.onload = function() {
            var canvas = document.createElement('canvas');
            var max_size = 800;
            var width = img.width;
            var height = img.height;
            
            if (width > height) {
                if (width > max_size) {
                    height *= max_size / width;
                    width = max_size;
                }
            } else {
                if (height > max_size) {
                    width *= max_size / height;
                    height = max_size;
                }
            }
            canvas.width = width;
            canvas.height = height;
            
            var ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            canvas.toBlob(function(blob) {
                callback(blob);
            }, 'image/jpeg', 0.6);
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function _dgamHandleProofFile(file) {
    var hint = document.getElementById('dgamProofHint');
    var container = document.getElementById('dgamProofPreviewContainer');
    var img = document.getElementById('dgamProofPreview');
    var sizeLabel = document.getElementById('dgamProofSize');
    var submitBtn = document.getElementById('dgamSubmitProofBtn');
    
    if (hint) hint.style.display = 'none';
    if (container) container.style.display = 'block';
    if (sizeLabel) sizeLabel.innerHTML = '⏳ Đang nén ảnh...';
    if (submitBtn) submitBtn.disabled = true;
    
    _dgamCompressImage(file, function(blob) {
        _dgamCompressedBlob = blob;
        var kb = Math.round(blob.size / 1024);
        if (sizeLabel) {
            sizeLabel.innerHTML = '✅ Đã nén thành công: <strong>' + kb + ' KB</strong>';
        }
        if (img) {
            img.src = URL.createObjectURL(blob);
        }
        if (submitBtn) {
            submitBtn.disabled = false;
        }
    });
}

function _dgamShowReceivedProofModal(orderId) {
    var o = (_dgam.orders || []).find(x => x.id === orderId);
    if (!o) return;
    
    _dgamCompressedBlob = null;
    
    var userObj = window.currentUser || window._currentUser || (typeof currentUser !== 'undefined' ? currentUser : null);
    var deptName = (userObj && userObj.department_name || '').toLowerCase();
    var isKeToan = deptName.includes('kế toán') || deptName.includes('ke toan');
    var isQuanLyXuong = userObj && (userObj.username === 'quanlyxuong' || userObj.full_name === 'Lê Công Thực');
    var isQLCCTrinh = userObj && userObj.full_name && (userObj.full_name.includes('Lê Việt Trinh') || userObj.full_name.includes('Le Viet Trinh') || userObj.username === 'trinh');
    var isGiamDoc = userObj && userObj.role === 'giam_doc';
    var isSale = !isKeToan && !isQuanLyXuong && !isQLCCTrinh && !isGiamDoc;
    
    var bodyHTML = '';
    var footerHTML = '';
    
    if (o.hoan_hang_received_proof_image) {
        var imgHtml = '<div style="text-align:center;margin-bottom:12px;">'
            + '<img src="' + o.hoan_hang_received_proof_image + '" style="max-width:100%;max-height:300px;border-radius:12px;border:1px solid #e2e8f0;box-shadow:0 4px 12px rgba(0,0,0,0.1);">'
            + '</div>';
            
        if (isSale) {
            bodyHTML = imgHtml 
                + '<div style="border-top:1px solid #e2e8f0;margin:16px 0;padding-top:12px;">'
                + '<div style="font-size:12px;font-weight:700;color:var(--navy);margin-bottom:6px;">🔄 Thay thế bằng chứng mẫu đã về:</div>'
                + '<div id="dgamProofPasteZone" tabindex="0" style="border:2.5px dashed #cbd5e1;border-radius:10px;min-height:100px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#f8fafc;outline:none;position:relative;padding:12px;">'
                + '<span id="dgamProofHint" style="color:#64748b;font-size:12.5px;font-weight:600;text-align:center;">📋 Ctrl+V để dán ảnh mới</span>'
                + '<input type="file" id="dgamProofFileInput" accept="image/*" style="display:none;">'
                + '<div id="dgamProofPreviewContainer" style="display:none;margin-top:8px;text-align:center;">'
                + '<img id="dgamProofPreview" style="max-height:150px;max-width:100%;border-radius:6px;margin-bottom:4px;">'
                + '<div id="dgamProofSize" style="font-size:11px;font-weight:700;color:#22c55e;"></div>'
                + '</div>'
                + '</div>'
                + '</div>';
            
            footerHTML = '<button class="btn btn-secondary" onclick="closeModal()">Hủy</button>'
                + '<button class="btn btn-primary" id="dgamSubmitProofBtn" onclick="_dgamSubmitReceivedProof(' + orderId + ')" style="width:auto;background:linear-gradient(135deg,#7e22ce,#6b21a8);border:none;">💾 Lưu thay đổi</button>';
        } else {
            bodyHTML = imgHtml + '<div style="text-align:center;font-size:12.5px;color:#64748b;font-weight:600;">Bạn không có quyền sửa đổi bằng chứng này</div>';
            footerHTML = '<button class="btn btn-secondary" onclick="closeModal()">Đóng</button>';
        }
    } else {
        bodyHTML = '<div style="display:flex;flex-direction:column;gap:12px;">'
            + '<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:12px;font-size:12.5px;color:#166534;font-weight:600;text-align:center;">'
            + '📸 Vui lòng cung cấp hình ảnh chứng minh mẫu áo đã về xưởng.'
            + '</div>'
            + '<div id="dgamProofPasteZone" tabindex="0" style="border:2.5px dashed #cbd5e1;border-radius:10px;min-height:160px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#f8fafc;outline:none;position:relative;padding:12px;">'
            + '<span id="dgamProofHint" style="color:#64748b;font-size:12.5px;font-weight:600;text-align:center;">📋 Ctrl+V để dán ảnh mới</span>'
            + '<input type="file" id="dgamProofFileInput" accept="image/*" style="display:none;">'
            + '<div id="dgamProofPreviewContainer" style="display:none;margin-top:8px;text-align:center;">'
            + '<img id="dgamProofPreview" style="max-height:180px;max-width:100%;border-radius:6px;margin-bottom:4px;">'
            + '<div id="dgamProofSize" style="font-size:11px;font-weight:700;color:#22c55e;"></div>'
            + '</div>'
            + '</div>'
            + '</div>';
        
        footerHTML = '<button class="btn btn-secondary" onclick="closeModal()">Hủy</button>'
            + '<button class="btn btn-primary" id="dgamSubmitProofBtn" onclick="_dgamSubmitReceivedProof(' + orderId + ')" style="width:auto;background:linear-gradient(135deg,#7e22ce,#6b21a8);border:none;" disabled>✅ Xác Nhận</button>';
    }
    
    openModal('📸 Bằng Chứng Mẫu Áo Đã Về', bodyHTML, footerHTML);
    
    // Attach event listeners after DOM render
    setTimeout(function() {
        var zone = document.getElementById('dgamProofPasteZone');
        var fileInput = document.getElementById('dgamProofFileInput');
        var selectLink = document.getElementById('dgamSelectFileLink');
        if (zone && fileInput) {
            if (selectLink) {
                selectLink.addEventListener('click', function(e) {
                    e.stopPropagation();
                    fileInput.click();
                });
            }
            fileInput.addEventListener('change', function(e) {
                if (e.target.files && e.target.files[0]) {
                    _dgamHandleProofFile(e.target.files[0]);
                }
            });
            zone.addEventListener('paste', function(e) {
                var items = (e.clipboardData || e.originalEvent?.clipboardData)?.items;
                if (!items) return;
                for (var i = 0; i < items.length; i++) {
                    if (items[i].type.indexOf('image') !== -1) {
                        e.preventDefault();
                        var file = items[i].getAsFile();
                        _dgamHandleProofFile(file);
                        return;
                    }
                }
            });
            
            // Add global paste event listener that checks if the zone exists
            if (window._dgamGlobalPasteHandler) {
                document.removeEventListener('paste', window._dgamGlobalPasteHandler);
            }
            window._dgamGlobalPasteHandler = function(ev) {
                var currentZone = document.getElementById('dgamProofPasteZone');
                if (!currentZone) {
                    document.removeEventListener('paste', window._dgamGlobalPasteHandler);
                    window._dgamGlobalPasteHandler = null;
                    return;
                }
                var items = (ev.clipboardData || ev.originalEvent?.clipboardData)?.items;
                if (!items) return;
                for (var i = 0; i < items.length; i++) {
                    if (items[i].type.indexOf('image') !== -1) {
                        ev.preventDefault();
                        var file = items[i].getAsFile();
                        _dgamHandleProofFile(file);
                        return;
                    }
                }
            };
            document.addEventListener('paste', window._dgamGlobalPasteHandler);
            
            zone.focus();
        }
    }, 200);
}

async function _dgamSubmitReceivedProof(id) {
    if (!_dgamCompressedBlob) {
        showToast('Vui lòng chọn hoặc dán hình ảnh!', 'error');
        return;
    }
    
    var submitBtn = document.getElementById('dgamSubmitProofBtn');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerText = 'Đang tải lên...';
    }
    
    try {
        var fd = new FormData();
        fd.append('file', _dgamCompressedBlob, 'proof_' + id + '_' + Date.now() + '.jpg');
        
        var res = await fetch('/api/don-gui-ao-mau/' + id + '/upload-received-proof', {
            method: 'POST',
            body: fd,
            credentials: 'include'
        });
        
        var data = await res.json();
        if (data.success) {
            showToast('✅ Đã cập nhật bằng chứng mẫu áo đã về thành công!');
            closeModal();
            _dgamCompressedBlob = null;
            await _dgamLoadOrders();
        } else {
            showToast(data.error || 'Lỗi khi tải lên', 'error');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerText = '✅ Xác Nhận';
            }
        }
    } catch(err) {
        showToast(err.message || 'Lỗi kết nối', 'error');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerText = '✅ Xác Nhận';
        }
    }
}

async function _dgamEditOrder(id) {
    try {
        const data = await apiCall(`/api/don-gui-ao-mau/${id}/detail`);
        if (!data || !data.order) {
            showToast('Không tìm thấy thông tin đơn mẫu', 'error');
            return;
        }
        const o = data.order;
        
        // Open the modal passing the order to be edited
        await _dgamShowAdd(o);
        
        // Select this order in the dropdown:
        const draftSelect = document.getElementById('dgamAddDraftSelect');
        if (draftSelect) {
            draftSelect.value = o.id;
            _dgamOnDraftSelect(); // Populate fields
            
            // Populate category select:
            const catSelect = document.getElementById('dgamAddCategory');
            if (catSelect) {
                catSelect.value = o.category || '';
                _dgamOnCategoryChange();
                
                // Populate dynamic fields:
                const lvSelect = document.getElementById('dgamAddLinhVuc');
                if (lvSelect) lvSelect.value = o.linh_vuc || '';
                
                const prodInput = document.getElementById('dgamAddProductName');
                if (prodInput) prodInput.value = o.product_name || '';
                
                const qtyInput = document.getElementById('dgamAddQuantity');
                if (qtyInput) qtyInput.value = o.quantity || '';
                
                const priceInput = document.getElementById('dgamAddPrice');
                if (priceInput) priceInput.value = o.price ? o.price.toLocaleString('vi-VN') : '';
                
                if (o.sample_image) {
                    _dgam.sampleImgBase64 = o.sample_image;
                    _dgamShowSampleImgPreview(o.sample_image);
                }
                
                const shipDateInput = document.getElementById('dgamAddShipDate');
                if (shipDateInput) shipDateInput.value = o.ship_date ? o.ship_date.slice(0, 10) : '';
                
                const prioritySelect = document.getElementById('dgamAddShippingPriority');
                if (prioritySelect) {
                    prioritySelect.value = o.shipping_priority || 'CHUẨN';
                    _dgamOnShippingPriorityChange();
                    
                    if (o.shipping_priority === 'CHUẨN' && o.ship_time) {
                        const parts = o.ship_time.split(':');
                        const hr = parts[0];
                        const min = parts[1];
                        const hrInput = document.getElementById('dgamAddShipHour');
                        const minInput = document.getElementById('dgamAddShipMinute');
                        if (hrInput) hrInput.value = hr;
                        if (minInput) minInput.value = min;
                    }
                    
                    if (o.chuan_proof_image) {
                        _dgam.chuanProofImgBase64 = o.chuan_proof_image;
                        _dgamShowChuanProofImgPreview(o.chuan_proof_image);
                    }
                }
                
                const carrierSelect = document.getElementById('dgamAddCarrier');
                if (carrierSelect) carrierSelect.value = o.shipping_method || '';
                
                const saleNoteInput = document.getElementById('dgamAddSaleNote');
                if (saleNoteInput) saleNoteInput.value = o.sale_note_for_accountant || '';
                
                if (['Gửi mẫu áo', 'Gửi mẫu quần', 'Gửi mẫu váy'].includes(o.category)) {
                    _dgamCalcRemaining();
                }
            }
        }
    } catch (e) {
        console.error('Error opening edit order:', e);
        showToast('Có lỗi xảy ra khi chuẩn bị sửa đơn: ' + e.message, 'error');
    }
}

function _dgamShowSampleImgPreview(compressed) {
    const img = document.getElementById('dgamAddSampleImg');
    const ph = document.getElementById('dgamAddSampleImgPlaceholder');
    const btn = document.getElementById('dgamAddSampleImgDeleteBtn');
    if (img) { img.src = compressed; img.style.display = 'block'; }
    if (ph) ph.style.display = 'none';
    if (btn) btn.style.display = 'block';
    const zone = document.getElementById('dgamAddSampleImgZone');
    if (zone) { zone.style.borderColor = '#059669'; zone.style.background = '#f0fdf4'; }
}

function _dgamShowChuanProofImgPreview(compressed) {
    const img = document.getElementById('dgamChuanProofImg');
    const ph = document.getElementById('dgamChuanProofImgPlaceholder');
    const btn = document.getElementById('dgamChuanProofImgDeleteBtn');
    if (img) { img.src = compressed; img.style.display = 'block'; }
    if (ph) ph.style.display = 'none';
    if (btn) btn.style.display = 'block';
    const zone = document.getElementById('dgamChuanProofImgZone');
    if (zone) { zone.style.borderColor = '#059669'; zone.style.background = '#f0fdf4'; }
}


