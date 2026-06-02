// ========== KHO VẢI — Fabric Warehouse Frontend ==========
var _kv = { tree: [], summary: [], filter: {}, selectedWid: null, selectedMid: null, searchText: '', sortCol: '', sortDir: 'desc' };

function _kvFmt(n) { return Number(n||0).toLocaleString('vi-VN'); }

async function renderKhovaiPage(content) {
    if (!document.getElementById('kvStyles')) {
        var st = document.createElement('style'); st.id = 'kvStyles';
        st.textContent = [
            '.kv-wrap{display:flex;height:calc(100vh - 60px);overflow:hidden}',
            '.kv-sidebar{width:270px;min-width:270px;background:#fff;border-right:1px solid var(--gray-200);overflow-y:auto;display:flex;flex-direction:column}',
            '.kv-main{flex:1;min-width:0;display:flex;flex-direction:column;overflow-y:auto;padding:16px}',
            '.kv-toolbar{display:flex;align-items:center;gap:8px;padding:10px 16px;background:linear-gradient(135deg,#0d9488,#0f766e);color:#fff;border-radius:10px;margin-bottom:12px;flex-wrap:wrap}',
            '.kv-table-wrap{overflow-x:auto}',
            '.kv-table{width:100%;border-collapse:collapse;font-size:12px}',
            '.kv-table th{padding:8px 10px;text-align:left;font-weight:700;font-size:10px;text-transform:uppercase;color:var(--gray-400);background:var(--gray-100);border-bottom:2px solid var(--gray-200);white-space:nowrap}',
            '.kv-table td{padding:8px 10px;border-bottom:1px solid var(--gray-100);vertical-align:middle}',
            '.kv-table tr:hover{background:#f0fdfa}',
            '.kv-sb-title{font-size:13px;font-weight:800;color:#0d9488;padding:16px;border-bottom:1px solid var(--gray-200);text-align:center;display:flex;align-items:center;justify-content:space-between}',
            '.kv-sb-total{background:linear-gradient(135deg,#0d9488,#14b8a6);color:#fff;padding:12px 16px;font-size:13px;font-weight:800;display:flex;justify-content:space-between;cursor:pointer}',
            '.kv-sb-wh{padding:8px 16px;font-weight:800;font-size:12px;color:#0d9488;cursor:pointer;display:flex;justify-content:space-between;align-items:center;background:#f0fdfa;border-bottom:1px solid var(--gray-200)}',
            '.kv-sb-wh:hover{background:#ccfbf1}',
            '.kv-sb-mat{padding:6px 16px 6px 32px;font-size:11px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #f8fafc}',
            '.kv-sb-mat:hover{background:#f0fdfa}',
            '.kv-sb-mat.active{background:#ccfbf1;font-weight:700}',
            '.kv-sb-wh.active{background:#99f6e4}',
            '.kv-badge-nhap{background:#059669;color:#fff;padding:2px 8px;border-radius:4px;font-weight:800;font-size:10px}',
            '.kv-badge-xuat{background:#dc2626;color:#fff;padding:2px 8px;border-radius:4px;font-weight:800;font-size:10px}',
            '.kv-stat-card{background:rgba(255,255,255,0.95);border-radius:8px;padding:4px 14px;text-align:center;min-width:100px;box-shadow:0 2px 8px rgba(0,0,0,0.15)}',
            '.kv-stat-label{font-size:9px;font-weight:700;color:#0d9488;letter-spacing:1px;margin-bottom:2px}',
            '.kv-stat-val{font-size:13px;font-weight:900}',
            '@media(max-width:768px){.kv-sidebar{width:220px;min-width:220px}.kv-table{font-size:11px}}',
            '#kvSearchInput::placeholder{color:rgba(255,255,255,0.7)}',
            '#kvSbSearch{width:100%;padding:7px 10px;border:1px solid #99f6e4;border-radius:6px;font-size:11px;outline:none;background:#f0fdfa;box-sizing:border-box}',
            '#kvSbSearch:focus{border-color:#0d9488;box-shadow:0 0 0 2px rgba(13,148,136,0.15)}'
        ].join('');
        document.head.appendChild(st);
    }

    content.innerHTML = '<div class="kv-wrap"><div class="kv-sidebar" id="kvSidebar"><div style="padding:20px;text-align:center;color:var(--gray-400);font-size:12px">Đang tải...</div></div><div class="kv-main"><div class="kv-toolbar" id="kvToolbar"></div><div class="kv-table-wrap" id="kvTableWrap"></div></div></div>';

    try {
        var treeData = await apiCall('/api/khovai/tree');
        _kv.tree = treeData.tree || [];
    } catch(e) { _kv.tree = []; }

    _kv.filter = {}; _kv.selectedWid = null; _kv.selectedMid = null;
    _kvRenderSidebar();
    await _kvLoadSummary();
}

// ========== SIDEBAR ==========
function _kvRenderSidebar() {
    var sb = document.getElementById('kvSidebar'); if (!sb) return;
    var isGD = typeof currentUser !== 'undefined' && currentUser && ['giam_doc','quan_ly_cap_cao'].includes(currentUser.role);
    var h = '<div class="kv-sb-title"><span>🏬 Kho Vải</span>' + (isGD ? '<span onclick="navigate(\'caidatkhovai\')" style="cursor:pointer;font-size:16px" title="Cài đặt">⚙️</span>' : '') + '</div>';
    h += '<div style="padding:8px 12px"><input type="text" id="kvSbSearch" placeholder="🔍 Tìm chất liệu, kho..." oninput="_kvSbFilter(this.value)" /></div>';

    var totalBal = 0;
    _kv.tree.forEach(function(w) { totalBal += Number(w.total_balance || 0); });
    h += '<div class="kv-sb-total" onclick="_kvFilterAll()"><span>📦 Tất cả kho</span><span>' + _kvFmt(totalBal) + '</span></div>';

    _kv.tree.forEach(function(w) {
        var isActiveW = _kv.selectedWid === w.id && !_kv.selectedMid;
        h += '<div class="kv-sb-wh' + (isActiveW ? ' active' : '') + '" onclick="_kvFilterWh(' + w.id + ')" data-wid="' + w.id + '">';
        h += '<span>🏭 ' + w.name + ' (' + (w.unit||'kg') + ')</span>';
        h += '<span style="background:rgba(0,0,0,0.08);padding:2px 8px;border-radius:10px;font-size:10px">' + _kvFmt(w.total_balance) + '</span></div>';

        var mats = w.materials || [];
        h += '<div class="kv-wh-mats" data-wid="' + w.id + '">';
        mats.forEach(function(m) {
            var isActiveM = _kv.selectedMid === m.id;
            h += '<div class="kv-sb-mat' + (isActiveM ? ' active' : '') + '" onclick="_kvFilterMat(' + w.id + ',' + m.id + ')">';
            h += '<span>🧵 ' + m.name + '</span>';
            h += '<span style="color:' + (Number(m.total_balance) >= 0 ? '#059669' : '#dc2626') + ';font-weight:700">' + _kvFmt(m.total_balance) + '</span></div>';
        });
        h += '</div>';
    });
    sb.innerHTML = h;
}

var _kvSbFilterText = '';
function _kvSbFilter(val) {
    _kvSbFilterText = (val || '').toLowerCase().trim();
    var items = document.querySelectorAll('.kv-sb-wh, .kv-wh-mats');
    _kv.tree.forEach(function(w) {
        var whEl = document.querySelector('[data-wid="' + w.id + '"].kv-sb-wh');
        var matsEl = document.querySelector('.kv-wh-mats[data-wid="' + w.id + '"]');
        if (!whEl || !matsEl) return;
        if (!_kvSbFilterText) { whEl.style.display = ''; matsEl.style.display = ''; var matItems = matsEl.querySelectorAll('.kv-sb-mat'); for(var i=0;i<matItems.length;i++) matItems[i].style.display=''; return; }
        var whMatch = w.name.toLowerCase().indexOf(_kvSbFilterText) >= 0;
        var anyMatMatch = false;
        var mats = w.materials || [];
        var matItems = matsEl.querySelectorAll('.kv-sb-mat');
        mats.forEach(function(m, idx) {
            var matMatch = m.name.toLowerCase().indexOf(_kvSbFilterText) >= 0;
            if (matMatch) anyMatMatch = true;
            if (matItems[idx]) matItems[idx].style.display = (whMatch || matMatch) ? '' : 'none';
        });
        whEl.style.display = (whMatch || anyMatMatch) ? '' : 'none';
        matsEl.style.display = (whMatch || anyMatMatch) ? '' : 'none';
    });
}

function _kvFilterAll() { _kv.selectedWid = null; _kv.selectedMid = null; _kv.filter = {}; _kvLoadSummary(); _kvRenderSidebar(); }
function _kvFilterWh(wid) { _kv.selectedWid = wid; _kv.selectedMid = null; _kv.filter = { wid: wid }; _kvLoadSummary(); _kvRenderSidebar(); }
function _kvFilterMat(wid, mid) { _kv.selectedWid = wid; _kv.selectedMid = mid; _kv.filter = { wid: wid, mid: mid }; _kvLoadSummary(); _kvRenderSidebar(); }

// ========== LOAD SUMMARY ==========
async function _kvLoadSummary() {
    var p = '';
    if (_kv.filter.wid) p += (p ? '&' : '?') + 'wid=' + _kv.filter.wid;
    if (_kv.filter.mid) p += (p ? '&' : '?') + 'mid=' + _kv.filter.mid;
    try {
        var data = await apiCall('/api/khovai/summary' + p);
        _kv.summary = data.summary || [];
    } catch(e) { _kv.summary = []; }
    _kvRenderToolbar();
    _kvRenderTable();
}

// ========== TOOLBAR ==========
function _kvRenderToolbar() {
    var tb = document.getElementById('kvToolbar'); if (!tb) return;
    var ft = 'Tất cả kho';
    if (_kv.selectedMid) {
        var mat = null;
        _kv.tree.forEach(function(w) { (w.materials||[]).forEach(function(m) { if (m.id === _kv.selectedMid) mat = m; }); });
        ft = mat ? mat.name : 'Chất liệu #' + _kv.selectedMid;
    } else if (_kv.selectedWid) {
        var wh = _kv.tree.find(function(w) { return w.id === _kv.selectedWid; });
        ft = wh ? wh.name : 'Kho #' + _kv.selectedWid;
    }

    var tNhap = 0, tXuat = 0, tCuoi = 0;
    _kv.summary.forEach(function(r) { tNhap += Number(r.dau_ky||0); tXuat += Number(r.xuat||0); tCuoi += Number(r.cuoi_ky||0); });

    tb.innerHTML = '<span style="font-weight:800;font-size:13px">🏬 ' + ft + '</span>'
        + '<input type="text" id="kvSearchInput" placeholder="🔍 Tìm màu, chất liệu..." value="' + (_kv.searchText||'').replace(/"/g,'&quot;') + '" oninput="_kvOnSearch(this.value)" style="margin-left:12px;padding:6px 12px;border-radius:6px;border:1px solid rgba(255,255,255,0.3);background:rgba(255,255,255,0.15);color:#fff;font-size:12px;width:200px;outline:none" />'
        + '<span style="flex:1"></span>'
        + '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">'
        + '<div class="kv-stat-card"><div class="kv-stat-label">NHẬP</div><div class="kv-stat-val" style="color:#059669">' + _kvFmt(tNhap) + '</div></div>'
        + '<div class="kv-stat-card"><div class="kv-stat-label">XUẤT</div><div class="kv-stat-val" style="color:#dc2626">' + _kvFmt(tXuat) + '</div></div>'
        + '<div class="kv-stat-card"><div class="kv-stat-label">TỒN KHO</div><div class="kv-stat-val" style="color:' + (tCuoi >= 0 ? '#0d9488' : '#dc2626') + '">' + _kvFmt(tCuoi) + '</div></div>'
        + '</div>';
}

function _kvOnSearch(val) {
    _kv.searchText = val;
    _kvRenderTable();
}

// ========== TABLE ==========
function _kvSort(col) {
    if (_kv.sortCol === col) { _kv.sortDir = _kv.sortDir === 'asc' ? 'desc' : 'asc'; }
    else { _kv.sortCol = col; _kv.sortDir = 'desc'; }
    _kvRenderTable();
}
function _kvRenderTable() {
    var wrap = document.getElementById('kvTableWrap'); if (!wrap) return;
    var sorted = _kv.summary.slice();

    // Custom column sort or default by last_update
    if (_kv.sortCol) {
        var col = _kv.sortCol;
        var dir = _kv.sortDir === 'asc' ? 1 : -1;
        sorted.sort(function(a, b) {
            var av = Number(a[col]||0), bv = Number(b[col]||0);
            return (av - bv) * dir;
        });
    } else {
        sorted.sort(function(a, b) {
            var aTime = a.last_update && a.last_update.at ? new Date(a.last_update.at).getTime() : 0;
            var bTime = b.last_update && b.last_update.at ? new Date(b.last_update.at).getTime() : 0;
            return bTime - aTime;
        });
    }

    // Client-side search filter
    var searchKey = (_kv.searchText || '').toLowerCase().trim();
    if (searchKey) {
        sorted = sorted.filter(function(r) {
            return (r.color_name || '').toLowerCase().indexOf(searchKey) >= 0
                || (r.material_name || '').toLowerCase().indexOf(searchKey) >= 0;
        });
    }

    if (!sorted.length) {
        wrap.innerHTML = '<div style="text-align:center;padding:40px;color:var(--gray-400)"><div style="font-size:32px">\ud83d\udd0d</div><div style="margin-top:8px">' + (searchKey ? 'Kh\u00f4ng t\u00ecm th\u1ea5y "' + searchKey + '"' : 'Ch\u01b0a c\u00f3 d\u1eef li\u1ec7u kho v\u1ea3i') + '</div></div>';
        return;
    }
    // Sort icon helper
    function sIco(col) {
        if (_kv.sortCol !== col) return ' <span style="opacity:0.3;font-size:9px">\u25B2\u25BC</span>';
        return _kv.sortDir === 'asc' ? ' <span style="font-size:9px">\u25B2</span>' : ' <span style="font-size:9px">\u25BC</span>';
    }
    var thC = 'cursor:pointer;user-select:none';
    var h = '<table class="kv-table"><thead><tr>';
    h += '<th>#</th><th>T\u00ean V\u1ea3i</th><th>Ch\u1ea5t Li\u1ec7u</th><th>Kho</th><th>\u0110VT</th>';
    h += '<th style="text-align:right;' + thC + '" onclick="_kvSort(\'so_cuc\')">' + 'S\u1ed1 C\u1ee5c' + sIco('so_cuc') + '</th>';
    h += '<th style="text-align:right;' + thC + '" onclick="_kvSort(\'cay_nguyen\')">' + 'C\u00e2y Nguy\u00ean' + sIco('cay_nguyen') + '</th>';
    h += '<th style="text-align:right;' + thC + '" onclick="_kvSort(\'dau_ky\')">' + '\u0110\u1ea7u K\u1ef3' + sIco('dau_ky') + '</th>';
    h += '<th style="text-align:right;' + thC + '" onclick="_kvSort(\'xuat\')">' + 'Xu\u1ea5t' + sIco('xuat') + '</th>';
    h += '<th style="text-align:right;' + thC + '" onclick="_kvSort(\'cuoi_ky\')">' + 'Cu\u1ed1i K\u1ef3' + sIco('cuoi_ky') + '</th>';
    h += '<th style="text-align:right;' + thC + '" onclick="_kvSort(\'price\')">' + 'Gi\u00e1' + sIco('price') + '</th>';
    h += '<th>L\u1ecbch S\u1eed CN</th><th>Thao T\u00e1c</th></tr></thead><tbody>';

    sorted.forEach(function(r, i) {
        var cuoiColor = Number(r.cuoi_ky) >= 0 ? '#059669' : '#dc2626';
        var cayNguyenColor = Number(r.cay_nguyen) > 0 ? '#ea580c' : '#7c3aed';
        var lastUp = '';
        if (r.last_update && r.last_update.name) {
            var at = r.last_update.at ? new Date(r.last_update.at) : null;
            var ds = at ? (String(at.getDate()).padStart(2,'0') + '/' + String(at.getMonth()+1).padStart(2,'0') + ' ' + String(at.getHours()).padStart(2,'0') + ':' + String(at.getMinutes()).padStart(2,'0')) : '';
            lastUp = '<div style="color:#0d9488;font-weight:600;font-size:10px">' + ds + '</div><div style="color:#64748b;font-size:10px">' + r.last_update.name + '</div>';
        }

        // Build roll weights display: "Be - 5, 12, 20" with orange for nguyên
        var rwList = (r.roll_weights || []);
        var rwHtml = '';
        if (rwList.length) {
            var parts = rwList.map(function(rw) {
                var w = Number(rw.w), ow = Number(rw.ow);
                var isNguyen = (w === ow && w > 0);
                return isNguyen ? '<span style="color:#ea580c;font-weight:800">' + _kvFmt(w) + '</span>' : '<span>' + _kvFmt(w) + '</span>';
            });
            rwHtml = ' - ' + parts.join(', ');
        }

        h += '<tr style="cursor:pointer" onclick="_kvShowDetail(' + r.id + ')">';
        h += '<td style="color:var(--gray-400)">' + (i+1) + '</td>';
        h += '<td style="font-weight:700;color:#0d9488;text-decoration:underline">' + (r.color_name||'') + '<span style="font-size:11px;font-weight:600;color:#64748b">' + rwHtml + '</span></td>';
        h += '<td>' + (r.material_name||'') + '</td>';
        h += '<td style="font-size:10px;color:#64748b">' + (r.warehouse_name||'') + '</td>';
        h += '<td style="font-size:10px">' + (r.unit||'kg') + '</td>';
        h += '<td style="text-align:right;font-weight:700">' + (r.so_cuc||0) + '</td>';
        h += '<td style="text-align:right;font-weight:700;color:' + cayNguyenColor + '">' + (r.cay_nguyen||0) + '</td>';
        h += '<td style="text-align:right;font-weight:700;color:#059669">' + _kvFmt(r.dau_ky) + '</td>';
        h += '<td style="text-align:right;font-weight:700;color:#dc2626">' + _kvFmt(r.xuat) + '</td>';
        h += '<td style="text-align:right;font-weight:900;color:' + cuoiColor + '">' + _kvFmt(r.cuoi_ky) + '</td>';
        h += '<td style="text-align:right;font-size:11px">' + (r.price ? _kvFmt(r.price) + '\u0111' : '\u2014') + '</td>';
        h += '<td style="white-space:nowrap">' + (lastUp || '<span style="color:var(--gray-300)">\u2014</span>') + '</td>';
        h += '<td style="white-space:nowrap" onclick="event.stopPropagation()"><button onclick="_kvShowRolls(' + r.id + ')" style="background:#0d9488;color:#fff;border:none;padding:3px 8px;border-radius:4px;font-size:10px;cursor:pointer;font-weight:700" title="Xem c\u1ee5c v\u1ea3i">\ud83d\udce6</button> ';
        h += '<button onclick="_kvShowHistory(' + r.id + ')" style="background:#6366f1;color:#fff;border:none;padding:3px 8px;border-radius:4px;font-size:10px;cursor:pointer;font-weight:700" title="L\u1ecbch s\u1eed">\ud83d\udccb</button> ';
        h += '<button onclick="_kvShowTx(' + r.id + ')" style="background:#f59e0b;color:#fff;border:none;padding:3px 8px;border-radius:4px;font-size:10px;cursor:pointer;font-weight:700" title="Nh\u1eadp/Xu\u1ea5t">\u00b1</button></td>';
        h += '</tr>';
    });
    h += '</tbody></table>';
    wrap.innerHTML = h;
}

// ========== DETAIL MODAL ==========
async function _kvShowDetail(fcid) {
    var r = _kv.summary.find(function(x) { return x.id === fcid; });
    if (!r) return;
    var label = (r.material_name||'') + ' - ' + (r.color_name||'');
    var cuoiColor = Number(r.cuoi_ky) >= 0 ? '#059669' : '#dc2626';
    var lastUpStr = '—';
    if (r.last_update && r.last_update.at) {
        var at = new Date(r.last_update.at);
        lastUpStr = String(at.getDate()).padStart(2,'0') + '/' + String(at.getMonth()+1).padStart(2,'0') + '/' + at.getFullYear() + ' ' + String(at.getHours()).padStart(2,'0') + ':' + String(at.getMinutes()).padStart(2,'0') + ':' + String(at.getSeconds()).padStart(2,'0');
        if (r.last_update.name) lastUpStr += ' — ' + r.last_update.name;
    }

    // Part 1: Info card
    var body = '<div style="background:#f8fafc;border:1px solid var(--gray-200);border-radius:10px;padding:16px;margin-bottom:16px">';
    body += '<table style="width:100%;font-size:13px;border-collapse:collapse">';
    var infoRows = [
        ['LABEL', '<b style="color:#0d9488;font-size:14px">' + label + '</b>'],
        ['CHẤT LIỆU', r.material_name || ''],
        ['MÀU', r.color_name || ''],
        ['ĐƠN VỊ TÍNH', r.unit || 'kg'],
        ['SỐ CỤC', '<b>' + (r.so_cuc||0) + '</b>'],
        ['ĐẦU KỲ', '<b style="color:#059669">' + _kvFmt(r.dau_ky) + '</b>'],
        ['XUẤT', '<b style="color:#dc2626">' + _kvFmt(r.xuat) + '</b>'],
        ['CUỐI KỲ', '<b style="color:' + cuoiColor + ';font-size:16px">' + _kvFmt(r.cuoi_ky) + '</b>'],
        ['GIÁ', r.price ? _kvFmt(r.price) + 'đ' : '—'],
        ['CẬP NHẬT', lastUpStr]
    ];
    infoRows.forEach(function(row) {
        body += '<tr><td style="padding:6px 12px;color:#64748b;font-weight:700;font-size:11px;text-transform:uppercase;width:130px;border-bottom:1px solid var(--gray-100)">' + row[0] + '</td>';
        body += '<td style="padding:6px 12px;border-bottom:1px solid var(--gray-100)">' + row[1] + '</td></tr>';
    });
    body += '</table></div>';

    // Part 2: Rolls list (loading)
    body += '<div style="background:#f8fafc;border:1px solid var(--gray-200);border-radius:10px;padding:16px">';
    body += '<div style="font-weight:800;font-size:14px;margin-bottom:12px">📦 Các cục vải <span id="kvDetailRollCount" style="background:#0d9488;color:#fff;padding:2px 8px;border-radius:10px;font-size:11px">...</span></div>';
    body += '<div id="kvDetailRollsArea" style="color:var(--gray-400);text-align:center;padding:12px">Đang tải...</div>';
    body += '</div>';

    // Part 3: Completed rolls list (Về 0kg)
    body += '<div style="background:#f8fafc;border:1px solid var(--gray-200);border-radius:10px;padding:16px;margin-top:16px">';
    body += '<div style="font-weight:800;font-size:14px;margin-bottom:12px">✅ Các cây đã cắt xong <span id="kvCompletedRollCount" style="background:#64748b;color:#fff;padding:2px 8px;border-radius:10px;font-size:11px">...</span></div>';
    body += '<div id="kvCompletedRollsArea" style="color:var(--gray-400);text-align:center;padding:12px">Đang tải...</div>';
    body += '</div>';

    openModal('🧵 Chi tiết — ' + label, body, '<button class="btn btn-secondary" onclick="closeModal()">Đóng</button>');

    // Load completed rolls (Về 0kg)
    _kvLoadCompletedRolls(fcid, 1);

    // Fetch rolls async
    try {
        var data = await apiCall('/api/khovai/rolls?fcid=' + fcid);
        var rolls = data.rolls || [];
        var countEl = document.getElementById('kvDetailRollCount');
        var areaEl = document.getElementById('kvDetailRollsArea');
        if (countEl) countEl.textContent = rolls.length;
        if (!areaEl) return;

        if (!rolls.length) {
            areaEl.innerHTML = '<div style="text-align:center;padding:16px;color:var(--gray-400)">Chưa có cục vải nào</div>';
            return;
        }

        var totalWeight = 0;
        rolls.forEach(function(rl) { totalWeight += Number(rl.weight); });

        var rh = '<div style="margin-bottom:10px;font-size:12px;color:#64748b">Không cắt: <b style="color:#0d9488;font-size:14px">' + _kvFmt(totalWeight) + '</b> ' + (r.unit||'kg') + '</div>';
        rh += '<table style="width:100%;border-collapse:collapse;font-size:12px">';
        var thStyle = 'padding:8px 10px;text-align:left;font-size:10px;text-transform:uppercase;color:#fff;background:#1e293b';
        rh += '<thead><tr>';
        rh += '<th style="' + thStyle + ';border-radius:6px 0 0 0">#</th>';
        rh += '<th style="' + thStyle + '">Tên Vải</th>';
        rh += '<th style="' + thStyle + ';text-align:right">Nhập</th>';
        rh += '<th style="' + thStyle + ';text-align:right">Xuất</th>';
        rh += '<th style="' + thStyle + ';text-align:right">Tồn</th>';
        rh += '<th style="' + thStyle + '">Lịch Sử CN</th>';
        rh += '<th style="' + thStyle + ';border-radius:0 6px 0 0;text-align:center">Đang Cắt</th>';
        rh += '</tr></thead><tbody>';

        rolls.forEach(function(rl, idx) {
            var rlDate = rl.updated_at ? new Date(rl.updated_at) : (rl.created_at ? new Date(rl.created_at) : null);
            var rlDs = rlDate ? (String(rlDate.getDate()).padStart(2,'0') + '/' + String(rlDate.getMonth()+1).padStart(2,'0') + '/' + rlDate.getFullYear() + ' ' + String(rlDate.getHours()).padStart(2,'0') + ':' + String(rlDate.getMinutes()).padStart(2,'0')) : '\u2014';
            var origW = Number(rl.original_weight || rl.weight);
            var curW = Number(rl.weight);
            var xuatW = origW - curW;
            var cutLabel = rl.cutting_order_name ? ('✂️ ' + rl.cutting_order_name.split(' — ').slice(0,2).join(' — ')) : null;
            rh += '<tr style="border-bottom:1px solid var(--gray-100);cursor:pointer" onclick="_kvShowRollDetail(' + rl.id + ')">';
            rh += '<td style="padding:6px 8px;color:var(--gray-400)">' + (idx+1) + '</td>';
            rh += '<td style="padding:6px 8px;font-weight:600;color:#0d9488;text-decoration:underline">' + (r.color_name||'') + '</td>';
            rh += '<td style="padding:6px 8px;text-align:right;font-weight:700;color:#059669">' + _kvFmt(origW) + '</td>';
            rh += '<td style="padding:6px 8px;text-align:right;font-weight:700;color:#dc2626">' + _kvFmt(xuatW) + '</td>';
            rh += '<td style="padding:6px 8px;text-align:right;font-weight:800;color:#0d9488">' + _kvFmt(curW) + '</td>';
            rh += '<td style="padding:6px 8px;font-size:10px;color:#64748b">' + rlDs + '</td>';
            rh += '<td style="padding:6px 8px;text-align:center">' + (cutLabel ? '<span style="background:#dc2626;color:#fff;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700">' + cutLabel + '</span>' : '<span style="color:#94a3b8;font-size:10px">—</span>') + '</td>';
            rh += '</tr>';
        });
        rh += '</tbody></table>';
        areaEl.innerHTML = rh;
    } catch(e) {
        var areaEl = document.getElementById('kvDetailRollsArea');
        if (areaEl) areaEl.innerHTML = '<div style="color:#dc2626">Lỗi tải dữ liệu</div>';
    }
}

// ========== ROLL DETAIL MODAL ==========
async function _kvShowRollDetail(rollId) {
    try {
        var data = await apiCall('/api/khovai/rolls/' + rollId + '/detail');
        if (data.error) { showToast(data.error, 'error'); return; }
        var rl = data.roll;
        var cuts = data.cutHistory || [];

        var label = (rl.material_name||'') + ' - ' + (rl.color_name||'') + ' - ' + _kvFmt(rl.weight) + (rl.unit||'kg');
        var origW = Number(rl.original_weight || rl.weight);
        var curW = Number(rl.weight);
        var xuatW = origW - curW;
        var cuoiColor = curW > 0 ? '#059669' : '#dc2626';

        var upDate = rl.updated_at ? new Date(rl.updated_at) : (rl.created_at ? new Date(rl.created_at) : null);
        var upStr = upDate ? (String(upDate.getDate()).padStart(2,'0') + '/' + String(upDate.getMonth()+1).padStart(2,'0') + '/' + upDate.getFullYear() + ' ' + String(upDate.getHours()).padStart(2,'0') + ':' + String(upDate.getMinutes()).padStart(2,'0') + ':' + String(upDate.getSeconds()).padStart(2,'0')) : '\u2014';

        // Part 1: Info card
        var thS = 'padding:6px 12px;color:#64748b;font-weight:700;font-size:11px;text-transform:uppercase;width:160px;border-bottom:1px solid var(--gray-100)';
        var tdS = 'padding:6px 12px;border-bottom:1px solid var(--gray-100)';
        var body = '<div style="background:#f8fafc;border:1px solid var(--gray-200);border-radius:10px;padding:16px;margin-bottom:16px">';
        body += '<table style="width:100%;font-size:13px;border-collapse:collapse">';
        body += '<tr><td style="' + thS + '">T\u00caN C\u00c2Y V\u1ea2I</td><td style="' + tdS + '"><b style="color:#0d9488;font-size:14px">' + label + '</b></td></tr>';
        body += '<tr><td style="' + thS + '">ID CU\u1ed8N V\u1ea2I</td><td style="' + tdS + '"><code style="background:#e2e8f0;padding:2px 8px;border-radius:4px;font-weight:700;letter-spacing:1px">' + (rl.roll_code||'N/A') + '</code></td></tr>';
        body += '<tr><td style="' + thS + '">NH\u1eacP</td><td style="' + tdS + '"><b style="color:#059669">' + _kvFmt(origW) + '</b></td></tr>';
        body += '<tr><td style="' + thS + '">XU\u1ea4T</td><td style="' + tdS + '"><b style="color:#dc2626">' + _kvFmt(xuatW) + '</b></td></tr>';
        body += '<tr><td style="' + thS + '">T\u1ed2N</td><td style="' + tdS + '"><b style="color:' + cuoiColor + ';font-size:16px">' + _kvFmt(curW) + '</b></td></tr>';
        body += '<tr><td style="' + thS + '">HO\u00c0N</td><td style="' + tdS + '">' + (rl.is_returned ? '<span style="color:#f59e0b;font-weight:700">\u0110\u00e3 ho\u00e0n</span>' : '<span style="color:#64748b">Ch\u01b0a ho\u00e0n</span>') + '</td></tr>';
        body += '<tr><td style="' + thS + '">UPDATE TIME</td><td style="' + tdS + '">' + upStr + (rl.created_by_name ? ' \u2014 <b>' + rl.created_by_name + '</b>' : '') + '</td></tr>';
        var rlCutLabel = rl.cutting_order_name ? ('✂️ ' + rl.cutting_order_name.split(' — ').slice(0,2).join(' — ')) : null;
        body += '<tr><td style="' + thS + '">ĐANG CẮT</td><td style="' + tdS + '">' + (rlCutLabel ? '<span style="background:#dc2626;color:#fff;padding:2px 10px;border-radius:4px;font-size:11px;font-weight:700">' + rlCutLabel + '</span>' : '<span style="color:#94a3b8">—</span>') + '</td></tr>';
        body += '<tr><td style="' + thS + '">NG\u01af\u1edcI NH\u1eacP V\u1ea2I</td><td style="' + tdS + '">' + (rl.created_by_name || '\u2014') + '</td></tr>';
        
        var billLink = '<span style="color:var(--gray-400)">Chưa có</span>';
        if (rl.source_import_id) {
            billLink = '<a href="javascript:void(0)" onclick="_kvOpenImportBill(' + rl.source_import_id + ')" style="color:#7c3aed;font-weight:800;text-decoration:none;border-bottom:1.5px dashed #7c3aed">🧵 Xem Chi Tiết Bill Nhập Vải</a>';
        } else if (rl.receipt_image) {
            billLink = '<a href="' + rl.receipt_image + '" target="_blank" style="color:#0d9488;font-weight:800;text-decoration:none;border-bottom:1.5px dashed #0d9488">🖼 Xem ảnh phiếu</a>';
        }
        body += '<tr><td style="' + thS + '">🧵 Chi Tiết Bill Nhập Vải</td><td style="' + tdS + '">' + billLink + '</td></tr>';
        body += '</table></div>';

        // Part 2: Cut history
        body += '<div style="background:#f8fafc;border:1px solid var(--gray-200);border-radius:10px;padding:16px">';
        body += '<div style="font-weight:800;font-size:14px;margin-bottom:12px">\ud83d\udd2a \u0110\u01a0N H\u00c0NG \u0110\u00c3 S\u1ea2N XU\u1ea4T <span style="background:#6366f1;color:#fff;padding:2px 8px;border-radius:10px;font-size:11px">' + cuts.length + '</span></div>';

        if (!cuts.length) {
            body += '<div style="text-align:center;padding:20px;color:var(--gray-400)"><div style="font-size:24px">\ud83d\udce6</div><div style="margin-top:4px">Chưa có đơn cắt nào</div></div>';
        } else {
            var cThS = 'padding:8px 10px;text-align:left;font-size:10px;text-transform:uppercase;color:#fff;background:#1e293b';
            body += '<table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr>';
            body += '<th style="' + cThS + ';border-radius:6px 0 0 0">#</th>';
            body += '<th style="' + cThS + '">Đơn Cắt / Sản Phẩm</th>';
            body += '<th style="' + cThS + '">Ngày Cắt</th>';
            body += '<th style="' + cThS + ';text-align:right">SL Đơn</th>';
            body += '<th style="' + cThS + ';text-align:right">SL Cắt</th>';
            body += '<th style="' + cThS + ';text-align:right">Kg Sử Dụng</th>';
            body += '<th style="' + cThS + ';border-radius:0 6px 0 0">Thợ Cắt</th>';
            body += '</tr></thead><tbody>';
            cuts.forEach(function(c, ci) {
                var cDate = c.cut_date ? new Date(c.cut_date) : null;
                var cDs = cDate ? (String(cDate.getDate()).padStart(2,'0') + '/' + String(cDate.getMonth()+1).padStart(2,'0') + '/' + cDate.getFullYear()) : '—';
                body += '<tr style="border-bottom:1px solid var(--gray-100)">';
                body += '<td style="padding:6px 8px;color:var(--gray-400)">' + (ci+1) + '</td>';
                body += '<td style="padding:6px 8px;font-weight:700;color:#0d9488">' + (c.product_name||'') + '</td>';
                body += '<td style="padding:6px 8px;font-size:10px">' + cDs + '</td>';
                body += '<td style="padding:6px 8px;text-align:right">' + _kvFmt(c.order_quantity) + '</td>';
                body += '<td style="padding:6px 8px;text-align:right;font-weight:700;color:#0d9488">' + _kvFmt(c.cut_quantity) + '</td>';
                body += '<td style="padding:6px 8px;text-align:right;font-weight:700;color:#dc2626">' + _kvFmt(c.kg_cut) + ' kg</td>';
                body += '<td style="padding:6px 8px;font-size:10px">' + (c.cutter_name||'—') + '</td>';
                body += '</tr>';
            });
            body += '</tbody></table>';
        }
        body += '</div>';

        openModal('\ud83e\uddf5 ' + label, body, '<button class="btn btn-secondary" onclick="closeModal()">\u0110\u00f3ng</button>');
    } catch(e) { showToast('L\u1ed7i: ' + e.message, 'error'); }
}

async function _kvShowRolls(fcid) {
    var r = _kv.summary.find(function(x) { return x.id === fcid; });
    var label = r ? (r.material_name + ' - ' + r.color_name) : '';
    try {
        var data = await apiCall('/api/khovai/rolls?fcid=' + fcid);
        var rolls = data.rolls || [];
        var threshold = rolls.length && rolls[0].original_tree_threshold ? Number(rolls[0].original_tree_threshold) : 10;
        var body = '<div style="margin-bottom:12px;display:flex;justify-content:space-between;align-items:center">';
        body += '<span style="font-size:12px;color:#64748b">Ngưỡng cây nguyên: <b style="color:#7c3aed">≥' + threshold + ' ' + (r?r.unit:'kg') + '</b></span>';
        body += '<button onclick="_kvAddRollForm(' + fcid + ')" style="background:#0d9488;color:#fff;border:none;padding:5px 12px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer">➕ Thêm cục</button></div>';
        body += '<div id="kvRollFormArea"></div>';
        if (!rolls.length) {
            body += '<div style="text-align:center;padding:20px;color:var(--gray-400)">Chưa có cục vải nào</div>';
        } else {
            body += '<table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr><th style="padding:6px;text-align:left;border-bottom:2px solid var(--gray-200)">#</th><th style="padding:6px;text-align:right;border-bottom:2px solid var(--gray-200)">Trọng lượng</th><th style="padding:6px;text-align:center;border-bottom:2px solid var(--gray-200)">Cây nguyên?</th><th style="padding:6px;border-bottom:2px solid var(--gray-200)">Nguồn</th><th style="padding:6px;border-bottom:2px solid var(--gray-200)">Ghi chú</th><th style="padding:6px;border-bottom:2px solid var(--gray-200)"></th></tr></thead><tbody>';
            rolls.forEach(function(rl, i) {
                var isOrig = rl.is_original_tree;
                body += '<tr><td style="padding:6px">' + (i+1) + '</td>';
                body += '<td style="padding:6px;text-align:right;font-weight:800">' + _kvFmt(rl.weight) + ' ' + (r?r.unit:'') + '</td>';
                body += '<td style="padding:6px;text-align:center">' + (isOrig ? '<span style="color:#7c3aed;font-weight:800">🌲 Có</span>' : '<span style="color:var(--gray-400)">—</span>') + '</td>';
                body += '<td style="padding:6px;font-size:10px">' + (rl.source === 'nhap_moi' ? 'Nhập mới' : 'Cắt dư') + '</td>';
                body += '<td style="padding:6px;font-size:10px;max-width:120px;overflow:hidden;text-overflow:ellipsis">' + (rl.note||'—') + '</td>';
                body += '<td style="padding:6px"><button onclick="_kvDeleteRoll(' + rl.id + ',' + fcid + ')" style="background:#dc2626;color:#fff;border:none;padding:2px 6px;border-radius:4px;font-size:9px;cursor:pointer">🗑️</button></td></tr>';
            });
            body += '</tbody></table>';
        }
        openModal('📦 Cục Vải — ' + label, body, '<button class="btn btn-secondary" onclick="closeModal()">Đóng</button>');
    } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
}

function _kvAddRollForm(fcid) {
    var area = document.getElementById('kvRollFormArea'); if (!area) return;
    area.innerHTML = '<div style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:8px;padding:12px;margin-bottom:12px;display:grid;gap:8px">'
        + '<div style="display:flex;gap:8px"><input type="number" id="kvRollWeight" class="form-control" placeholder="Trọng lượng" style="flex:1;padding:8px"><select id="kvRollSource" class="form-control" style="width:120px;padding:8px"><option value="nhap_moi">Nhập mới</option><option value="cat_du">Cắt dư</option></select></div>'
        + '<input type="text" id="kvRollNote" class="form-control" placeholder="Ghi chú (tùy chọn)" style="padding:8px">'
        + '<button onclick="_kvSubmitRoll(' + fcid + ')" style="background:#0d9488;color:#fff;border:none;padding:8px;border-radius:6px;font-weight:700;cursor:pointer">✅ Thêm cục vải</button></div>';
}

async function _kvSubmitRoll(fcid) {
    var w = document.getElementById('kvRollWeight')?.value;
    var src = document.getElementById('kvRollSource')?.value || 'nhap_moi';
    var note = document.getElementById('kvRollNote')?.value || '';
    if (!w || Number(w) <= 0) { showToast('Nhập trọng lượng!', 'error'); return; }
    try {
        var data = await apiCall('/api/khovai/rolls', 'POST', { fabric_color_id: fcid, weight: Number(w), source: src, note: note });
        if (data.success) { showToast('✅ Đã thêm cục vải'); await _kvRefreshAll(); _kvShowRolls(fcid); }
        else showToast(data.error || 'Lỗi', 'error');
    } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
}

async function _kvDeleteRoll(rollId, fcid) {
    if (!confirm('Xóa cục vải này?')) return;
    try {
        await apiCall('/api/khovai/rolls/' + rollId, 'DELETE');
        showToast('🗑️ Đã xóa'); await _kvRefreshAll(); _kvShowRolls(fcid);
    } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
}

// ========== HISTORY MODAL ==========
async function _kvShowHistory(fcid) {
    var r = _kv.summary.find(function(x) { return x.id === fcid; });
    var label = r ? (r.material_name + ' - ' + r.color_name) : '';
    try {
        var data = await apiCall('/api/khovai/history?fcid=' + fcid);
        var hist = data.history || [];
        var body = '';
        if (!hist.length) { body = '<div style="text-align:center;padding:20px;color:var(--gray-400)">Chưa có lịch sử</div>'; }
        else {
            body = '<table style="width:100%;border-collapse:collapse;font-size:11px"><thead><tr><th style="padding:6px;border-bottom:2px solid var(--gray-200)">Thời gian</th><th style="padding:6px;border-bottom:2px solid var(--gray-200)">Loại</th><th style="padding:6px;text-align:right;border-bottom:2px solid var(--gray-200)">SL</th><th style="padding:6px;border-bottom:2px solid var(--gray-200)">Mô tả</th><th style="padding:6px;border-bottom:2px solid var(--gray-200)">Người thực hiện</th></tr></thead><tbody>';
            hist.forEach(function(t) {
                var d = new Date(t.created_at);
                var ds = String(d.getDate()).padStart(2,'0') + '/' + String(d.getMonth()+1).padStart(2,'0') + ' ' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
                var typeBadge = t.tx_type === 'NHAP' ? '<span class="kv-badge-nhap">NHẬP</span>' : (t.tx_type === 'XUAT' ? '<span class="kv-badge-xuat">XUẤT</span>' : '<span style="background:#6366f1;color:#fff;padding:2px 8px;border-radius:4px;font-weight:800;font-size:10px">CẬP NHẬT</span>');
                body += '<tr><td style="padding:6px;white-space:nowrap">' + ds + '</td>';
                body += '<td style="padding:6px">' + typeBadge + '</td>';
                body += '<td style="padding:6px;text-align:right;font-weight:700">' + (Number(t.quantity) ? _kvFmt(t.quantity) : '—') + '</td>';
                body += '<td style="padding:6px;max-width:180px;overflow:hidden;text-overflow:ellipsis">' + (t.description||'') + '</td>';
                body += '<td style="padding:6px;font-size:10px">' + (t.created_by_name||'—') + '</td></tr>';
            });
            body += '</tbody></table>';
        }
        openModal('📋 Lịch Sử — ' + label, body, '<button class="btn btn-secondary" onclick="closeModal()">Đóng</button>');
    } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
}

// ========== MANUAL TRANSACTION ==========
function _kvShowTx(fcid) {
    var r = _kv.summary.find(function(x) { return x.id === fcid; });
    var label = r ? (r.material_name + ' - ' + r.color_name) : '';
    var body = '<div style="display:grid;gap:12px">';
    body += '<div style="display:flex;gap:8px"><button type="button" id="kvTxTypeNhap" onclick="_kvPickTxType(\'NHAP\')" style="flex:1;padding:8px;border-radius:8px;font-weight:800;font-size:12px;cursor:pointer;background:#059669;color:#fff;border:2px solid #059669">NHẬP</button>';
    body += '<button type="button" id="kvTxTypeXuat" onclick="_kvPickTxType(\'XUAT\')" style="flex:1;padding:8px;border-radius:8px;font-weight:800;font-size:12px;cursor:pointer;background:#fff;color:#333;border:2px solid var(--gray-300)">XUẤT</button></div>';
    body += '<input type="hidden" id="kvTxType" value="NHAP">';
    body += '<input type="number" id="kvTxQty" class="form-control" placeholder="Số lượng" style="padding:10px;font-size:14px;font-weight:700">';
    body += '<input type="text" id="kvTxDesc" class="form-control" placeholder="Mô tả (tùy chọn)" style="padding:10px">';
    body += '</div>';
    openModal('± Nhập/Xuất — ' + label, body, '<button class="btn btn-secondary" onclick="closeModal()">Hủy</button><button class="btn btn-primary" onclick="_kvSubmitTx(' + fcid + ')" style="width:auto;background:linear-gradient(135deg,#0d9488,#0f766e)">✅ Xác nhận</button>');
}

function _kvPickTxType(type) {
    document.getElementById('kvTxType').value = type;
    var btnN = document.getElementById('kvTxTypeNhap');
    var btnX = document.getElementById('kvTxTypeXuat');
    if (type === 'NHAP') { btnN.style.background = '#059669'; btnN.style.color = '#fff'; btnN.style.borderColor = '#059669'; btnX.style.background = '#fff'; btnX.style.color = '#333'; btnX.style.borderColor = 'var(--gray-300)'; }
    else { btnX.style.background = '#dc2626'; btnX.style.color = '#fff'; btnX.style.borderColor = '#dc2626'; btnN.style.background = '#fff'; btnN.style.color = '#333'; btnN.style.borderColor = 'var(--gray-300)'; }
}

async function _kvSubmitTx(fcid) {
    var txType = document.getElementById('kvTxType')?.value || 'NHAP';
    var qty = document.getElementById('kvTxQty')?.value;
    var desc = document.getElementById('kvTxDesc')?.value || '';
    if (!qty || Number(qty) <= 0) { showToast('Nhập số lượng!', 'error'); return; }
    try {
        var data = await apiCall('/api/khovai/transactions', 'POST', { fabric_color_id: fcid, tx_type: txType, quantity: Number(qty), description: desc });
        if (data.success) { showToast('✅ Đã ghi nhận ' + txType); closeModal(); await _kvRefreshAll(); }
        else showToast(data.error || 'Lỗi', 'error');
    } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
}

// ========== REFRESH ==========
async function _kvRefreshAll() {
    try {
        var treeData = await apiCall('/api/khovai/tree');
        _kv.tree = treeData.tree || [];
    } catch(e) {}
    _kvRenderSidebar();
    await _kvLoadSummary();
}

// ========== SETTINGS MODAL ==========
async function _kvShowSettings() {
    try {
        var data = await apiCall('/api/khovai/warehouses');
        var whs = data.warehouses || [];
        var body = '<div style="margin-bottom:12px;font-size:12px;color:#64748b">Quản lý kho, chất liệu và màu vải</div>';

        // Add warehouse form
        body += '<div style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:8px;padding:12px;margin-bottom:12px">';
        body += '<div style="font-weight:700;font-size:12px;color:#0d9488;margin-bottom:8px">➕ Thêm kho mới</div>';
        body += '<div style="display:flex;gap:6px"><input type="text" id="kvNewWhName" class="form-control" placeholder="Tên kho" style="flex:1;padding:8px"><input type="text" id="kvNewWhUnit" class="form-control" placeholder="ĐVT (kg,mét)" style="width:80px;padding:8px"><button onclick="_kvCreateWh()" style="background:#0d9488;color:#fff;border:none;padding:8px 12px;border-radius:6px;font-weight:700;cursor:pointer;white-space:nowrap">Tạo</button></div></div>';

        // Warehouse list
        whs.forEach(function(w) {
            body += '<div style="border:1px solid var(--gray-200);border-radius:8px;margin-bottom:8px;overflow:hidden">';
            body += '<div style="background:#f0fdfa;padding:10px 14px;display:flex;justify-content:space-between;align-items:center">';
            body += '<span style="font-weight:800;color:#0d9488">🏭 ' + w.name + ' <span style="color:#64748b;font-weight:400;font-size:10px">(' + (w.unit||'kg') + ')</span></span>';
            body += '<div style="display:flex;gap:4px"><button onclick="_kvShowAddMat(' + w.id + ')" style="background:#14b8a6;color:#fff;border:none;padding:3px 8px;border-radius:4px;font-size:10px;cursor:pointer;font-weight:700">+ Chất liệu</button>';
            body += '<button onclick="_kvDeleteWh(' + w.id + ')" style="background:#dc2626;color:#fff;border:none;padding:3px 8px;border-radius:4px;font-size:10px;cursor:pointer">🗑️</button></div></div>';
            body += '<div id="kvWhMats_' + w.id + '" style="padding:4px 14px 8px"><div style="color:var(--gray-400);font-size:10px;text-align:center;padding:6px">Đang tải...</div></div></div>';
        });

        openModal('⚙️ Cài Đặt Kho Vải', body, '<button class="btn btn-secondary" onclick="closeModal()">Đóng</button>');

        // Load materials for each warehouse
        for (var i = 0; i < whs.length; i++) {
            _kvLoadSettingsMats(whs[i].id);
        }
    } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
}

async function _kvLoadSettingsMats(wid) {
    var container = document.getElementById('kvWhMats_' + wid); if (!container) return;
    try {
        var data = await apiCall('/api/khovai/materials?wid=' + wid);
        var mats = data.materials || [];
        if (!mats.length) { container.innerHTML = '<div style="color:var(--gray-400);font-size:10px;text-align:center;padding:6px">Chưa có chất liệu</div>'; return; }
        var h = '';
        mats.forEach(function(m) {
            h += '<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid #f1f5f9">';
            h += '<span style="font-size:11px;font-weight:600">🧵 ' + m.name + '</span>';
            h += '<div style="display:flex;gap:4px"><button onclick="_kvShowAddColor(' + m.id + ')" style="background:#8b5cf6;color:#fff;border:none;padding:2px 6px;border-radius:4px;font-size:9px;cursor:pointer;font-weight:700">+ Màu</button>';
            h += '<button onclick="_kvDeleteMat(' + m.id + ')" style="background:#dc2626;color:#fff;border:none;padding:2px 6px;border-radius:4px;font-size:9px;cursor:pointer">🗑️</button></div></div>';
        });
        container.innerHTML = h;
    } catch(e) { container.innerHTML = '<div style="color:#dc2626;font-size:10px">Lỗi tải</div>'; }
}

async function _kvCreateWh() {
    var name = document.getElementById('kvNewWhName')?.value;
    var unit = document.getElementById('kvNewWhUnit')?.value;
    if (!name || !name.trim()) { showToast('Nhập tên kho!', 'error'); return; }
    if (!unit || !unit.trim()) { showToast('Nhập đơn vị tính!', 'error'); return; }
    try {
        var data = await apiCall('/api/khovai/warehouses', 'POST', { name: name.trim(), unit: unit.trim() });
        if (data.success) { showToast('✅ Đã tạo kho'); await _kvRefreshAll(); _kvShowSettings(); }
        else showToast(data.error || 'Lỗi', 'error');
    } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
}

async function _kvDeleteWh(id) {
    if (!confirm('Xóa kho này?')) return;
    try { await apiCall('/api/khovai/warehouses/' + id, 'DELETE'); showToast('🗑️ Đã xóa'); await _kvRefreshAll(); _kvShowSettings(); }
    catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
}

function _kvShowAddMat(wid) {
    var body = '<div style="display:grid;gap:8px"><input type="text" id="kvNewMatName" class="form-control" placeholder="Tên chất liệu" style="padding:10px"></div>';
    openModal('➕ Thêm Chất Liệu', body, '<button class="btn btn-secondary" onclick="_kvShowSettings()">← Quay lại</button><button class="btn btn-primary" onclick="_kvCreateMat(' + wid + ')" style="width:auto">Tạo</button>');
}

async function _kvCreateMat(wid) {
    var name = document.getElementById('kvNewMatName')?.value;
    if (!name || !name.trim()) { showToast('Nhập tên!', 'error'); return; }
    try {
        var data = await apiCall('/api/khovai/materials', 'POST', { warehouse_id: wid, name: name.trim() });
        if (data.success) { showToast('✅ Đã tạo chất liệu'); await _kvRefreshAll(); _kvShowSettings(); }
        else showToast(data.error || 'Lỗi', 'error');
    } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
}

async function _kvDeleteMat(id) {
    if (!confirm('Xóa chất liệu này?')) return;
    try { await apiCall('/api/khovai/materials/' + id, 'DELETE'); showToast('🗑️ Đã xóa'); await _kvRefreshAll(); _kvShowSettings(); }
    catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
}

function _kvShowAddColor(mid) {
    var body = '<div style="display:grid;gap:8px">';
    body += '<input type="text" id="kvNewColorName" class="form-control" placeholder="Tên màu" style="padding:10px">';
    body += '<input type="number" id="kvNewColorPrice" class="form-control" placeholder="Giá (tùy chọn)" style="padding:10px">';
    body += '<input type="number" id="kvNewColorThreshold" class="form-control" placeholder="Ngưỡng cây nguyên (mặc định 10)" style="padding:10px">';
    body += '</div>';
    openModal('🎨 Thêm Màu Vải', body, '<button class="btn btn-secondary" onclick="_kvShowSettings()">← Quay lại</button><button class="btn btn-primary" onclick="_kvCreateColor(' + mid + ')" style="width:auto">Tạo</button>');
}

async function _kvCreateColor(mid) {
    var name = document.getElementById('kvNewColorName')?.value;
    var price = document.getElementById('kvNewColorPrice')?.value;
    var threshold = document.getElementById('kvNewColorThreshold')?.value;
    if (!name || !name.trim()) { showToast('Nhập tên màu!', 'error'); return; }
    try {
        var data = await apiCall('/api/khovai/colors', 'POST', { material_id: mid, color_name: name.trim(), price: price ? Number(price) : 0, original_tree_threshold: threshold ? Number(threshold) : 10 });
        if (data.success) { showToast('✅ Đã tạo màu'); await _kvRefreshAll(); _kvShowSettings(); }
        else showToast(data.error || 'Lỗi', 'error');
    } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
}

async function _kvLoadCompletedRolls(fcid, page) {
    page = page || 1;
    var areaEl = document.getElementById('kvCompletedRollsArea');
    var countEl = document.getElementById('kvCompletedRollCount');
    if (!areaEl) return;
    areaEl.innerHTML = '<div style="color:var(--gray-400);text-align:center;padding:12px">Đang tải...</div>';
    try {
        var data = await apiCall('/api/khovai/completed-rolls?fcid=' + fcid + '&page=' + page + '&limit=10');
        var rolls = data.rolls || [];
        var total = data.total || 0;
        if (countEl) countEl.textContent = total;

        if (!rolls.length) {
            areaEl.innerHTML = '<div style="text-align:center;padding:16px;color:var(--gray-400)">Chưa có cây vải nào cắt xong</div>';
            return;
        }

        var rh = '<table style="width:100%;border-collapse:collapse;font-size:12px">';
        var thStyle = 'padding:8px 10px;text-align:left;font-size:10px;text-transform:uppercase;color:#fff;background:#475569';
        rh += '<thead><tr>';
        rh += '<th style="' + thStyle + ';border-radius:6px 0 0 0">#</th>';
        rh += '<th style="' + thStyle + '">Mã Cây</th>';
        rh += '<th style="' + thStyle + ';text-align:right">Nhập</th>';
        rh += '<th style="' + thStyle + ';text-align:right">Tồn</th>';
        rh += '<th style="' + thStyle + '">Ngày Cắt Xong</th>';
        rh += '<th style="' + thStyle + ';border-radius:0 6px 0 0">Người Nhập</th>';
        rh += '</tr></thead><tbody>';

        rolls.forEach(function(rl, idx) {
            var rlDate = rl.updated_at ? new Date(rl.updated_at) : (rl.created_at ? new Date(rl.created_at) : null);
            var rlDs = rlDate ? (String(rlDate.getDate()).padStart(2,'0') + '/' + String(rlDate.getMonth()+1).padStart(2,'0') + '/' + rlDate.getFullYear() + ' ' + String(rlDate.getHours()).padStart(2,'0') + ':' + String(rlDate.getMinutes()).padStart(2,'0')) : '—';
            var origW = Number(rl.original_weight || rl.weight);
            var curW = Number(rl.weight);

            rh += '<tr style="border-bottom:1px solid var(--gray-100);cursor:pointer" onclick="_kvShowRollDetail(' + rl.id + ')">';
            rh += '<td style="padding:6px 8px;color:var(--gray-400)">' + ((page - 1) * 10 + idx + 1) + '</td>';
            rh += '<td style="padding:6px 8px;font-weight:700;color:#475569;text-decoration:underline">' + (rl.roll_code||'N/A') + '</td>';
            rh += '<td style="padding:6px 8px;text-align:right;font-weight:700;color:#059669">' + _kvFmt(origW) + '</td>';
            rh += '<td style="padding:6px 8px;text-align:right;font-weight:700;color:#dc2626">' + _kvFmt(curW) + '</td>';
            rh += '<td style="padding:6px 8px;font-size:10px;color:#64748b">' + rlDs + '</td>';
            rh += '<td style="padding:6px 8px;font-size:10px">' + (rl.created_by_name || '—') + '</td>';
            rh += '</tr>';
        });
        rh += '</tbody></table>';

        var totalPages = Math.ceil(total / 10);
        if (totalPages > 1) {
            rh += '<div style="display:flex;justify-content:center;align-items:center;gap:12px;margin-top:12px;font-size:11px">';
            if (page > 1) {
                rh += '<button class="btn btn-sm btn-outline-secondary" onclick="_kvLoadCompletedRolls(' + fcid + ',' + (page - 1) + ')" style="padding:2px 8px;font-size:10px">◀ Trước</button>';
            } else {
                rh += '<button class="btn btn-sm btn-outline-secondary" disabled style="padding:2px 8px;font-size:10px;opacity:0.5">◀ Trước</button>';
            }
            rh += '<span>Trang ' + page + ' / ' + totalPages + '</span>';
            if (page < totalPages) {
                rh += '<button class="btn btn-sm btn-outline-secondary" onclick="_kvLoadCompletedRolls(' + fcid + ',' + (page + 1) + ')" style="padding:2px 8px;font-size:10px">Sau ▶</button>';
            } else {
                rh += '<button class="btn btn-sm btn-outline-secondary" disabled style="padding:2px 8px;font-size:10px;opacity:0.5">Sau ▶</button>';
            }
            rh += '</div>';
        }

        areaEl.innerHTML = rh;
    } catch(e) {
        if (areaEl) areaEl.innerHTML = '<div style="color:#dc2626">Lỗi tải dữ liệu các cây đã cắt xong</div>';
    }
}
window._kvLoadCompletedRolls = _kvLoadCompletedRolls;

window._kvOpenImportBill = function(importId) {
    if (typeof _bnhFabDetail === 'function') {
        _bnhFabDetail(importId);
    } else {
        var s = document.createElement('script');
        s.src = '/js/pages/fab-import-v4.js?v=20260601b';
        s.onload = function() { _bnhFabDetail(importId); };
        document.head.appendChild(s);
    }
};
