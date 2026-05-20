// ========== ĐƠN HÀNG TỔNG — Bộ Phận Văn Phòng ==========
var _dht = { tree: [], categories: [], staff: [], orders: [], filter: {}, activeFilters: {} };
function _dhtFmt(n) { return Number(n||0).toLocaleString('vi-VN') + 'đ'; }

// ========== FILTER CHIPS ==========
var _dhtFilterDefs = [
    { key: 'vat',  label: 'VAT',         bg: '#fef3c7', color: '#92400e', activeBg: '#f59e0b', activeColor: '#fff' },
    { key: 'gg',   label: 'Giảm Giá',    bg: '#d1fae5', color: '#065f46', activeBg: '#059669', activeColor: '#fff' },
    { key: 'za',   label: 'Đã Zalo',     bg: '#dbeafe', color: '#1e40af', activeBg: '#2563eb', activeColor: '#fff' },
    { key: 'noza', label: 'Chưa Zalo',   bg: '#f1f5f9', color: '#64748b', activeBg: '#475569', activeColor: '#fff' },
    { key: 'loi',  label: 'Báo Lỗi',     bg: '#fee2e2', color: '#dc2626', activeBg: '#dc2626', activeColor: '#fff' },
    { key: 'sua',  label: 'Đã Sửa',      bg: '#ede9fe', color: '#6d28d9', activeBg: '#7c3aed', activeColor: '#fff' },
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
    _dhtRenderTable();
}

function _dhtClearFilters() {
    _dht.activeFilters = {};
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
    if (af.sua) filtered = filtered.filter(function(o){ return !!o.last_updated_by_name; });
    if (af.no) filtered = filtered.filter(function(o){ return (Number(o.remaining_amount) || 0) > 0; });
    _dhtRenderOrderRows(filtered);
}

async function renderDonhangtongPage(content) {
    if (!document.getElementById('dhtStyles')) {
        var st = document.createElement('style'); st.id = 'dhtStyles';
        st.textContent = '.dht-wrap{display:flex;height:calc(100vh - 60px);overflow:hidden}'
            +'.dht-sidebar{width:270px;min-width:270px;background:#fff;border-right:1px solid var(--gray-200);overflow-y:auto;position:relative}'
            +'.dht-main{flex:1;min-width:0;display:flex;flex-direction:column;overflow-y:auto;padding:16px}'
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
            +'.dht-sb-day:hover{background:#fffdf5}.dht-sb-day.active{background:#fef9c3;font-weight:700}';
        document.head.appendChild(st);
    }
    const [catRes, staffRes] = await Promise.all([apiCall('/api/dht/categories'), apiCall('/api/dht/staff')]);
    _dht.categories = catRes.categories || [];
    _dht.staff = staffRes.staff || [];
    content.innerHTML = '<div class="dht-wrap"><div class="dht-sidebar" id="dhtSidebar"><div style="padding:20px;text-align:center;color:var(--gray-400);font-size:12px">Đang tải...</div></div><div class="dht-main"><div style="display:flex;gap:10px;margin-bottom:8px;flex-wrap:wrap;align-items:center"><input type="text" id="dhtSearch" class="form-control" placeholder="🔍 Tìm mã đơn, tên, SĐT..." style="width:auto;min-width:220px"><button class="btn btn-secondary" onclick="_dhtExport()" style="font-size:12px;padding:5px 12px">📥 Xuất File</button><div style="margin-left:auto;font-size:12px;color:var(--gray-400)" id="dhtFilterInfo"></div><div style="display:flex;align-items:center;gap:12px"><div id="dhtNextCode" style="font-size:11px;color:#94a3b8">⏳ Đang tải mã đơn...</div><button class="btn" id="dhtCreateBtn" onclick="_dhtShowCreate()" style="font-size:13px;padding:8px 20px;background:linear-gradient(135deg,#b8860b,#daa520);color:#fff;border:none;border-radius:8px;font-weight:800;cursor:pointer">➕ Tạo Đơn</button></div></div>'
        +'<div id="dhtFilterChips" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px"></div>'
        +'<div class="card"><div class="card-body" style="overflow-x:auto;padding:8px"><table class="table" style="font-size:12px;white-space:nowrap" id="dhtTable"><thead><tr style="background:var(--gray-800)"><th>Ngày LĐ</th><th>🏍️</th><th>Còn Lại</th><th>Mã Đơn</th><th>Nguồn</th><th>Tên Khách</th><th>SĐT</th><th>CSKH</th><th>Thành Phố</th><th>Tổng SL</th><th>Ưu Đãi</th><th>Đặt Cọc</th><th>TC Gửi</th><th>Ngày Gửi</th><th>Lịch Sử CN</th><th></th></tr></thead><tbody id="dhtTbody"><tr><td colspan="16" style="text-align:center;padding:40px">⏳</td></tr></tbody></table></div></div></div></div>';
    let _st; document.getElementById('dhtSearch').addEventListener('input', () => { clearTimeout(_st); _st = setTimeout(() => _dhtLoadOrders(), 400); });
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
            el.innerHTML = '📋 <span style="background:linear-gradient(135deg,#b8860b,#daa520);color:#fff;padding:3px 14px;border-radius:6px;font-size:13px;font-weight:900">' + count + ' mã đơn chờ tạo</span>';
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
    var sb = document.getElementById('dhtSidebar'); if (!sb) return;
    var curYear = new Date().getFullYear();
    // Default: current year open
    if (!_dhtOpen._init) { _dhtOpen['y'+curYear] = true; _dhtOpen._init = true; }

    var h = '<div class="dht-sb-title"><span style="color:var(--navy)">───</span> <span style="color:#b8860b;font-weight:900">✨ Đơn hàng tổng ✨</span> <span style="color:var(--navy)">───</span></div>';
    h += '<div class="dht-sb-total" onclick="_dhtFilterOnly({})"><span>▼ Tổng Doanh Số</span><span>'+_dhtFmt(data.grandTotal||0)+'</span></div>';
    var years = _dht.tree.length > 0 ? _dht.tree : [{year:curYear,total:0,count:0,categories:[]}];
    years.forEach(function(yr) {
        var yKey = 'y'+yr.year;
        var yOpen = !!_dhtOpen[yKey];
        h += '<div class="dht-sb-year" onclick="_dhtToggleKey(\''+yKey+'\')"><span>'+(yOpen?'▼':'▶')+' Năm '+yr.year+'</span><span style="background:linear-gradient(135deg,#ffd700,#daa520);color:#fff;padding:2px 10px;border-radius:10px;font-size:10px">'+_dhtFmt(yr.total)+'</span></div>';
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
            h += '<div class="dht-sb-cat'+(cActive?' active':'')+'" onclick="_dhtToggleKey(\''+cKey+'\','+yr.year+','+cat.id+')"><span>'+(cOpen?'▼':'▶')+' 🏷️ '+cat.name+'</span><span style="color:#b8860b;font-weight:800">'+_dhtFmt(cat.total)+'</span></div>';
            h += '<div style="display:'+(cOpen?'block':'none')+'">';
            for(var mi=12;mi>=1;mi--){
                var mData=(cat.months||[]).find(function(m){return m.month===mi;});
                var mTotal=mData?mData.total:0;
                var mActive=_dht.filter.year==yr.year&&_dht.filter.category_id==cat.id&&_dht.filter.month==mi;
                h += '<div class="dht-sb-month'+(mActive?' active':'')+'" onclick="event.stopPropagation();_dhtFilterOnly({year:'+yr.year+',category_id:'+cat.id+',month:'+mi+'})"><span>▸ Tháng '+String(mi).padStart(2,'0')+'</span><span style="color:'+(mTotal>0?'#b8860b':'#999')+';font-weight:'+(mTotal>0?'800':'400')+'">'+_dhtFmt(mTotal)+'</span></div>';
            }
            h += '</div>';
        });
        h += '</div>';
    });
    var isGD = typeof currentUser!=='undefined'&&currentUser&&currentUser.role==='giam_doc';
    if(isGD){
        h += '<div style="padding:12px;border-top:1px solid var(--gray-200);display:flex;flex-direction:column;gap:6px">';
        h += '<button onclick="_dhtShowCatSetup()" style="background:linear-gradient(135deg,#b8860b,#daa520);color:#fff;border:none;padding:8px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer">⚙️ Quản Lý Lĩnh Vực</button>';
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

// ========== ORDERS TABLE ==========
async function _dhtLoadOrders() {
    const f = _dht.filter;
    let url = '/api/dht/orders?';
    if (f.year) url += `year=${f.year}&`;
    if (f.month) url += `month=${f.month}&`;
    if (f.day) url += `day=${f.day}&`;
    if (f.category_id) url += `category_id=${f.category_id}&`;
    const search = document.getElementById('dhtSearch')?.value;
    if (search) url += `search=${encodeURIComponent(search)}&`;

    const data = await apiCall(url);
    _dht.orders = data.orders || [];
    _dhtRenderTable();
}

function _dhtRenderOrderRows(filtered) {
    const tbody = document.getElementById('dhtTbody');
    if (!tbody) return;

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="16"><div class="empty-state"><div class="icon">📭</div><h3>Chưa có đơn hàng</h3></div></td></tr>';
        _dhtUpdateInfo(0); return;
    }

    const fmt = n => Number(n || 0).toLocaleString('vi-VN');
    const fmtD = d => { if (!d) return '—'; const dt = new Date(d); return `${dt.getDate()}/${dt.getMonth()+1}/${dt.getFullYear()}`; };

    tbody.innerHTML = filtered.map(o => {
        const remaining = Number(o.remaining_amount) || 0;
        const remColor = remaining > 0 ? 'var(--danger)' : 'var(--success)';
        const shipIcon = o.shipping_status === 'shipped' ? '🏍️' : '<span style="opacity:0.2;">🏍️</span>';
        const priColors = { 'GẤP': 'background:#dc2626;color:#fff;', 'GỬI': 'background:#2563eb;color:#fff;', 'CHUẨN': 'background:var(--gray-700);color:var(--gray-300);' };
        const priStyle = priColors[o.shipping_priority] || priColors['CHUẨN'];
        const lastUpdate = o.last_updated_at ? `${vnFormat(o.last_updated_at)}` : '—';
        const lastUser = o.last_updated_by_name ? `<br><span style="color:var(--info);font-size:10px;">${o.last_updated_by_name}</span>` : '';

        // Mini status badges
        let badges = '';
        const bStyle = 'display:inline-block;padding:1px 5px;border-radius:3px;font-size:8px;font-weight:800;letter-spacing:0.3px;line-height:14px;';
        if (o.has_vat) badges += `<span style="${bStyle}background:#fef3c7;color:#92400e;">VAT</span> `;
        if (Number(o.discount_amount) > 0) badges += `<span style="${bStyle}background:#d1fae5;color:#065f46;">GG</span> `;
        if (o.zalo_oa_sent) badges += `<span style="${bStyle}background:#dbeafe;color:#1e40af;">ZA</span> `;
        if (o.has_error) badges += `<span style="${bStyle}background:#fee2e2;color:#dc2626;">LỖI</span> `;
        if (o.last_updated_by_name) badges += `<span style="${bStyle}background:#ede9fe;color:#6d28d9;">SỬA</span> `;
        const badgeRow = badges ? `<div style="margin-top:2px;">${badges}</div>` : '';

        return `<tr data-id="${o.id}" onclick="_dhtShowDetail(${o.id})" style="cursor:pointer;" title="Xem chi tiết">
            <td>${fmtD(o.order_date)}</td>
            <td style="text-align:center;cursor:pointer;" onclick="event.stopPropagation();_dhtToggleShip(${o.id},'${o.shipping_status}')" title="Click để đổi">${shipIcon}</td>
            <td style="font-weight:700;color:${remColor};">${fmt(remaining)}</td>
            <td><strong style="color:${remaining > 0 ? '#c2410c' : '#0f766e'};">${o.order_code}</strong>${badgeRow}</td>
            <td>${o.source || '—'}</td>
            <td>${o.customer_name || '—'}</td>
            <td>${o.customer_phone ? '<a href="tel:'+o.customer_phone+'" style="color:var(--info);" onclick="event.stopPropagation()">'+o.customer_phone+'</a>' : '—'}</td>
            <td>${o.cskh_name || '—'}</td>
            <td>${o.province || '—'}</td>
            <td style="text-align:center;">${o.total_quantity || 0}</td>
            <td style="color:var(--warning);">${fmt(o.discount_amount)}</td>
            <td style="color:var(--success);">${fmt(o.deposit_amount)}</td>
            <td><span style="padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;${priStyle}">${o.shipping_priority || 'CHUẨN'}</span></td>
            <td>${fmtD(o.shipping_date)}</td>
            <td style="font-size:10px;">${lastUpdate}${lastUser}</td>
            <td>
                <button class="btn btn-sm" onclick="event.stopPropagation();_dhtEditOrderFull(${o.id})" title="Sửa">✏️</button>
                <button class="btn btn-sm" onclick="event.stopPropagation();_dhtDeleteOrder(${o.id})" title="Xóa" style="color:var(--danger);">🗑️</button>
            </td>
        </tr>`;
    }).join('');

    _dhtUpdateInfo(filtered.length);
}

function _dhtUpdateInfo(count) {
    const el = document.getElementById('dhtFilterInfo');
    if (!el) return;
    const parts = [];
    if (_dht.filter.year) parts.push('Năm ' + _dht.filter.year);
    if (_dht.filter.month) parts.push('T' + _dht.filter.month);
    if (_dht.filter.day) parts.push('Ngày ' + _dht.filter.day);
    el.textContent = (parts.length > 0 ? '🔍 ' + parts.join(' • ') + ' — ' : '') + count + ' đơn';
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
        const items = data.items || [];
        const payments = data.payments || [];
        const surcharges = data.surcharges || [];
        const fmt = n => Number(n || 0).toLocaleString('vi-VN');
        const fmtD = d => { if (!d) return '—'; const dt = new Date(d); return `${dt.getDate()}/${dt.getMonth()+1}/${dt.getFullYear()}`; };
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
        const priColors = { 'GẤP': '#dc2626', 'GỬI': '#2563eb', 'CHUẨN': '#059669' };
        const priColor = priColors[o.shipping_priority] || '#059669';
        const typeLabels = { thanh_toan: 'TT', dat_coc: 'Cọc', tt_sll: 'TT SLL', pending: '⏳ Chờ' };

        // ── Section 1: Action Buttons ──
        var actionsHTML = `<div style="background:linear-gradient(135deg,#f8fafc,#f1f5f9);border-radius:14px;padding:16px;display:flex;flex-wrap:wrap;gap:8px;justify-content:center;border:1px solid #e2e8f0;margin-bottom:16px">`;
        const actionBtns = [
            { icon: '✏️', label: 'Sửa đơn', color: '#3b82f6', bg: '#dbeafe', fn: `closeModal();_dhtEditOrderFull(${id})` },
            { icon: '🗑️', label: 'Xóa đơn', color: '#dc2626', bg: '#fee2e2', fn: `closeModal();_dhtDeleteOrder(${id})` },
            { icon: '🚨', label: 'Báo đơn lỗi', color: '#ea580c', bg: '#ffedd5', fn: `alert('Chức năng Báo Đơn Lỗi đang phát triển!')` },
            { icon: '🏷️', label: 'Giảm Giá', color: '#059669', bg: '#d1fae5', fn: `_dhtApplyDiscount(${id})` },
            { icon: o.zalo_oa_sent ? '✅' : '📱', label: o.zalo_oa_sent ? 'Đã Gửi Zalo OA' : 'Chưa Gửi Zalo OA', color: o.zalo_oa_sent ? '#059669' : '#94a3b8', bg: o.zalo_oa_sent ? '#d1fae5' : '#f1f5f9', fn: `alert('Chức năng Zalo OA sẽ được kết nối sau!')` },
            { icon: '🖨️', label: 'In Phiếu', color: '#7c3aed', bg: '#ede9fe', fn: `_dhtPrintOrder(${id})` },
        ];
        for (const a of actionBtns) {
            actionsHTML += `<div onclick="${a.fn}" style="text-align:center;cursor:pointer;padding:10px 14px;border-radius:12px;transition:all .15s;min-width:80px" onmouseover="this.style.background='${a.bg}'" onmouseout="this.style.background='transparent'">`;
            actionsHTML += `<div style="width:42px;height:42px;border-radius:50%;background:${a.bg};display:flex;align-items:center;justify-content:center;margin:0 auto 5px;font-size:18px">${a.icon}</div>`;
            actionsHTML += `<div style="font-size:10px;font-weight:700;color:${a.color}">${a.label}</div></div>`;
        }
        actionsHTML += `</div>`;

        // ── Section 2: Chi tiết đơn hàng (Items) ──
        // Store items globally for click-to-detail
        window._dhtDetailItems = items;
        var itemsHTML = '';
        if (items.length > 0) {
            itemsHTML = `<div style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;padding:16px;margin-bottom:16px">`;
            itemsHTML += `<div style="font-weight:800;font-size:14px;color:var(--navy);margin-bottom:12px">📦 Chi tiết đơn hàng <span style="background:var(--gold);color:#fff;padding:2px 8px;border-radius:10px;font-size:11px;margin-left:6px">${items.length}</span> <span style="font-size:11px;color:#94a3b8;font-weight:500;margin-left:4px">— Bấm vào dòng để xem chi tiết</span></div>`;
            itemsHTML += `<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px">`;
            itemsHTML += `<thead><tr style="background:var(--navy);color:#fff"><th style="padding:8px 10px;text-align:left;font-size:10px">LOẠI</th><th style="padding:8px 10px;text-align:left;font-size:10px">SẢN PHẨM</th><th style="padding:8px 10px;text-align:left;font-size:10px">VẢI - MÀU</th><th style="padding:8px 10px;text-align:center;font-size:10px">SỐ LƯỢNG</th><th style="padding:8px 10px;text-align:right;font-size:10px">ĐƠN GIÁ</th><th style="padding:8px 10px;text-align:center;font-size:10px">VAT</th><th style="padding:8px 10px;text-align:right;font-size:10px">THÀNH TIỀN</th></tr></thead><tbody>`;
            for (let idx = 0; idx < items.length; idx++) {
                const it = items[idx];
                const saleText = (it.sale_type || '').toLowerCase();
                const isBan = saleText === 'bán' || saleText === 'ban';
                const saleBadge = isBan ? '<span style="background:#059669;color:#fff;padding:2px 8px;border-radius:6px;font-size:10px;font-weight:700">Bán</span>' : '<span style="background:#f59e0b;color:#fff;padding:2px 8px;border-radius:6px;font-size:10px;font-weight:700">Quà</span>';
                const matColor = (it.material_name || '') + (it.color_name ? ' - ' + it.color_name : '');
                // Parse VAT from quantities
                let itVat = 0;
                try { const qs = typeof it.quantities === 'string' ? JSON.parse(it.quantities) : (it.quantities||[]); const base = qs.reduce((s,x)=>s+(Number(x.qty)||0)*(Number(x.price)||0),0); if(base>0 && Number(it.item_total)>base) itVat=Math.round((Number(it.item_total)-base)/base*100); } catch(e){}
                itemsHTML += `<tr style="border-bottom:1px solid #f1f5f9;cursor:pointer;transition:background .15s" onclick="_dhtShowItemDetail(${idx})" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background=''">`;
                itemsHTML += `<td style="padding:8px 10px">${saleBadge}</td>`;
                itemsHTML += `<td style="padding:8px 10px;font-weight:700;color:var(--navy)">${it.product_name || it.description || '—'} <span style="font-size:9px;color:#94a3b8">🔍</span></td>`;
                itemsHTML += `<td style="padding:8px 10px;color:#6366f1;font-weight:600">${matColor || '—'}</td>`;
                itemsHTML += `<td style="padding:8px 10px;text-align:center;font-weight:700">${it.quantity || 0}</td>`;
                itemsHTML += `<td style="padding:8px 10px;text-align:right">${fmt(it.unit_price)}đ</td>`;
                itemsHTML += `<td style="padding:8px 10px;text-align:center;font-weight:700;color:#6366f1">${itVat > 0 ? itVat+'%' : '0%'}</td>`;
                itemsHTML += `<td style="padding:8px 10px;text-align:right;font-weight:800;color:#dc2626">${fmt(it.item_total || it.total)}đ</td>`;
                itemsHTML += `</tr>`;
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
        const finRemaining = calcBase + surchargeTotal + vat - discount - deposit;
        const remColor = finRemaining > 0 ? '#dc2626' : '#059669';
        var finHTML = `<div style="background:linear-gradient(135deg,#fefce8,#fef9c3);border-radius:12px;border:1px solid #fde68a;padding:16px;margin-bottom:16px">`;
        finHTML += `<div style="font-weight:800;font-size:14px;color:#92400e;margin-bottom:12px">💰 Tổng kết tài chính</div>`;
        const finRows = [
            ['Tổng tiền hàng', fmt(calcBase) + 'đ', '#1e293b', true],
            ['Phụ phí', fmt(surchargeTotal) + 'đ', '#f59e0b', false],
            ['VAT', fmt(vat) + 'đ', '#6366f1', false],
            ['Ưu đãi / Giảm giá', '-' + fmt(discount) + 'đ', '#059669', false],
            ['Đã thanh toán (cọc)', fmt(deposit) + 'đ', '#10b981', true],
            ['Còn lại', fmt(finRemaining) + 'đ', remColor, true],
        ];
        for (const [label, val, color, bold] of finRows) {
            finHTML += `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid rgba(0,0,0,0.05)">`;
            finHTML += `<span style="font-size:13px;color:#64748b;font-weight:${bold?700:500}">${label}</span>`;
            finHTML += `<span style="font-size:${bold?15:13}px;font-weight:${bold?900:700};color:${color}">${val}</span>`;
            finHTML += `</div>`;
        }
        finHTML += `</div>`;

        // ── Section 6: 📄 Thông tin đơn hàng ──
        const row = (label, val) => `<tr><td style="padding:8px 12px;font-size:12px;color:#64748b;font-weight:600;white-space:nowrap;vertical-align:top;width:160px">${label}</td><td style="padding:8px 12px;font-size:13px;font-weight:700;color:#1e293b;word-break:break-word">${val}</td></tr>`;
        // Parse reminders from items
        var allReminders = [];
        for (const it of items) { if(it.accounting_notes) allReminders.push(it.accounting_notes); }
        var reminderText = allReminders.length > 0 ? allReminders.join(' | ') : '—';

        var infoHTML = `<div style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;padding:16px;margin-bottom:16px">`;
        infoHTML += `<div style="font-weight:800;font-size:14px;color:var(--navy);margin-bottom:12px">📄 Thông tin đơn hàng</div>`;
        infoHTML += `<table style="width:100%;border-collapse:collapse">`;
        infoHTML += row('Khách hàng', `<strong>${o.customer_name || '—'}</strong>`);
        infoHTML += row('SĐT', o.customer_phone ? `<a href="tel:${o.customer_phone}" style="color:var(--info)">${o.customer_phone}</a>` : '—');
        infoHTML += row('CSKH', o.cskh_name || '—');
        infoHTML += row('Thiết kế', o.designer_name || (o.designer_type === 'old_design' ? '🎨 Thiết Kế Cũ' : '—'));
        infoHTML += row('Địa chỉ', o.address || '—');
        infoHTML += row('Tỉnh / TP', o.province || '—');
        infoHTML += row('Nguồn', o.source || '—');
        infoHTML += row('Lĩnh vực', o.category_name || '—');
        infoHTML += row('TC gửi', `<span style="color:${priColor};font-weight:900">${o.shipping_priority || 'CHUẨN'}</span>`);
        if (o.standard_proof_image) infoHTML += row('Ảnh TC', `<a href="${o.standard_proof_image}" target="_blank" style="color:var(--info)">📷 Xem ảnh</a>`);
        infoHTML += row('Nhắc nhở', reminderText);
        infoHTML += row('Ngày lên đơn', fmtD(o.order_date));
        infoHTML += row('Ngày gửi dự kiến', fmtD(o.expected_ship_date));
        infoHTML += row('Vận Chuyển Đề Xuất', o.carrier_name || '—');
        infoHTML += `</table></div>`;

        // ── Section 7: 🚚 Thông tin vận chuyển ──
        var shipHTML = `<div style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;padding:16px;margin-bottom:16px">`;
        shipHTML += `<div style="font-weight:800;font-size:14px;color:var(--navy);margin-bottom:12px">🚚 Thông tin vận chuyển</div>`;
        shipHTML += `<table style="width:100%;border-collapse:collapse">`;
        shipHTML += row('Ngày giờ gửi hàng', o.actual_ship_datetime ? vnFormat(o.actual_ship_datetime) : '<span style="color:#94a3b8;font-style:italic">Chưa cập nhật</span>');
        shipHTML += row('Vận Chuyển Thực Tế', o.actual_carrier_name || '<span style="color:#94a3b8;font-style:italic">Chưa cập nhật</span>');
        shipHTML += row('Mã vận đơn', o.tracking_code || '<span style="color:#94a3b8;font-style:italic">Chưa cập nhật</span>');
        shipHTML += row('Bill gửi hàng', o.shipping_bill_image ? `<a href="${o.shipping_bill_image}" target="_blank" style="color:var(--info)">📷 Xem bill</a>` : '<span style="color:#94a3b8;font-style:italic">Chưa cập nhật</span>');
        // Delivery progress
        var progressText = '<span style="color:#94a3b8;font-style:italic">Chưa cập nhật</span>';
        if (o.delivery_progress) {
            if (o.delivery_progress === 'ontime') progressText = '<span style="color:#059669;font-weight:900">✅ Đúng ngày</span>';
            else if (o.delivery_progress.startsWith('early_')) progressText = '<span style="color:#2563eb;font-weight:900">🚀 Nhanh hơn ' + o.delivery_progress.replace('early_','') + ' ngày</span>';
            else if (o.delivery_progress.startsWith('late_')) progressText = '<span style="color:#dc2626;font-weight:900">⚠️ Chậm hơn ' + o.delivery_progress.replace('late_','') + ' ngày</span>';
            else progressText = o.delivery_progress;
        }
        shipHTML += row('Tình trạng tiến độ', progressText);
        shipHTML += `</table></div>`;

        // ── Section 8: ⚠️ Đơn Lỗi ──
        var errorHTML = `<div style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;padding:16px;margin-bottom:16px">`;
        errorHTML += `<div style="font-weight:800;font-size:14px;color:var(--navy);margin-bottom:12px">⚠️ Đơn Lỗi</div>`;
        errorHTML += `<div style="text-align:center;padding:12px;color:#94a3b8;font-size:13px;font-style:italic">Chưa có thông tin đơn lỗi</div>`;
        errorHTML += `</div>`;

        // ── Section 9: 📝 Lịch sử cập nhật ──
        var histHTML = `<div style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;padding:16px;margin-bottom:16px">`;
        histHTML += `<div style="font-weight:800;font-size:14px;color:var(--navy);margin-bottom:12px">📝 Lịch sử cập nhật</div>`;
        if (o.created_at) histHTML += `<div style="padding:8px 12px;border-left:3px solid #059669;margin-bottom:8px;background:#f0fdf4;border-radius:0 8px 8px 0"><div style="font-size:11px;color:#64748b">${vnFormat(o.created_at)}</div><div style="font-size:13px;font-weight:700;color:#1e293b">👤 <span style="color:var(--info)">${o.created_by_name || '—'}</span> đã tạo đơn.</div></div>`;
        if (o.last_updated_at && o.last_updated_by_name) histHTML += `<div style="padding:8px 12px;border-left:3px solid #f59e0b;margin-bottom:8px;background:#fffbeb;border-radius:0 8px 8px 0"><div style="font-size:11px;color:#64748b">${vnFormat(o.last_updated_at)}</div><div style="font-size:13px;font-weight:700;color:#1e293b">👤 <span style="color:var(--info)">${o.last_updated_by_name}</span> đã cập nhật.</div></div>`;
        if (!o.created_at && !o.last_updated_at) histHTML += `<div style="text-align:center;padding:12px;color:#94a3b8;font-size:13px">Không có lịch sử</div>`;
        histHTML += `</div>`;

        // ── Combine all sections ──
        const bodyHTML = actionsHTML + itemsHTML + payHTML + surHTML + finHTML + infoHTML + shipHTML + errorHTML + histHTML;

        const titleText = `📦 ${o.order_code} — ${fmt(total)}đ`;
        const footerHTML = `<button class="btn btn-secondary" onclick="closeModal()" style="padding:10px 28px">Đóng</button>`;
        openModal(titleText, bodyHTML, footerHTML);

        // Widen modal
        setTimeout(() => {
            const mc = document.querySelector('.modal-content');
            if (mc) { mc.style.maxWidth = '780px'; mc.style.width = '92vw'; }
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
            <div class="form-group"><label>Thành Phố</label><input id="dhtEdProv" class="form-control" value="${o.province || ''}"></div>
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

        html += `<div style="margin-bottom:14px"><div style="font-weight:800;font-size:13px;color:var(--navy);margin-bottom:8px">✂️ Kỹ thuật may (${techniques.length + 1})</div>`;
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

// ========== APPLY DISCOUNT ==========
async function _dhtApplyDiscount(orderId) {
    const input = prompt('Nhập số tiền giảm giá (VNĐ):');
    if (input === null) return;
    const amount = Number(input.replace(/[.,\s]/g, ''));
    if (isNaN(amount) || amount < 0) return alert('Số tiền không hợp lệ!');
    try {
        const res = await fetch(`/api/dht/orders/${orderId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ discount_amount: amount })
        });
        if (!res.ok) throw new Error('Lỗi cập nhật');
        alert('✅ Đã cập nhật giảm giá: ' + amount.toLocaleString('vi-VN') + 'đ');
        closeModal();
        // Reload detail
        const row = document.querySelector(`tr[data-dht-id="${orderId}"]`);
        if (row) row.click();
    } catch(e) { alert('❌ ' + e.message); }
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
        const deposit = Number(d.deposit) || 0;
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
