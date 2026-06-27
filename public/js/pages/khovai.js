// ========== KHO VẢI — Fabric Warehouse Frontend ==========
var _kv = { tree: [], summary: [], filter: {}, selectedWid: null, selectedMid: null, searchText: '', activeFilter: 'all', sortCol: '', sortDir: 'desc' };

function _kvFmt(n) { return Number(n||0).toLocaleString('vi-VN'); }

function _kvSaveState() {
    var state = {
        selectedWid: _kv.selectedWid,
        selectedMid: _kv.selectedMid,
        searchText: _kv.searchText,
        activeFilter: _kv.activeFilter,
        sortCol: _kv.sortCol,
        sortDir: _kv.sortDir,
        sidebarSearchText: document.getElementById('kvSbSearch') ? document.getElementById('kvSbSearch').value : '',
        hideZero: document.getElementById('kvSbHideZero') ? document.getElementById('kvSbHideZero').checked : true
    };
    localStorage.setItem('_kv_state', JSON.stringify(state));
}

async function renderKhovaiPage(content) {
    if (!document.getElementById('kvStyles')) {
        var st = document.createElement('style'); st.id = 'kvStyles';
        st.textContent = [
            '.kv-wrap{display:flex;height:calc(100vh - 60px);overflow:hidden}',
            '.kv-sidebar{width:330px;min-width:330px;background:#fff;border-right:1px solid var(--gray-200);overflow-y:auto;display:flex;flex-direction:column}',
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
            '.kv-badge-cat{background:#ea580c;color:#fff;padding:2px 8px;border-radius:4px;font-weight:800;font-size:10px}',
            '.kv-badge-hoan{background:#10b981;color:#fff;padding:2px 8px;border-radius:4px;font-weight:800;font-size:10px}',
            '.kv-badge-nhapkk{background:#0d9488;color:#fff;padding:2px 8px;border-radius:4px;font-weight:800;font-size:10px}',
            '.kv-badge-xuatkk{background:#f59e0b;color:#fff;padding:2px 8px;border-radius:4px;font-weight:800;font-size:10px}',
            '.kv-badge-update{background:#6366f1;color:#fff;padding:2px 8px;border-radius:4px;font-weight:800;font-size:10px}',
            '.kv-stat-card{background:rgba(255,255,255,0.95);border-radius:8px;padding:4px 14px;text-align:center;min-width:100px;box-shadow:0 2px 8px rgba(0,0,0,0.15)}',
            '.kv-stat-card.ton-kho-highlight{background:linear-gradient(135deg,#fbbf24,#f59e0b);color:#451a03;border:2px solid #fef08a;box-shadow:0 0 15px rgba(245,158,11,0.8),inset 0 0 8px rgba(255,255,255,0.4);min-width:120px;padding:6px 18px;transform:scale(1.15);margin:0 10px;transition:all 0.3s}',
            '.kv-stat-card.ton-kho-highlight .kv-stat-label{color:#78350f;font-size:10px;font-weight:900;text-shadow:none}',
            '.kv-stat-card.ton-kho-highlight .kv-stat-val{font-size:18px;font-weight:900;color:#451a03}',
            '.kv-stat-card.ton-kho-highlight.negative{background:linear-gradient(135deg,#f43f5e,#be123c);border-color:#fda4af;box-shadow:0 0 15px rgba(244,63,94,0.8),inset 0 0 8px rgba(255,255,255,0.2)}',
            '.kv-stat-card.ton-kho-highlight.negative .kv-stat-label{color:#ffe4e6}',
            '.kv-stat-card.ton-kho-highlight.negative .kv-stat-val{color:#fff}',
            '.kv-stat-label{font-size:9px;font-weight:700;color:#0d9488;letter-spacing:1px;margin-bottom:2px}',
            '.kv-stat-val{font-size:13px;font-weight:900}',
            '@media(max-width:768px){.kv-sidebar{width:220px;min-width:220px}.kv-table{font-size:11px}}',
            '#kvSearchInput::placeholder{color:rgba(255,255,255,0.7)}',
            '#kvSbSearch{width:100%;padding:7px 10px;border:1px solid #99f6e4;border-radius:6px;font-size:11px;outline:none;background:#f0fdfa;box-sizing:border-box}',
            '#kvSbSearch:focus{border-color:#0d9488;box-shadow:0 0 0 2px rgba(13,148,136,0.15)}'
        ].join('');
        document.head.appendChild(st);
    }

    var isLocked = false;
    try {
        var lockRes = await apiCall('/api/stockcheck/session-status');
        if (lockRes && lockRes.active) {
            isLocked = true;
        }
    } catch(e) {
        console.error('[KV] Error checking lock status:', e);
    }
    _kv.isLocked = isLocked;

    var lockBanner = isLocked ? `
        <div class="alert alert-danger" style="width:100%; border-radius:12px; margin-bottom:15px; font-weight:700; display:flex; align-items:center; gap:10px; background:#fee2e2; border:1px solid #fca5a5; color:#991b1b; padding:12px 16px;">
            <span>🔒</span>
            <span>Kho vải hiện tại đang KHÓA để phục vụ KIỂM KHO. Không thể thực hiện xuất vải để cắt hoặc các thao tác tác động kho vải.</span>
        </div>
    ` : '';

    content.innerHTML = '<div class="kv-wrap"><div class="kv-sidebar" id="kvSidebar"><div style="padding:20px;text-align:center;color:var(--gray-400);font-size:12px">Đang tải...</div></div><div class="kv-main">' + lockBanner + '<div class="kv-toolbar" id="kvToolbar"></div><div class="kv-table-wrap" id="kvTableWrap"></div></div></div>';

    try {
        var treeData = await apiCall('/api/khovai/tree');
        _kv.tree = treeData.tree || [];
    } catch(e) { _kv.tree = []; }

    // Restore state from localStorage
    var savedStateStr = localStorage.getItem('_kv_state');
    var savedState = null;
    if (savedStateStr) {
        try { savedState = JSON.parse(savedStateStr); } catch(e) {}
    }
    if (savedState) {
        _kv.selectedWid = savedState.selectedWid;
        _kv.selectedMid = savedState.selectedMid;
        _kv.searchText = savedState.searchText || '';
        _kv.activeFilter = savedState.activeFilter || 'all';
        _kv.sortCol = savedState.sortCol || '';
        _kv.sortDir = savedState.sortDir || 'desc';
        if (_kv.selectedMid) {
            _kv.filter = { wid: _kv.selectedWid, mid: _kv.selectedMid };
        } else if (_kv.selectedWid) {
            _kv.filter = { wid: _kv.selectedWid };
        } else {
            _kv.filter = {};
        }
    } else {
        _kv.filter = {}; _kv.selectedWid = null; _kv.selectedMid = null; _kv.searchText = ''; _kv.activeFilter = 'all'; _kv.sortCol = ''; _kv.sortDir = 'desc';
    }
    _kvRenderSidebar();
    await _kvLoadSummary();
}

// ========== SIDEBAR ==========
function _kvRenderSidebar() {
    var sb = document.getElementById('kvSidebar'); if (!sb) return;
    var isGD = typeof currentUser !== 'undefined' && currentUser && (
        currentUser.role === 'giam_doc' || 
        currentUser.username === 'trinh' || 
        currentUser.username === 'leviettrinh' || 
        currentUser.username === 'trinh.lvt' || 
        (currentUser.full_name && (currentUser.full_name.indexOf('Lê Việt Trinh') !== -1 || currentUser.full_name.indexOf('Le Viet Trinh') !== -1))
    );
    var savedStateStr = localStorage.getItem('_kv_state');
    var savedState = null;
    if (savedStateStr) {
        try { savedState = JSON.parse(savedStateStr); } catch(e) {}
    }
    var savedSbSearch = (savedState && savedState.sidebarSearchText) ? savedState.sidebarSearchText : '';
    var hideZero = (savedState && savedState.hideZero !== undefined) ? savedState.hideZero : true;

    var h = '<div class="kv-sb-title"><span>🏬 Kho Vải</span>' + (isGD ? '<span onclick="localStorage.setItem(\'cdsxActiveTab\', \'kho-vai\'); navigate(\'caidatsanxuat\')" style="cursor:pointer;font-size:16px" title="Cài đặt">⚙️</span>' : '') + '</div>';
    h += '<div style="padding:8px 12px 0"><input type="text" id="kvSbSearch" placeholder="🔍 Tìm chất liệu, kho..." value="' + savedSbSearch.replace(/"/g, '&quot;') + '" oninput="_kvSbFilter(this.value)" /></div>';
    h += '<div style="padding:6px 12px 8px; display:flex; align-items:center; gap:6px; font-size:11px; color:#475569;">'
       + '<input type="checkbox" id="kvSbHideZero" ' + (hideZero ? 'checked' : '') + ' onchange="_kvSbToggleHideZero(this.checked)" style="cursor:pointer; width:13px; height:13px; margin:0;" />'
       + '<label for="kvSbHideZero" style="cursor:pointer; user-select:none; font-weight:600; display:flex; align-items:center; gap:4px;">Ẩn chất liệu hết hàng (=0)</label>'
       + '</div>';

    var totalBal = 0;
    var totalRolls = 0;
    _kv.tree.forEach(function(w) {
        totalBal += Number(w.total_balance || 0);
        totalRolls += Number(w.total_rolls || 0);
    });
    h += '<div class="kv-sb-total" onclick="_kvFilterAll()"><span>📦 Tất cả kho</span><span>' + _kvFmt(totalBal) + ' <span style="font-weight:normal;opacity:0.85;font-size:11px;">(' + _kvFmt(totalRolls) + ' cây)</span></span></div>';

    _kv.tree.forEach(function(w) {
        var isActiveW = _kv.selectedWid === w.id && !_kv.selectedMid;
        h += '<div class="kv-sb-wh' + (isActiveW ? ' active' : '') + '" onclick="_kvFilterWh(' + w.id + ')" data-wid="' + w.id + '">';
        h += '<span>🏭 ' + w.name + ' (' + (w.unit||'kg') + ')</span>';
        h += '<span style="background:rgba(0,0,0,0.08);padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;color:#1e293b;">' + _kvFmt(w.total_balance) + ' <span style="color:#64748b;font-weight:500;">(' + _kvFmt(w.total_rolls || 0) + ' cây)</span></span></div>';

        var mats = w.materials || [];
        h += '<div class="kv-wh-mats" data-wid="' + w.id + '">';
        mats.forEach(function(m) {
            var isActiveM = _kv.selectedMid === m.id;
            var settingBtn = '';
            if (isGD) {
                var btnStyle = 'cursor:pointer;font-size:9.5px;margin-left:6px;padding:1px 4px;border-radius:4px;border:none;display:inline-block;vertical-align:middle;font-weight:700;';
                if (m.stop_import) {
                    settingBtn = ' <span onclick="event.stopPropagation();_kvToggleMatStop(' + m.id + ', false)" style="' + btnStyle + 'background:#fee2e2;color:#ef4444;border:1px solid #fca5a5;" title="Chất liệu này đang dừng nhập. Bấm để cho phép nhập mới.">🛑 Dừng</span>';
                } else {
                    settingBtn = ' <span onclick="event.stopPropagation();_kvToggleMatStop(' + m.id + ', true)" style="' + btnStyle + 'background:#e0f2fe;color:#0369a1;border:1px solid #bae6fd;" title="Chất liệu đang nhập mới. Bấm để dừng nhập.">📥 Nhập</span>';
                }
            }
            h += '<div class="kv-sb-mat' + (isActiveM ? ' active' : '') + '" onclick="_kvFilterMat(' + w.id + ',' + m.id + ')">';
            h += '<span>🧵 ' + m.name + settingBtn + '</span>';
            h += '<span style="font-weight:700;display:flex;align-items:center;gap:4px;">' +
                 '<span style="color:' + (Number(m.total_balance) >= 0 ? '#15803d' : '#b91c1c') + ';">' + _kvFmt(m.total_balance) + '</span>' +
                 '<span style="color:#2563eb;font-weight:600;font-size:10.5px;">(' + _kvFmt(m.total_rolls || 0) + ' cây)</span></span></div>';
        });
        h += '</div>';
    });
    sb.innerHTML = h;

    _kvSbFilter(document.getElementById('kvSbSearch') ? document.getElementById('kvSbSearch').value : savedSbSearch);
    
    var savedSidebarScroll = localStorage.getItem('_kv_sidebar_scroll');
    if (savedSidebarScroll) {
        sb.scrollTop = parseFloat(savedSidebarScroll);
    }

    sb.onscroll = function() {
        localStorage.setItem('_kv_sidebar_scroll', sb.scrollTop);
    };
}

var _kvSbFilterText = '';
function _kvSbToggleHideZero(checked) {
    _kvSaveState();
    var searchVal = document.getElementById('kvSbSearch') ? document.getElementById('kvSbSearch').value : '';
    _kvSbFilter(searchVal);
}

function _kvSbFilter(val) {
    _kvSbFilterText = (val || '').toLowerCase().trim();
    _kvSaveState();
    var hideZero = document.getElementById('kvSbHideZero') ? document.getElementById('kvSbHideZero').checked : true;

    _kv.tree.forEach(function(w) {
        var whEl = document.querySelector('[data-wid="' + w.id + '"].kv-sb-wh');
        var matsEl = document.querySelector('.kv-wh-mats[data-wid="' + w.id + '"]');
        if (!whEl || !matsEl) return;

        var whMatch = w.name.toLowerCase().indexOf(_kvSbFilterText) >= 0;
        var anyMatMatch = false;
        var mats = w.materials || [];
        var matItems = matsEl.querySelectorAll('.kv-sb-mat');
        
        mats.forEach(function(m, idx) {
            var matMatch = m.name.toLowerCase().indexOf(_kvSbFilterText) >= 0;
            var isZero = Number(m.total_balance) <= 0 && Number(m.total_rolls || 0) <= 0;
            
            var shouldShow = true;
            if (hideZero && isZero && _kv.selectedMid !== m.id) {
                shouldShow = false;
            }
            if (_kvSbFilterText) {
                shouldShow = shouldShow && (whMatch || matMatch);
            }
            
            if (shouldShow) anyMatMatch = true;
            if (matItems[idx]) matItems[idx].style.display = shouldShow ? '' : 'none';
        });

        var showWh = whMatch || anyMatMatch;
        whEl.style.display = showWh ? '' : 'none';
        matsEl.style.display = showWh ? '' : 'none';
    });
}

function _kvFilterAll() { _kv.selectedWid = null; _kv.selectedMid = null; _kv.filter = {}; _kvSaveState(); _kvLoadSummary(); _kvRenderSidebar(); }
function _kvFilterWh(wid) { _kv.selectedWid = wid; _kv.selectedMid = null; _kv.filter = { wid: wid }; _kvSaveState(); _kvLoadSummary(); _kvRenderSidebar(); }
function _kvFilterMat(wid, mid) { _kv.selectedWid = wid; _kv.selectedMid = mid; _kv.filter = { wid: wid, mid: mid }; _kvSaveState(); _kvLoadSummary(); _kvRenderSidebar(); }

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

    var activeFilter = _kv.activeFilter || 'all';
    var selectHtml = '<select id="kvActiveFilter" onchange="_kvOnActiveFilterChange(this.value)" style="margin-left:8px;padding:6px 12px;border-radius:6px;border:1px solid rgba(255,255,255,0.3);background:rgba(255,255,255,0.15);color:#fff;font-size:12px;outline:none;cursor:pointer">'
        + '<option value="all" style="color:#000"' + (activeFilter === 'all' ? ' selected' : '') + '>Tất cả trạng thái</option>'
        + '<option value="active" style="color:#000"' + (activeFilter === 'active' ? ' selected' : '') + '>🟢 Đang bán</option>'
        + '<option value="inactive" style="color:#000"' + (activeFilter === 'inactive' ? ' selected' : '') + '>🔴 Đã ẩn</option>'
        + '</select>';

    tb.innerHTML = '<span style="font-weight:800;font-size:13px">🏬 ' + ft + '</span>'
        + '<input type="text" id="kvSearchInput" placeholder="🔍 Tìm màu, chất liệu..." value="' + (_kv.searchText||'').replace(/"/g,'&quot;') + '" oninput="_kvOnSearch(this.value)" style="margin-left:12px;padding:6px 12px;border-radius:6px;border:1px solid rgba(255,255,255,0.3);background:rgba(255,255,255,0.15);color:#fff;font-size:12px;width:200px;outline:none" />'
        + selectHtml
        + '<span style="flex:1"></span>'
        + '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">'
        + '<div class="kv-stat-card"><div class="kv-stat-label">NHẬP</div><div id="kvStatNhap" class="kv-stat-val" style="color:#059669">0</div></div>'
        + '<div class="kv-stat-card"><div class="kv-stat-label">XUẤT</div><div id="kvStatXuat" class="kv-stat-val" style="color:#dc2626">0</div></div>'
        + '<div id="kvStatCuoiCard" class="kv-stat-card ton-kho-highlight"><div class="kv-stat-label">TỒN KHO</div><div id="kvStatCuoi" class="kv-stat-val">0</div></div>'
        + '</div>';
}

function _kvOnSearch(val) {
    _kv.searchText = val;
    _kvSaveState();
    _kvRenderTable();
}

// ========== TABLE ==========
function _kvSort(col) {
    if (_kv.sortCol === col) { _kv.sortDir = _kv.sortDir === 'asc' ? 'desc' : 'asc'; }
    else { _kv.sortCol = col; _kv.sortDir = 'desc'; }
    _kvSaveState();
    _kvRenderTable();
}
function _kvRenderTable() {
    var wrap = document.getElementById('kvTableWrap'); if (!wrap) return;
    var sorted = _kv.summary.slice();
    var isDirector = typeof currentUser !== 'undefined' && currentUser && (
        currentUser.role === 'giam_doc' || 
        currentUser.username === 'trinh' || 
        currentUser.username === 'leviettrinh' || 
        currentUser.username === 'trinh.lvt' || 
        (currentUser.full_name && (currentUser.full_name.indexOf('Lê Việt Trinh') !== -1 || currentUser.full_name.indexOf('Le Viet Trinh') !== -1))
    );

    // Client-side active status filter
    var activeFilter = _kv.activeFilter || 'all';
    if (activeFilter === 'active') {
        sorted = sorted.filter(function(r) { return r.is_active !== false; });
    } else if (activeFilter === 'inactive') {
        sorted = sorted.filter(function(r) { return r.is_active === false; });
    }

    // Client-side search filter
    var searchKey = (_kv.searchText || '').toLowerCase().trim();
    if (searchKey) {
        sorted = sorted.filter(function(r) {
            return (r.color_name || '').toLowerCase().indexOf(searchKey) >= 0
                || (r.material_name || '').toLowerCase().indexOf(searchKey) >= 0
                || (r.location || '').toLowerCase().indexOf(searchKey) >= 0;
        });
    }

    // Custom column sort or default: group by material name, active status, color name
    if (_kv.sortCol) {
        var col = _kv.sortCol;
        var dir = _kv.sortDir === 'asc' ? 1 : -1;
        sorted.sort(function(a, b) {
            var av = Number(a[col]||0), bv = Number(b[col]||0);
            return (av - bv) * dir;
        });
    } else {
        sorted.sort(function(a, b) {
            var matA = a.material_name || '';
            var matB = b.material_name || '';
            if (matA !== matB) return matA.localeCompare(matB, 'vi');
            var stopA = (a.color_stop_import === true || a.is_active === false) ? 0 : 1;
            var stopB = (b.color_stop_import === true || b.is_active === false) ? 0 : 1;
            if (stopA !== stopB) return stopA - stopB;
            var colA = a.color_name || '';
            var colB = b.color_name || '';
            return colA.localeCompare(colB, 'vi');
        });
    }

    // Update dynamic top stat cards
    var tNhap = 0, tXuat = 0, tCuoi = 0;
    sorted.forEach(function(r) { tNhap += Number(r.dau_ky||0); tXuat += Number(r.xuat||0); tCuoi += Number(r.cuoi_ky||0); });
    var elNhap = document.getElementById('kvStatNhap');
    var elXuat = document.getElementById('kvStatXuat');
    var elCuoi = document.getElementById('kvStatCuoi');
    var cardCuoi = document.getElementById('kvStatCuoiCard');
    if (elNhap) elNhap.textContent = _kvFmt(tNhap);
    if (elXuat) elXuat.textContent = _kvFmt(tXuat);
    if (elCuoi) {
        elCuoi.textContent = _kvFmt(tCuoi);
    }
    if (cardCuoi) {
        if (tCuoi >= 0) {
            cardCuoi.classList.remove('negative');
        } else {
            cardCuoi.classList.add('negative');
        }
    }

    if (!sorted.length) {
        wrap.innerHTML = '<div style="text-align:center;padding:40px;color:var(--gray-400)"><div style="font-size:32px">\ud83d\udd0d</div><div style="margin-top:8px">' + (searchKey ? 'Không tìm thấy "' + searchKey + '"' : 'Chưa có dữ liệu kho vải') + '</div></div>';
        return;
    }
    // Sort icon helper
    function sIco(col) {
        if (_kv.sortCol !== col) return ' <span style="opacity:0.3;font-size:9px">\u25B2\u25BC</span>';
        return _kv.sortDir === 'asc' ? ' <span style="font-size:9px">\u25B2</span>' : ' <span style="font-size:9px">\u25BC</span>';
    }
    var thC = 'cursor:pointer;user-select:none';
    var h = '<table class="kv-table"><thead><tr>';
    h += '<th>#</th><th>T\u00ean V\u1ea3i</th><th>Ch\u1ea5t Li\u1ec7u</th><th>Kho</th><th>V\u1ecb Tr\u00ed Kho</th>';
    h += '<th style="text-align:right;' + thC + '" onclick="_kvSort(\'so_cuc\')">' + 'S\u1ed1 C\u1ee5c' + sIco('so_cuc') + '</th>';
    h += '<th style="text-align:right;' + thC + '" onclick="_kvSort(\'cay_nguyen\')">' + 'C\u00e2y Nguy\u00ean' + sIco('cay_nguyen') + '</th>';
    h += '<th style="text-align:right;' + thC + '" onclick="_kvSort(\'dau_ky\')">' + '\u0110\u1ea7u K\u1ef3' + sIco('dau_ky') + '</th>';
    h += '<th style="text-align:right;' + thC + '" onclick="_kvSort(\'xuat\')">' + 'Xu\u1ea5t' + sIco('xuat') + '</th>';
    h += '<th style="text-align:right;' + thC + '" onclick="_kvSort(\'cuoi_ky\')">' + 'Cu\u1ed1i K\u1ef3' + sIco('cuoi_ky') + '</th>';
    h += '<th style="text-align:right;' + thC + '" onclick="_kvSort(\'price\')">' + 'Gi\u00e1' + sIco('price') + '</th>';
    h += '<th>Thao T\u00e1c</th></tr></thead><tbody>';

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
                var isNguyen = (w === ow);
                return isNguyen ? '<span style="color:#ea580c;font-weight:800">' + _kvFmt(w) + '</span>' : '<span>' + _kvFmt(w) + '</span>';
            });
            rwHtml = ' - ' + parts.join(', ');
        }

        var stopBadgeHtml = '';
        if (r.color_stop_import) {
            stopBadgeHtml = '<div style="margin-top:2px"><span style="background:#fee2e2;color:#ef4444;font-size:9.5px;padding:2px 6px;border-radius:4px;border:1px solid #fca5a5;font-weight:800;white-space:nowrap;display:inline-block" title="Dừng nhập màu này">🛑 Dừng nhập</span></div>';
        }

        var heldOrdersHtml = '';
        if (r.held_orders && r.held_orders.length) {
            r.held_orders.forEach(function(ho) {
                heldOrdersHtml += '<div style="font-size:11px;color:#b45309;margin-top:2px;font-weight:600;white-space:nowrap">' + ho.display_text + '</div>';
            });
        }

        var slipsBadgeHtml = '';
        if (r.allowed_slips !== null && r.allowed_slips !== undefined) {
            if (r.color_stop_import) {
                slipsBadgeHtml = '<div style="margin-top:2px"><span style="background:#e0f2fe;color:#0369a1;font-size:9.5px;padding:2px 6px;border-radius:4px;border:1px solid #7dd3fc;font-weight:800;white-space:nowrap;display:inline-block" title="Số lượng đơn hàng được tạo thêm">🎟️ Được tạo ' + r.allowed_slips + ' đơn</span></div>';
            } else {
                slipsBadgeHtml = '<div style="margin-top:2px"><span style="background:#e0f2fe;color:#0369a1;font-size:9.5px;padding:2px 6px;border-radius:4px;border:1px solid #7dd3fc;font-weight:800;white-space:nowrap;display:inline-block" title="Số lượng đơn hàng được tạo còn lại">🎟️ Còn ' + r.allowed_slips + ' đơn</span></div>';
            }
        }

        var importSlipsBadgeHtml = '';
        if (r.allowed_import_slips !== null && r.allowed_import_slips !== undefined) {
            importSlipsBadgeHtml = '<div style="margin-top:2px"><span style="background:#fffbeb;color:#d97706;font-size:9.5px;padding:2px 6px;border-radius:4px;border:1px solid #fde68a;font-weight:800;white-space:nowrap;display:inline-block" title="Số lượng đơn hàng được nhập còn lại">📥 Còn ' + r.allowed_import_slips + ' đơn</span></div>';
        }

        var rowStyle = r.is_active === false ? 'style="cursor:pointer;opacity:0.85;background-color:#fee2e2"' : 'style="cursor:pointer"';
        h += '<tr ' + rowStyle + ' onclick="_kvShowDetail(' + r.id + ')">';
        h += '<td style="color:var(--gray-400)">' + (i+1) + '</td>';
        h += '<td style="font-weight:700;color:#0d9488;text-decoration:underline;white-space:nowrap">';
        h += '<div style="display:inline-block;vertical-align:middle">';
        h += '<div><span>' + (r.color_name||'') + '</span><span style="font-size:11px;font-weight:600;color:#64748b">' + rwHtml + '</span></div>';
        h += heldOrdersHtml;
        h += stopBadgeHtml;
        h += slipsBadgeHtml;
        h += importSlipsBadgeHtml;
        h += '</div>';
        h += '</td>';
        h += '<td>' + (r.material_name||'') + '</td>';
        h += '<td style="font-size:10px;color:#64748b">' + (r.warehouse_name||'') + '</td>';
        h += '<td style="font-size:11px;font-weight:600;color:#0284c7">' + (r.location||'—') + '</td>';
        h += '<td style="text-align:right;font-weight:700">' + (r.so_cuc||0) + '</td>';
        h += '<td style="text-align:right;font-weight:700;color:' + cayNguyenColor + '">' + (r.cay_nguyen||0) + '</td>';
        h += '<td style="text-align:right;font-weight:700;color:#059669;white-space:nowrap">' + _kvFmt(r.dau_ky) + '</td>';
        h += '<td style="text-align:right;font-weight:700;color:#dc2626;white-space:nowrap">' + _kvFmt(r.xuat) + '</td>';
        h += '<td style="text-align:right;font-weight:900;color:' + cuoiColor + ';white-space:nowrap">' + _kvFmt(r.cuoi_ky) + '</td>';
        h += '<td style="text-align:right;font-size:11px">' + (r.price ? _kvFmt(r.price) + '\u0111' : '\u2014') + '</td>';
        h += '<td style="white-space:nowrap" onclick="event.stopPropagation()">';
        if (isDirector) {
            if (r.is_active !== false) {
                if (r.allowed_slips !== null && r.allowed_slips !== undefined && !r.color_stop_import) {
                    h += '<button onclick="_kvToggleActive(' + r.id + ', false)" style="background:#64748b;color:#fff;border:none;padding:4px 8px;border-radius:6px;font-size:11px;cursor:pointer;font-weight:700;margin-right:6px;transition:all 0.2s" title="Bấm để hủy giới hạn và dừng bán ngay">🔴 Dừng Bán</button>';
                } else {
                    h += '<button onclick="_kvToggleActive(' + r.id + ', false)" style="background:#10b981;color:#fff;border:none;padding:4px 8px;border-radius:6px;font-size:11px;cursor:pointer;font-weight:700;margin-right:6px;transition:all 0.2s" title="Bấm để dừng bán">🟢 Bán</button>';
                }
            } else {
                h += '<button onclick="_kvToggleActive(' + r.id + ', true)" style="background:#64748b;color:#fff;border:none;padding:4px 8px;border-radius:6px;font-size:11px;cursor:pointer;font-weight:700;margin-right:6px;transition:all 0.2s" title="Bấm để mở bán">🔴 Dừng Bán</button>';
            }
            if (r.color_stop_import) {
                h += '<button onclick="_kvToggleStopImport(' + r.id + ', false)" style="background:#f43f5e;color:#fff;border:none;padding:4px 8px;border-radius:6px;font-size:11px;cursor:pointer;font-weight:700;margin-right:6px;transition:all 0.2s" title="Hủy dừng nhập màu này">🛑 Dừng Nhập Vải</button>';
            } else {
                h += '<button onclick="_kvToggleStopImport(' + r.id + ', true)" style="background:#0284c7;color:#fff;border:none;padding:4px 8px;border-radius:6px;font-size:11px;cursor:pointer;font-weight:700;margin-right:6px;transition:all 0.2s" title="Bật dừng nhập màu này">📥 Nhập Vải</button>';
            }
        }
        if (isDirector && (r.is_active === false || r.allowed_slips !== null || r.color_stop_import)) {
            h += '<button onclick="_kvCreateOrderFromFabric(' + r.id + ', \'' + (r.material_name||'').replace(/'/g, "\\'") + '\', \'' + (r.color_name||'').replace(/'/g, "\\'") + '\')" style="background:linear-gradient(135deg,#b8860b,#daa520);color:#fff;border:none;padding:4px 8px;border-radius:6px;font-size:11px;cursor:pointer;font-weight:700;margin-right:6px;transition:all 0.2s" title="Cấp thêm số lượng đơn hàng cho màu vải này">✨ Thêm Đơn</button>';
        }
        h += '<button onclick="_kvShowHistory(' + r.id + ')" style="background:#6366f1;color:#fff;border:none;padding:4px 8px;border-radius:6px;font-size:11px;cursor:pointer;font-weight:700;display:inline-flex;align-items:center;gap:4px" title="Lịch sử">📋 Lịch sử</button>';
        h += '</td>';
        h += '</tr>';
    });
    h += '</tbody></table>';
    wrap.innerHTML = h;

    var mainEl = document.querySelector('.kv-main');
    if (mainEl) {
        var savedMainScroll = localStorage.getItem('_kv_main_scroll');
        if (savedMainScroll) {
            mainEl.scrollTop = parseFloat(savedMainScroll);
        }
        mainEl.onscroll = function() {
            localStorage.setItem('_kv_main_scroll', mainEl.scrollTop);
        };
    }
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
        ['VỊ TRÍ KHO', '<b style="color:#0284c7">' + (r.location || '—') + '</b>' + (r.location ? (r.color_location ? ' <span style="font-weight:normal;font-size:10px;color:#059669">(Riêng của màu)</span>' : (r.material_location ? ' <span style="font-weight:normal;font-size:10px;color:#64748b">(Theo chất liệu)</span>' : '')) : '')],
        ['SỐ CỤC', '<b>' + (r.so_cuc||0) + '</b>'],
        ['ĐẦU KỲ', '<b style="color:#059669">' + _kvFmt(r.dau_ky) + '</b>'],
        ['XUẤT', '<b style="color:#dc2626">' + _kvFmt(r.xuat) + '</b>'],
        ['CUỐI KỲ', '<b style="color:' + cuoiColor + ';font-size:16px">' + _kvFmt(r.cuoi_ky) + '</b>'],
        ['GIÁ', r.price ? _kvFmt(r.price) + 'đ' : '—'],
        ['GIỚI HẠN ĐƠN', r.allowed_slips !== null && r.allowed_slips !== undefined ? (r.color_stop_import ? '<b style="color:#0369a1">🎟️ Được tạo ' + r.allowed_slips + ' đơn</b>' : '<b style="color:#0369a1">🎟️ Còn ' + r.allowed_slips + ' đơn</b>') : (r.is_active === false ? '<span style="color:#ef4444;font-weight:700">🔴 Đang ẩn bán</span>' : 'Mở bán vĩnh viễn')],
        ['GIỚI HẠN NHẬP', r.allowed_import_slips !== null && r.allowed_import_slips !== undefined ? '<b style="color:#d97706">📥 Còn ' + r.allowed_import_slips + ' đơn</b>' : (r.color_stop_import ? '<span style="color:#ef4444;font-weight:700">🛑 Đang dừng nhập</span>' : 'Mở nhập vĩnh viễn')],
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
        rolls.sort(function(a, b) { return Number(b.weight) - Number(a.weight); });
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
            var cutLabel = rl.cutting_order_name ? (rl.cutting_order_name.split(' — ').slice(0,2).join(' — ')) : null;
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
        var body = '';
        if (rl.image_path) {
            body += '<div style="text-align:center;margin-bottom:16px;background:#f1f5f9;border:1.5px solid #cbd5e1;border-radius:12px;padding:8px;position:relative;overflow:hidden;max-width:100%">';
            body += '  <img src="' + rl.image_path + '" style="max-height:240px;max-width:100%;object-fit:contain;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.1)">';
            body += '  <div style="font-size:11px;color:#64748b;font-weight:700;margin-top:6px">📷 HÌNH ẢNH ĐỊNH DANH CÂY VẢI</div>';
            body += '</div>';
        }
        body += '<div style="background:#f8fafc;border:1px solid var(--gray-200);border-radius:10px;padding:16px;margin-bottom:16px">';
        body += '<table style="width:100%;font-size:13px;border-collapse:collapse">';
        body += '<tr><td style="' + thS + '">T\u00caN C\u00c2Y V\u1ea2I</td><td style="' + tdS + '"><b style="color:#0d9488;font-size:14px">' + label + '</b></td></tr>';
        body += '<tr><td style="' + thS + '">ID CU\u1ed8N V\u1ea2I</td><td style="' + tdS + '"><code style="background:#e2e8f0;padding:2px 8px;border-radius:4px;font-weight:700;letter-spacing:1px">' + (rl.roll_code||'N/A') + '</code></td></tr>';
        body += '<tr><td style="' + thS + '">NH\u1eacP</td><td style="' + tdS + '"><b style="color:#059669">' + _kvFmt(origW) + '</b></td></tr>';
        body += '<tr><td style="' + thS + '">XU\u1ea4T</td><td style="' + tdS + '"><b style="color:#dc2626">' + _kvFmt(xuatW) + '</b></td></tr>';
        body += '<tr><td style="' + thS + '">T\u1ed2N</td><td style="' + tdS + '"><b style="color:' + cuoiColor + ';font-size:16px">' + _kvFmt(curW) + '</b></td></tr>';
        body += '<tr><td style="' + thS + '">HO\u00c0N</td><td style="' + tdS + '">' + (rl.is_returned ? '<span style="color:#f59e0b;font-weight:700">\u0110\u00e3 ho\u00e0n</span>' : '<span style="color:#64748b">Ch\u01b0a ho\u00e0n</span>') + '</td></tr>';
        body += '<tr><td style="' + thS + '">UPDATE TIME</td><td style="' + tdS + '">' + upStr + (rl.created_by_name ? ' \u2014 <b>' + rl.created_by_name + '</b>' : '') + '</td></tr>';
        var rlCutLabel = rl.cutting_order_name ? (rl.cutting_order_name.split(' — ').slice(0,2).join(' — ')) : null;
        body += '<tr><td style="' + thS + '">ĐANG CẮT</td><td style="' + tdS + '">' + (rlCutLabel ? '<span style="background:#dc2626;color:#fff;padding:2px 10px;border-radius:4px;font-size:11px;font-weight:700">' + rlCutLabel + '</span>' : '<span style="color:#94a3b8">—</span>') + '</td></tr>';
        body += '<tr><td style="' + thS + '">NG\u01af\u1edcI NH\u1eacP V\u1ea2I</td><td style="' + tdS + '">' + (rl.created_by_name || '\u2014') + '</td></tr>';
        
        var billLink = '<span style="color:var(--gray-400)">Chưa có</span>';
        if (rl.source === 'kiem_kho_du') {
            billLink = '<a href="javascript:void(0)" onclick="_kvOpenRollOrigin(' + rl.id + ')" style="color:#0284c7;font-weight:800;text-decoration:none;border-bottom:1.5px dashed #0284c7">📋 Xem Bill Kiểm Kê</a>';
        } else if (rl.source_import_id) {
            billLink = '<a href="javascript:void(0)" onclick="_kvOpenImportBill(' + rl.source_import_id + ')" style="color:#7c3aed;font-weight:800;text-decoration:none;border-bottom:1.5px dashed #7c3aed">🧵 Xem Chi Tiết Bill Nhập Vải</a>';
        } else if (rl.stockcheck_session_id) {
            billLink = '<a href="javascript:void(0)" onclick="_kvOpenStockcheckBill(' + rl.stockcheck_session_id + ')" style="color:#0284c7;font-weight:800;text-decoration:none;border-bottom:1.5px dashed #0284c7">📋 Xem Bill Kiểm Kê</a>';
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
                body += '<td style="padding:6px 8px;font-weight:700;color:#0d9488"><a href="javascript:void(0)" onclick="_kvOpenCuttingDetail(' + c.cutting_record_id + ')" style="color:#0d9488;font-weight:700;text-decoration:underline">' + (c.product_name||'') + '</a></td>';
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

        var footer = '<button class="btn btn-primary" onclick="_kvShowDetail(' + rl.fabric_color_id + ')" style="background:linear-gradient(135deg,#0d9488,#0f766e);color:#fff !important;font-weight:700">← Quay lại</button> ';
        footer += '<button class="btn btn-secondary" onclick="closeModal()">Đóng</button>';
        openModal('\ud83e\uddf5 ' + label, body, footer);
    } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
}

async function _kvShowRolls(fcid) {
    var r = _kv.summary.find(function(x) { return x.id === fcid; });
    var label = r ? (r.material_name + ' - ' + r.color_name) : '';
    try {
        var data = await apiCall('/api/khovai/rolls?fcid=' + fcid);
        var rolls = data.rolls || [];
        rolls.sort(function(a, b) { return Number(b.weight) - Number(a.weight); });
        var threshold = rolls.length && rolls[0].original_tree_threshold ? Number(rolls[0].original_tree_threshold) : 10;
        var body = '<div style="margin-bottom:12px;display:flex;justify-content:space-between;align-items:center">';
        body += '<span style="font-size:12px;color:#64748b">Cây nguyên: Cây chưa bị cắt</span>';
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
    if (_kv.isLocked) { showToast('Kho vải đang khóa để kiểm kho!', 'error'); return; }
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
    if (_kv.isLocked) { showToast('Kho vải đang khóa để kiểm kho!', 'error'); return; }
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
    
    var body = '<div style="background:#f8fafc;border:1px solid var(--gray-200);border-radius:10px;padding:16px">';
    body += '<div style="font-weight:800;font-size:14px;margin-bottom:12px">📋 Chi tiết lịch sử <span id="kvHistoryCount" style="background:#0d9488;color:#fff;padding:2px 8px;border-radius:10px;font-size:11px">...</span></div>';
    body += '<div id="kvHistoryArea" style="color:var(--gray-400);text-align:center;padding:12px">Đang tải...</div>';
    body += '</div>';

    openModal('📋 Lịch Sử — ' + label, body, '<button class="btn btn-secondary" onclick="closeModal()">Đóng</button>');
    _kvLoadHistoryPage(fcid, 1);
}

async function _kvLoadHistoryPage(fcid, page) {
    page = page || 1;
    var areaEl = document.getElementById('kvHistoryArea');
    var countEl = document.getElementById('kvHistoryCount');
    if (!areaEl) return;
    areaEl.innerHTML = '<div style="color:var(--gray-400);text-align:center;padding:12px">Đang tải...</div>';
    try {
        var data = await apiCall('/api/khovai/history?fcid=' + fcid + '&page=' + page + '&limit=20');
        var hist = data.history || [];
        var total = data.total || 0;
        if (countEl) countEl.textContent = total;

        if (!hist.length) {
            areaEl.innerHTML = '<div style="text-align:center;padding:20px;color:var(--gray-400)">Chưa có lịch sử</div>';
            return;
        }

        var bh = '<table style="width:100%;border-collapse:collapse;font-size:11px"><thead><tr>';
        var thStyle = 'padding:6px;border-bottom:2px solid var(--gray-200);text-align:left';
        bh += '<th style="' + thStyle + '">Thời gian</th>';
        bh += '<th style="' + thStyle + '">Loại</th>';
        bh += '<th style="' + thStyle + ';text-align:right">SL</th>';
        bh += '<th style="' + thStyle + '">Mô tả</th>';
        bh += '<th style="' + thStyle + '">Người thực hiện</th>';
        bh += '</tr></thead><tbody>';

        hist.forEach(function(t) {
            var d = new Date(t.created_at);
            var ds = String(d.getDate()).padStart(2,'0') + '/' + String(d.getMonth()+1).padStart(2,'0') + ' ' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
            var typeBadge = '';
            if (t.tx_type === 'NHAP') typeBadge = '<span class="kv-badge-nhap">NHẬP</span>';
            else if (t.tx_type === 'XUAT') typeBadge = '<span class="kv-badge-xuat">XUẤT</span>';
            else if (t.tx_type === 'CAT') typeBadge = '<span class="kv-badge-cat">CẮT</span>';
            else if (t.tx_type === 'HOAN') typeBadge = '<span class="kv-badge-hoan">HOÀN</span>';
            else if (t.tx_type === 'NHAP_KK') typeBadge = '<span class="kv-badge-nhapkk">NHẬP KK</span>';
            else if (t.tx_type === 'XUAT_KK') typeBadge = '<span class="kv-badge-xuatkk">XUẤT KK</span>';
            else typeBadge = '<span class="kv-badge-update">CẬP NHẬT</span>';

            bh += '<tr><td style="padding:6px;white-space:nowrap">' + ds + '</td>';
            bh += '<td style="padding:6px">' + typeBadge + '</td>';
            bh += '<td style="padding:6px;text-align:right;font-weight:700">' + (Number(t.quantity) ? _kvFmt(t.quantity) : '—') + '</td>';
            bh += '<td style="padding:6px;word-break:break-word">' + (t.description||'') + '</td>';
            bh += '<td style="padding:6px;font-size:10px">' + (t.created_by_name||'—') + '</td></tr>';
        });
        bh += '</tbody></table>';

        var totalPages = Math.ceil(total / 20);
        if (totalPages > 1) {
            bh += '<div style="display:flex;justify-content:center;align-items:center;gap:12px;margin-top:12px;font-size:11px">';
            if (page > 1) {
                bh += '<button class="btn btn-sm btn-outline-secondary" onclick="_kvLoadHistoryPage(' + fcid + ',' + (page - 1) + ')" style="padding:2px 8px;font-size:10px">◀ Trước</button>';
            } else {
                bh += '<button class="btn btn-sm btn-outline-secondary" disabled style="padding:2px 8px;font-size:10px;opacity:0.5">◀ Trước</button>';
            }
            bh += '<span>Trang ' + page + ' / ' + totalPages + '</span>';
            if (page < totalPages) {
                bh += '<button class="btn btn-sm btn-outline-secondary" onclick="_kvLoadHistoryPage(' + fcid + ',' + (page + 1) + ')" style="padding:2px 8px;font-size:10px">Sau ▶</button>';
            } else {
                bh += '<button class="btn btn-sm btn-outline-secondary" disabled style="padding:2px 8px;font-size:10px;opacity:0.5">Sau ▶</button>';
            }
            bh += '</div>';
        }

        areaEl.innerHTML = bh;
    } catch(e) {
        if (areaEl) areaEl.innerHTML = '<div style="color:#dc2626">Lỗi tải dữ liệu lịch sử</div>';
    }
}
window._kvLoadHistoryPage = _kvLoadHistoryPage;

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
    if (_kv.isLocked) { showToast('Kho vải đang khóa để kiểm kho!', 'error'); return; }
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
    if (_kv.isLocked) { showToast('Kho vải đang khóa để kiểm kho!', 'error'); return; }
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
    if (_kv.isLocked) { showToast('Kho vải đang khóa để kiểm kho!', 'error'); return; }
    if (!confirm('Xóa kho này?')) return;
    try { await apiCall('/api/khovai/warehouses/' + id, 'DELETE'); showToast('🗑️ Đã xóa'); await _kvRefreshAll(); _kvShowSettings(); }
    catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
}

function _kvShowAddMat(wid) {
    var body = '<div style="display:grid;gap:8px"><input type="text" id="kvNewMatName" class="form-control" placeholder="Tên chất liệu" style="padding:10px"></div>';
    openModal('➕ Thêm Chất Liệu', body, '<button class="btn btn-secondary" onclick="_kvShowSettings()">← Quay lại</button><button class="btn btn-primary" onclick="_kvCreateMat(' + wid + ')" style="width:auto">Tạo</button>');
}

async function _kvCreateMat(wid) {
    if (_kv.isLocked) { showToast('Kho vải đang khóa để kiểm kho!', 'error'); return; }
    var name = document.getElementById('kvNewMatName')?.value;
    if (!name || !name.trim()) { showToast('Nhập tên!', 'error'); return; }
    try {
        var data = await apiCall('/api/khovai/materials', 'POST', { warehouse_id: wid, name: name.trim() });
        if (data.success) { showToast('✅ Đã tạo chất liệu'); await _kvRefreshAll(); _kvShowSettings(); }
        else showToast(data.error || 'Lỗi', 'error');
    } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
}

async function _kvDeleteMat(id) {
    if (_kv.isLocked) { showToast('Kho vải đang khóa để kiểm kho!', 'error'); return; }
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
    if (_kv.isLocked) { showToast('Kho vải đang khóa để kiểm kho!', 'error'); return; }
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
        s.src = '/js/pages/fab-import-v4.js?v=20260626_2';
        s.onload = function() { _bnhFabDetail(importId); };
        document.head.appendChild(s);
    }
};

window._kvOpenStockcheckBill = function(sessionId) {
    closeModal();
    const url = new URL(window.location.href);
    url.pathname = '/kiemkhohv';
    url.searchParams.set('session_id', sessionId);
    window.history.pushState({ page: 'kiemkhohv', view: 'report', sessionId: sessionId }, '', url.pathname + url.search);
    handleRoute();
};

function _kvInjectCuttingDetailStyles() {
    if (document.getElementById('_bpcDetailStyles')) return;
    var style = document.createElement('style');
    style.id = '_bpcDetailStyles';
    style.textContent = `
        .bpc-modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15,23,42,0.6); backdrop-filter: blur(6px); z-index: 99999; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity .25s ease; pointer-events: none; }
        .bpc-modal-overlay.show { opacity: 1; pointer-events: auto; }
        .bpc-modal { background: #fff; border-radius: 16px; width: 460px; max-width: 92vw; box-shadow: 0 25px 60px rgba(0,0,0,0.25); transform: scale(0.85); transition: transform .3s cubic-bezier(0.34,1.56,0.64,1); overflow: hidden; }
        .bpc-modal-overlay.show .bpc-modal { transform: scale(1); }
        .bpc-modal-header { background: linear-gradient(135deg,#059669,#10b981); color: #fff; padding: 18px 24px; display: flex; align-items: center; gap: 12px; position: relative; }
        .bpc-modal-header .m-icon { font-size: 28px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2)); }
        .bpc-modal-header .m-title { font-size: 16px; font-weight: 800; letter-spacing: 0.3px; font-family: Inter,system-ui,sans-serif; text-align: left; }
        .bpc-modal-header .m-sub { font-size: 11px; opacity: 0.85; margin-top: 2px; text-align: left; }
        .bpc-modal-body { padding: 20px 24px; }
        .bpc-modal-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-family: Inter,system-ui,sans-serif; }
        .bpc-modal-row:last-child { border-bottom: none; }
        .bpc-modal-lbl { font-size: 12px; color: #64748b; font-weight: 600; text-align: left; }
        .bpc-modal-val { font-size: 13px; color: #1e293b; font-weight: 700; text-align: right; max-width: 60%; }
        .bpc-modal-actions { display: flex; gap: 10px; padding: 16px 24px; border-top: 1px solid #f1f5f9; }
        .bpc-modal-btn { flex: 1; padding: 12px; border: none; border-radius: 10px; font-size: 14px; font-weight: 700; cursor: pointer; font-family: Inter,system-ui,sans-serif; transition: all .15s; }
        .bpc-modal-btn.confirm { background: linear-gradient(135deg,#059669,#10b981); color: #fff; box-shadow: 0 4px 15px rgba(16,185,129,0.3); }
        .bpc-modal-btn.confirm:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(16,185,129,0.4); }
        .bpc-modal-btn.cancel { background: #f1f5f9; color: #475569; }
        .bpc-modal-btn.cancel:hover { background: #e2e8f0; }
        .bpc-modal-header .bpc-modal-close { position: absolute; top: 18px; right: 20px; font-size: 20px; color: rgba(255,255,255,0.7); cursor: pointer; background: none; border: none; transition: color 0.15s; }
        .bpc-modal-header .bpc-modal-close:hover { color: #fff; }
    `;
    document.head.appendChild(style);
}

async function _kvOpenCuttingDetail(cuttingRecordId) {
    _kvInjectCuttingDetailStyles();

    // Create the overlay container
    var overlay = document.createElement('div');
    overlay.className = 'bpc-modal-overlay';
    overlay.id = '_bpcDetailModal';
    overlay.onclick = function(event) {
        if (event.target === overlay) {
            overlay.classList.remove('show');
            setTimeout(function() { overlay.remove(); }, 300);
        }
    };

    // Construct modal frame with loading text
    var h = '<div class="bpc-modal" style="width:540px">';
    h += '<div class="bpc-modal-header" style="background:linear-gradient(135deg,#059669,#10b981)">';
    h += '<div class="m-icon">📋</div>';
    h += '<div><div class="m-title">CHI TIẾT ĐƠN CẮT</div><div class="m-sub">⏳ Đang tải...</div></div>';
    h += '<button class="bpc-modal-close" onclick="var m=document.getElementById(\'_bpcDetailModal\');if(m){m.classList.remove(\'show\');setTimeout(function(){m.remove()},300)}">×</button>';
    h += '</div>';
    h += '<div class="bpc-modal-body" id="_kvCutDetailBody" style="max-height:65vh;overflow-y:auto;text-align:center;padding:40px;color:#94a3b8">';
    h += '⏳ Đang tải chi tiết đơn cắt...';
    h += '</div>';
    h += '<div class="bpc-modal-actions">';
    h += '<button class="bpc-modal-btn cancel" onclick="var m=document.getElementById(\'_bpcDetailModal\');if(m){m.classList.remove(\'show\');setTimeout(function(){m.remove()},300)}" style="background:linear-gradient(135deg,#0d9488,#0f766e);color:#fff !important;font-weight:700">← Quay lại</button>';
    h += '<button class="bpc-modal-btn cancel" onclick="var m=document.getElementById(\'_bpcDetailModal\');if(m){m.classList.remove(\'show\');setTimeout(function(){m.remove()},300);closeModal();}" style="background:#f1f5f9;color:#475569;font-weight:700">Đóng</button>';
    h += '</div>';
    h += '</div>';

    overlay.innerHTML = h;
    document.body.appendChild(overlay);
    requestAnimationFrame(function() { overlay.classList.add('show'); });

    try {
        var res = await apiCall('/api/cutting/records/' + cuttingRecordId);
        if (!res || !res.record) {
            document.getElementById('_kvCutDetailBody').innerHTML = '<div style="color:#dc2626;font-weight:700;padding:20px;">Không tìm thấy thông tin đơn cắt</div>';
            return;
        }
        var r = res.record;
        var rolls = [];
        try { rolls = typeof r.selected_roll_ids === 'string' ? JSON.parse(r.selected_roll_ids) : (r.selected_roll_ids || []); } catch(e) {}
        
        var statusTxt = r.is_cut_done ? '✅ Đã cắt xong' : r.is_cutting ? '✂️ Đang cắt' : '📋 Chờ cắt';
        var statusBg = r.is_cut_done ? '#059669' : r.is_cutting ? '#dc2626' : '#6366f1';

        // Update header background and status text
        var headerEl = overlay.querySelector('.bpc-modal-header');
        if (headerEl) {
            headerEl.style.background = 'linear-gradient(135deg,' + statusBg + ',' + statusBg + 'cc)';
            headerEl.querySelector('.m-sub').textContent = statusTxt;
        }

        var bodyHTML = '';
        // Order info
        bodyHTML += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">📋 Màu</span><span class="bpc-modal-val"><span style="background:#1e293b;color:#fff;padding:2px 10px;border-radius:6px;font-size:12px;font-weight:700">' + (r.fabric_color||'—') + '</span></span></div>';
        bodyHTML += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">🏷️ Sản Phẩm Cắt</span><span class="bpc-modal-val"><span style="background:#dbeafe;color:#1d4ed8;padding:2px 10px;border-radius:6px;font-size:12px;font-weight:700">' + (r.cutting_category||'—') + '</span></span></div>';
        bodyHTML += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">👤 NV Cắt</span><span class="bpc-modal-val" style="color:#059669">' + (r.cutter_name||'—') + '</span></div>';
        
        var cutDoneStr = '—';
        if (r.cut_done_at) {
            try {
                var dObj = new Date(r.cut_done_at);
                var formatter = new Intl.DateTimeFormat('vi-VN', {
                    timeZone: 'Asia/Ho_Chi_Minh',
                    hour: '2-digit',
                    minute: '2-digit',
                    day: '2-digit',
                    month: '2-digit',
                    hour12: false
                });
                var parts = formatter.formatToParts(dObj);
                var hour = '', minute = '', day = '', month = '';
                for (var i = 0; i < parts.length; i++) {
                    if (parts[i].type === 'hour') hour = parts[i].value;
                    else if (parts[i].type === 'minute') minute = parts[i].value;
                    else if (parts[i].type === 'day') day = parts[i].value;
                    else if (parts[i].type === 'month') month = parts[i].value;
                }
                cutDoneStr = hour + ':' + minute + ' ' + day + '/' + month;
            } catch(e) {
                cutDoneStr = '—';
            }
        } else if (r.cut_date) {
            var cDate = new Date(r.cut_date);
            cutDoneStr = String(cDate.getDate()).padStart(2,'0') + '/' + String(cDate.getMonth()+1).padStart(2,'0') + '/' + cDate.getFullYear();
        }
        bodyHTML += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">📅 Cắt Xong</span><span class="bpc-modal-val">' + cutDoneStr + '</span></div>';
        bodyHTML += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">📦 SL Đơn</span><span class="bpc-modal-val" style="color:#0369a1;font-size:15px">' + (r.order_quantity||'—') + '</span></div>';
        
        // Selected rolls
        bodyHTML += '<div style="border-top:2px solid #e2e8f0;margin:12px 0;padding-top:12px;text-align:left;"><div style="font-size:11px;font-weight:800;color:#059669;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">📦 CÂY VẢI ĐÃ CHỌN (' + rolls.length + ')</div>';
        if (rolls.length) {
            rolls.forEach(function(rl, idx) {
                bodyHTML += '<div style="padding:8px 14px;border:1.5px solid #f1f5f9;border-radius:10px;margin-bottom:6px;font-size:13px;font-weight:600;color:#1e293b">' + (rl.label || rl.roll_code || 'Cây '+(idx+1)) + '</div>';
            });
        } else {
            bodyHTML += '<div style="text-align:center;padding:12px;color:#94a3b8;font-size:12px">Chưa có dữ liệu cây vải</div>';
        }
        bodyHTML += '</div>';
        
        // Kg stats
        bodyHTML += '<div style="border-top:2px solid #e2e8f0;margin:12px 0;padding-top:12px">';
        bodyHTML += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">';
        bodyHTML += '<div style="background:#fef3c7;padding:10px;border-radius:10px;text-align:center"><div style="font-size:9px;font-weight:700;color:#92400e">⚖️ KG ĐẦU</div><div style="font-size:18px;font-weight:900;color:#b45309">' + (r.kg_start||'—') + '</div></div>';
        bodyHTML += '<div style="background:#fee2e2;padding:10px;border-radius:10px;text-align:center"><div style="font-size:9px;font-weight:700;color:#991b1b">⚖️ KG CUỐI</div><div style="font-size:18px;font-weight:900;color:#dc2626">' + (r.kg_end||'—') + '</div></div>';
        bodyHTML += '<div style="background:#dcfce7;padding:10px;border-radius:10px;text-align:center"><div style="font-size:9px;font-weight:700;color:#166534">✂️ KG CẮT</div><div style="font-size:18px;font-weight:900;color:#059669">' + (r.kg_cut||'—') + '</div></div>';
        bodyHTML += '<div style="background:#dbeafe;padding:10px;border-radius:10px;text-align:center"><div style="font-size:9px;font-weight:700;color:#1e40af">📦 SL CẮT</div><div style="font-size:18px;font-weight:900;color:#2563eb">' + (r.cut_quantity||'—') + '</div></div>';
        bodyHTML += '</div></div>';
        
        // Ratio
        if (r.cut_ratio) {
            var rc = Number(r.cut_ratio) > 5 ? '#dc2626' : Number(r.cut_ratio) > 3 ? '#f59e0b' : '#059669';
            bodyHTML += '<div style="border-top:2px solid #e2e8f0;margin:12px 0;padding-top:12px">';
            bodyHTML += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">📊 Tỉ Lệ</span><span class="bpc-modal-val" style="color:'+rc+';font-size:18px">' + r.cut_ratio + '</span></div>';
            if (r.ratio_reason) bodyHTML += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">📝 Lý do</span><span class="bpc-modal-val" style="font-size:11px;color:#64748b;white-space:pre-wrap;text-align:right;">' + r.ratio_reason + '</span></div>';
            bodyHTML += '</div>';
        }
        
        // Warning + shared
        if (r.cut_warning) bodyHTML += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">⚠️ Cảnh Báo</span><span class="bpc-modal-val" style="color:#dc2626">' + r.cut_warning + '</span></div>';
        
        var cutSharedVal = '';
        if (r.cut_shared) {
            cutSharedVal = r.cut_shared;
        }
        if (cutSharedVal) {
            bodyHTML += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">🔄 Cắt Chung</span><span class="bpc-modal-val" style="color:#6366f1;white-space:pre-line;line-height:1.5;font-size:10px;text-align:right;">' + cutSharedVal + '</span></div>';
        }
        
        document.getElementById('_kvCutDetailBody').innerHTML = bodyHTML;
    } catch(e) {
        document.getElementById('_kvCutDetailBody').innerHTML = '<div style="color:#dc2626;font-weight:700;padding:20px;">Lỗi tải dữ liệu: ' + e.message + '</div>';
    }
}
window._kvOpenCuttingDetail = _kvOpenCuttingDetail;

async function _kvToggleActive(id, newState) {
    if (_kv.isLocked) { showToast('Kho vải đang khóa để kiểm kho!', 'error'); return; }
    var colRecord = _kv.summary.find(function(x) { return x.id === id; });
    if (colRecord) {
        if (colRecord.color_stop_import === true || colRecord.allowed_import_slips !== null) {
            showToast('Màu vải đang ở trạng thái dừng nhập hoặc giới hạn nhập. Vui lòng mở nhập vĩnh viễn trước khi thay đổi trạng thái bán!', 'error');
            return;
        }
    }
    if (!newState) {
        if (!confirm('Bạn có chắc chắn muốn dừng bán màu vải này?')) return;
        try {
            var res = await apiCall('/api/khovai/colors/' + id + '/toggle', 'PUT', { is_active: false });
            if (res.success) {
                showToast('Đã dừng bán màu vải thành công!', 'success');
                _kvLoadSummary();
                try {
                    var treeData = await apiCall('/api/khovai/tree');
                    _kv.tree = treeData.tree || [];
                    _kvRenderSidebar();
                } catch(e) {}
            } else {
                showToast(res.error || 'Lỗi khi cập nhật trạng thái', 'error');
            }
        } catch(e) {
            showToast('Lỗi kết nối: ' + e.message, 'error');
        }
        return;
    }
    
    if (!confirm('Bạn có chắc chắn muốn mở bán vĩnh viễn màu vải này?')) return;
    try {
        var res = await apiCall('/api/khovai/colors/' + id + '/toggle', 'PUT', { is_active: true, allowed_slips: null });
        if (res.success) {
            showToast('Đã mở bán màu vải thành công!', 'success');
            _kvLoadSummary();
            try {
                var treeData = await apiCall('/api/khovai/tree');
                _kv.tree = treeData.tree || [];
                _kvRenderSidebar();
            } catch(e) {}
        } else {
            showToast(res.error || 'Lỗi khi cập nhật trạng thái', 'error');
        }
    } catch(e) {
        showToast('Lỗi kết nối: ' + e.message, 'error');
    }
}
window._kvToggleActive = _kvToggleActive;

function _kvShowActiveSlipsModal(colorId) {
    var colRecord = _kv.summary.find(function(x) { return x.id === colorId; });
    if (colRecord) {
        if (colRecord.color_stop_import === true || colRecord.allowed_import_slips !== null) {
            showToast('Màu vải đang ở trạng thái dừng nhập hoặc giới hạn nhập. Vui lòng mở nhập vĩnh viễn trước khi thay đổi trạng thái bán!', 'error');
            return;
        }
    }
    const modalHtml = `
        <div class="kk-modal-overlay" id="kvActiveSlipsModal" style="position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(15,23,42,0.6); z-index:99999; display:flex; align-items:center; justify-content:center; padding:20px; backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px);">
            <div class="kk-modal" style="background:#fff; border-radius:16px; width:100%; max-width:440px; box-shadow:0 25px 60px rgba(0,0,0,0.25); overflow:hidden; font-family:Inter,system-ui,sans-serif; transform:scale(1); transition:transform 0.3s cubic-bezier(0.34,1.56,0.64,1);">
                <div class="kk-modal-header" style="display:flex; justify-content:space-between; align-items:center; padding:16px 20px; border-bottom:1px solid #e2e8f0; background:linear-gradient(135deg,#059669,#10b981); color:#fff;">
                    <div class="kk-modal-title" style="font-size:15px; font-weight:800; display:flex; align-items:center; gap:6px;">🟢 Mở Bán Màu Vải</div>
                    <button onclick="_kvCloseActiveSlipsModal()" style="background:rgba(255,255,255,0.2); border:none; color:#fff; border-radius:6px; padding:4px 10px; cursor:pointer; font-size:12px; font-weight:700;">✕ Đóng</button>
                </div>
                <div class="kk-modal-body" style="padding:24px; display:flex; flex-direction:column; gap:16px; font-size:13px; color:#334155;">
                    <div style="font-weight:600; color:#1e293b; font-size:14px; text-align:center;">Vui lòng chọn hình thức mở bán:</div>
                    
                    <label style="display:flex; align-items:center; gap:10px; cursor:pointer; padding:12px 16px; border:1px solid #e2e8f0; border-radius:10px; background:#f8fafc; transition:all 0.2s;" onmouseover="this.style.borderColor='#10b981'" onmouseout="if(!document.getElementById('activeSlipsOptionForever').checked) this.style.borderColor='#e2e8f0'">
                        <input type="radio" id="activeSlipsOptionForever" name="activeSlipsOption" value="forever" checked style="width:16px; height:16px; accent-color:#10b981;" onchange="_kvToggleSlipsInput(false)">
                        <div>
                            <div style="font-weight:700; color:#0f172a;">Mở bán vĩnh viễn</div>
                            <div style="font-size:11px; color:#64748b; margin-top:2px;">Tạo phiếu và đơn thoải mái không giới hạn</div>
                        </div>
                    </label>

                    <label style="display:flex; align-items:center; gap:10px; cursor:pointer; padding:12px 16px; border:1px solid #e2e8f0; border-radius:10px; background:#f8fafc; transition:all 0.2s;" onmouseover="this.style.borderColor='#10b981'" onmouseout="if(!document.getElementById('activeSlipsOptionLimit').checked) this.style.borderColor='#e2e8f0'">
                        <input type="radio" id="activeSlipsOptionLimit" name="activeSlipsOption" value="limit" style="width:16px; height:16px; accent-color:#10b981;" onchange="_kvToggleSlipsInput(true)">
                        <div>
                            <div style="font-weight:700; color:#0f172a;">Mở giới hạn theo số đơn hàng</div>
                            <div style="font-size:11px; color:#64748b; margin-top:2px;">Đạt đủ số lượng đơn hàng sẽ tự động ẩn màu vải</div>
                        </div>
                    </label>

                    <div id="activeSlipsCountContainer" style="display:none; flex-direction:column; gap:6px; margin-top:4px;">
                        <span style="color:#475569; font-weight:700; font-size:12px;">Số lượng đơn giới hạn:</span>
                        <input type="number" id="activeSlipsCountInput" value="1" min="1" step="1" style="width:100%; padding:10px 14px; border:1.5px solid #d9f9e6; border-radius:8px; font-size:15px; font-weight:700; color:#059669; background:#f0fdf4; outline:none; text-align:center;">
                    </div>
                </div>
                <div class="kk-modal-footer" style="background:#f8fafc; display:flex; gap:10px; padding:16px 24px; border-top:1px solid #f1f5f9;">
                    <button class="kk-btn kk-btn-secondary" onclick="_kvCloseActiveSlipsModal()" style="flex:1; background:#e2e8f0; color:#475569; border:none; padding:12px; border-radius:10px; font-size:14px; font-weight:700; cursor:pointer; transition:all 0.2s;">Hủy</button>
                    <button class="kk-btn kk-btn-primary" onclick="_kvSubmitActiveSlips(${colorId})" style="flex:1; background:linear-gradient(135deg,#059669,#10b981); color:#fff; border:none; padding:12px; border-radius:10px; font-size:14px; font-weight:700; cursor:pointer; box-shadow:0 4px 15px rgba(16,185,129,0.3); transition:all 0.2s;">Xác nhận</button>
                </div>
            </div>
        </div>
    `;

    const oldContainer = document.getElementById('kvActiveSlipsModalContainer');
    if (oldContainer) oldContainer.remove();

    const div = document.createElement('div');
    div.id = 'kvActiveSlipsModalContainer';
    div.innerHTML = modalHtml;
    document.body.appendChild(div);
}

function _kvCloseActiveSlipsModal() {
    const container = document.getElementById('kvActiveSlipsModalContainer');
    if (container) container.remove();
}

function _kvToggleSlipsInput(show) {
    const container = document.getElementById('activeSlipsCountContainer');
    if (container) {
        container.style.display = show ? 'flex' : 'none';
        if (show) {
            document.getElementById('activeSlipsCountInput').focus();
        }
    }
}

async function _kvSubmitActiveSlips(colorId) {
    const isLimit = document.getElementById('activeSlipsOptionLimit').checked;
    let allowedSlips = null;
    if (isLimit) {
        const valStr = document.getElementById('activeSlipsCountInput').value;
        const val = parseInt(valStr);
        if (isNaN(val) || val <= 0) {
            showToast('Vui lòng nhập số đơn giới hạn hợp lệ (lớn hơn 0)!', 'error');
            return;
        }
        allowedSlips = val;
    }

    _kvCloseActiveSlipsModal();

    try {
        var res = await apiCall('/api/khovai/colors/' + colorId + '/toggle', 'PUT', { 
            is_active: true,
            allowed_slips: allowedSlips
        });
        if (res.success) {
            showToast('Đã mở bán màu vải thành công!', 'success');
            _kvLoadSummary();
            try {
                var treeData = await apiCall('/api/khovai/tree');
                _kv.tree = treeData.tree || [];
                _kvRenderSidebar();
            } catch(e) {}
        } else {
            showToast(res.error || 'Lỗi khi cập nhật trạng thái', 'error');
        }
    } catch(e) {
        showToast('Lỗi kết nối: ' + e.message, 'error');
    }
}

window._kvShowActiveSlipsModal = _kvShowActiveSlipsModal;
window._kvCloseActiveSlipsModal = _kvCloseActiveSlipsModal;
window._kvToggleSlipsInput = _kvToggleSlipsInput;
window._kvSubmitActiveSlips = _kvSubmitActiveSlips;

async function _kvToggleStopImport(id, newState) {
    if (_kv.isLocked) { showToast('Kho vải đang khóa để kiểm kho!', 'error'); return; }
    var colRecord = _kv.summary.find(function(x) { return x.id === id; });
    if (colRecord) {
        if (colRecord.is_active === false || colRecord.allowed_slips !== null) {
            showToast('Màu vải đang ở trạng thái ẩn bán hoặc giới hạn bán. Vui lòng mở bán vĩnh viễn trước khi thay đổi trạng thái nhập!', 'error');
            return;
        }
    }
    if (newState) {
        if (!confirm('Bạn có chắc chắn muốn dừng nhập vải màu này?')) return;
        try {
            var res = await apiCall('/api/khovai/colors/' + id, 'PUT', { stop_import: true });
            if (res.success) {
                showToast('Đã dừng nhập vải thành công!', 'success');
                _kvLoadSummary();
            } else {
                showToast(res.error || 'Lỗi khi cập nhật trạng thái', 'error');
            }
        } catch(e) {
            showToast('Lỗi kết nối: ' + e.message, 'error');
        }
    } else {
        if (!confirm('Bạn có chắc chắn muốn mở nhập vải vĩnh viễn màu vải này?')) return;
        try {
            var res = await apiCall('/api/khovai/colors/' + id, 'PUT', { stop_import: false, allowed_import_slips: null });
            if (res.success) {
                showToast('Đã mở nhập màu vải thành công!', 'success');
                _kvLoadSummary();
            } else {
                showToast(res.error || 'Lỗi khi cập nhật trạng thái', 'error');
            }
        } catch(e) {
            showToast('Lỗi kết nối: ' + e.message, 'error');
        }
    }
}
window._kvToggleStopImport = _kvToggleStopImport;

function _kvShowImportSlipsModal(colorId) {
    var colRecord = _kv.summary.find(function(x) { return x.id === colorId; });
    if (colRecord) {
        if (colRecord.is_active === false || colRecord.allowed_slips !== null) {
            showToast('Màu vải đang ở trạng thái ẩn bán hoặc giới hạn bán. Vui lòng mở bán vĩnh viễn trước khi thay đổi trạng thái nhập!', 'error');
            return;
        }
    }
    const modalHtml = `
        <div class="kk-modal-overlay" id="kvImportSlipsModalContainer" style="position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(15,23,42,0.6); z-index:99999; display:flex; align-items:center; justify-content:center; padding:20px; backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px);">
            <div class="kk-modal" style="background:#fff; border-radius:16px; width:100%; max-width:440px; box-shadow:0 25px 60px rgba(0,0,0,0.25); overflow:hidden; font-family:Inter,system-ui,sans-serif; transform:scale(1); transition:transform 0.3s cubic-bezier(0.34,1.56,0.64,1);">
                <div class="kk-modal-header" style="display:flex; justify-content:space-between; align-items:center; padding:16px 20px; border-bottom:1px solid #e2e8f0; background:linear-gradient(135deg,#d97706,#f59e0b); color:#fff;">
                    <div class="kk-modal-title" style="font-size:15px; font-weight:800; display:flex; align-items:center; gap:6px;">📥 Mở Nhập Màu Vải</div>
                    <button onclick="_kvCloseImportSlipsModal()" style="background:rgba(255,255,255,0.2); border:none; color:#fff; border-radius:6px; padding:4px 10px; cursor:pointer; font-size:12px; font-weight:700;">✕ Đóng</button>
                </div>
                <div class="kk-modal-body" style="padding:24px; display:flex; flex-direction:column; gap:16px; font-size:13px; color:#334155;">
                    <div style="font-weight:600; color:#1e293b; font-size:14px; text-align:center;">Vui lòng chọn hình thức mở nhập:</div>
                    
                    <label style="display:flex; align-items:center; gap:10px; cursor:pointer; padding:12px 16px; border:1px solid #e2e8f0; border-radius:10px; background:#f8fafc; transition:all 0.2s;" onmouseover="this.style.borderColor='#f59e0b'" onmouseout="if(!document.getElementById('importSlipsOptionForever').checked) this.style.borderColor='#e2e8f0'">
                        <input type="radio" id="importSlipsOptionForever" name="importSlipsOption" value="forever" checked style="width:16px; height:16px; accent-color:#f59e0b;" onchange="_kvToggleImportSlipsInput(false)">
                        <div>
                            <div style="font-weight:700; color:#0f172a;">Nhập vĩnh viễn</div>
                            <div style="font-size:11px; color:#64748b; margin-top:2px;">Tạo phiếu và đơn thoải mái không giới hạn</div>
                        </div>
                    </label>

                    <label style="display:flex; align-items:center; gap:10px; cursor:pointer; padding:12px 16px; border:1px solid #e2e8f0; border-radius:10px; background:#f8fafc; transition:all 0.2s;" onmouseover="this.style.borderColor='#f59e0b'" onmouseout="if(!document.getElementById('importSlipsOptionLimit').checked) this.style.borderColor='#e2e8f0'">
                        <input type="radio" id="importSlipsOptionLimit" name="importSlipsOption" value="limit" style="width:16px; height:16px; accent-color:#f59e0b;" onchange="_kvToggleImportSlipsInput(true)">
                        <div>
                            <div style="font-weight:700; color:#0f172a;">Nhập giới hạn theo số đơn hàng</div>
                            <div style="font-size:11px; color:#64748b; margin-top:2px;">Đạt đủ số lượng đơn hàng sẽ tự động dừng nhập màu vải</div>
                        </div>
                    </label>

                    <div id="importSlipsCountContainer" style="display:none; flex-direction:column; gap:6px; margin-top:4px;">
                        <span style="color:#475569; font-weight:700; font-size:12px;">Số lượng đơn giới hạn:</span>
                        <input type="number" id="importSlipsCountInput" value="1" min="1" step="1" style="width:100%; padding:10px 14px; border:1.5px solid #fef3c7; border-radius:8px; font-size:15px; font-weight:700; color:#d97706; background:#fffbeb; outline:none; text-align:center;">
                    </div>
                </div>
                <div class="kk-modal-footer" style="background:#f8fafc; display:flex; gap:10px; padding:16px 24px; border-top:1px solid #f1f5f9;">
                    <button class="kk-btn kk-btn-secondary" onclick="_kvCloseImportSlipsModal()" style="flex:1; background:#e2e8f0; color:#475569; border:none; padding:12px; border-radius:10px; font-size:14px; font-weight:700; cursor:pointer; transition:all 0.2s;">Hủy</button>
                    <button class="kk-btn kk-btn-primary" onclick="_kvSubmitImportSlips(${colorId})" style="flex:1; background:linear-gradient(135deg,#d97706,#f59e0b); color:#fff; border:none; padding:12px; border-radius:10px; font-size:14px; font-weight:700; cursor:pointer; box-shadow:0 4px 15px rgba(245,158,11,0.3); transition:all 0.2s;">Xác nhận</button>
                </div>
            </div>
        </div>
    `;

    const oldContainer = document.getElementById('kvImportSlipsModalContainer');
    if (oldContainer) oldContainer.remove();

    const div = document.createElement('div');
    div.id = 'kvImportSlipsModalContainer';
    div.innerHTML = modalHtml;
    document.body.appendChild(div);
}

function _kvCloseImportSlipsModal() {
    const container = document.getElementById('kvImportSlipsModalContainer');
    if (container) container.remove();
}

function _kvToggleImportSlipsInput(show) {
    const container = document.getElementById('importSlipsCountContainer');
    if (container) {
        container.style.display = show ? 'flex' : 'none';
        if (show) {
            document.getElementById('importSlipsCountInput').focus();
        }
    }
}

async function _kvSubmitImportSlips(colorId) {
    const isLimit = document.getElementById('importSlipsOptionLimit').checked;
    let allowedImportSlips = null;
    if (isLimit) {
        const valStr = document.getElementById('importSlipsCountInput').value;
        const val = parseInt(valStr);
        if (isNaN(val) || val <= 0) {
            showToast('Vui lòng nhập số đơn giới hạn hợp lệ (lớn hơn 0)!', 'error');
            return;
        }
        allowedImportSlips = val;
    }

    _kvCloseImportSlipsModal();

    try {
        var res = await apiCall('/api/khovai/colors/' + colorId, 'PUT', { 
            stop_import: false,
            allowed_import_slips: allowedImportSlips
        });
        if (res.success) {
            showToast('Đã mở nhập màu vải thành công!', 'success');
            _kvLoadSummary();
        } else {
            showToast(res.error || 'Lỗi khi cập nhật trạng thái', 'error');
        }
    } catch(e) {
        showToast('Lỗi kết nối: ' + e.message, 'error');
    }
}

window._kvShowImportSlipsModal = _kvShowImportSlipsModal;
window._kvCloseImportSlipsModal = _kvCloseImportSlipsModal;
window._kvToggleImportSlipsInput = _kvToggleImportSlipsInput;
window._kvSubmitImportSlips = _kvSubmitImportSlips;

async function _kvToggleMatStop(id, newState) {
    if (_kv.isLocked) { showToast('Kho vải đang khóa để kiểm kho!', 'error'); return; }
    var actionText = newState ? 'dừng nhập' : 'cho phép nhập mới';
    if (!confirm('Bạn có chắc chắn muốn ' + actionText + ' chất liệu này?')) return;
    try {
        var res = await apiCall('/api/khovai/materials/' + id, 'PUT', { stop_import: newState });
        if (res.success) {
            showToast('Đã cập nhật trạng thái dừng nhập thành công!', 'success');
            // Reload sidebar tree and main list
            var treeData = await apiCall('/api/khovai/tree');
            _kv.tree = treeData.tree || [];
            _kvRenderSidebar();
            _kvLoadSummary();
        } else {
            showToast(res.error || 'Lỗi khi cập nhật trạng thái', 'error');
        }
    } catch(e) {
        showToast('Lỗi kết nối: ' + e.message, 'error');
    }
}
window._kvToggleMatStop = _kvToggleMatStop;

function _kvOnActiveFilterChange(val) {
    _kv.activeFilter = val;
    _kvRenderTable();
}
window._kvOnActiveFilterChange = _kvOnActiveFilterChange;

async function _kvOpenRollOrigin(rollId) {
    try {
        const r = await apiCall('/api/stockcheck/roll-origin/' + rollId);
        if (!r) {
            showToast('Không lấy được thông tin nguồn gốc cây vải', 'error');
            return;
        }

        const isNguyen = Number(r.weight) === Number(r.original_weight);
        const typeLabel = isNguyen 
            ? '<span style="background:#f0fdf4; color:#16a34a; border:1px solid #bbf7d0; padding:3px 8px; border-radius:6px; font-size:11px; font-weight:700;">🌲 Cây Nguyên (Chưa cắt)</span>' 
            : '<span style="background:#fff7ed; color:#ea580c; border:1px solid #ffedd5; padding:3px 8px; border-radius:6px; font-size:11px; font-weight:700;">✂️ Cây Lẻ (Đã cắt dở)</span>';

        const originText = r.source === 'kiem_kho_du'
            ? '<strong style="color:#7c3aed;">💜 Báo dư từ đợt kiểm kê</strong>'
            : '<strong>Tạo thủ công / Cắt dư từ đơn hàng</strong>';

        const modalHtml = `
            <div class="kk-modal-overlay" id="kkRollOriginModal" style="position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.55); z-index:99999; display:flex; align-items:center; justify-content:center; padding:20px; backdrop-filter:blur(4px); -webkit-backdrop-filter:blur(4px);">
                <div class="kk-modal" style="background:#fff; border-radius:16px; width:100%; max-width:480px; box-shadow:0 25px 50px rgba(0,0,0,0.25); overflow:hidden; font-family:Inter,system-ui,sans-serif;">
                    <div class="kk-modal-header" style="display:flex; justify-content:space-between; align-items:center; padding:16px 20px; border-bottom:1px solid #e2e8f0; background:linear-gradient(135deg,#7c3aed,#a855f7); color:#fff;">
                        <div class="kk-modal-title" style="font-size:15px; font-weight:800; display:flex; align-items:center; gap:6px;">🔍 Truy Xuất Nguồn Gốc Cây Vải</div>
                        <button onclick="_kvCloseRollOriginModal()" style="background:rgba(255,255,255,0.2); border:none; color:#fff; border-radius:6px; padding:4px 10px; cursor:pointer; font-size:12px; font-weight:700;">✕ Đóng</button>
                    </div>
                    <div class="kk-modal-body" style="padding:20px; display:flex; flex-direction:column; gap:12px; font-size:13px; color:#334155;">
                        <div style="display:flex; justify-content:space-between; border-bottom:1px solid #f1f5f9; padding-bottom:8px;">
                            <span style="color:#64748b; font-weight:600;">Mã Cây Vải:</span>
                            <code style="background:#f1f5f9; padding:2px 6px; border-radius:4px; font-weight:700; color:#0f172a;">${r.roll_code}</code>
                        </div>
                        <div style="display:flex; justify-content:space-between; border-bottom:1px solid #f1f5f9; padding-bottom:8px;">
                            <span style="color:#64748b; font-weight:600;">Xuất Xứ Cây:</span>
                            <span>${originText}</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; border-bottom:1px solid #f1f5f9; padding-bottom:8px;">
                            <span style="color:#64748b; font-weight:600;">Thời Gian Kiểm/Tạo:</span>
                            <span style="font-weight:700;">${r.created_at_formatted}</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; border-bottom:1px solid #f1f5f9; padding-bottom:8px;">
                            <span style="color:#64748b; font-weight:600;">Nhân Viên Thực Hiện:</span>
                            <span style="font-weight:700; color:#3b82f6;">👤 ${r.creator_name}</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; border-bottom:1px solid #f1f5f9; padding-bottom:8px;">
                            <span style="color:#64748b; font-weight:600;">Chất Liệu Vải:</span>
                            <span style="font-weight:700; color:#0f172a;">${r.material_name}</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; border-bottom:1px solid #f1f5f9; padding-bottom:8px;">
                            <span style="color:#64748b; font-weight:600;">Màu Vải:</span>
                            <span style="font-weight:700; color:#0d9488;">🎨 ${r.color_name}</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; border-bottom:1px solid #f1f5f9; padding-bottom:8px;">
                            <span style="color:#64748b; font-weight:600;">Trọng Lượng Lúc Báo Dư:</span>
                            <span style="font-weight:800; color:#059669; font-size:14px;">${r.original_weight} kg</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; border-bottom:1px solid #f1f5f9; padding-bottom:8px;">
                            <span style="color:#64748b; font-weight:600;">Trọng Lượng Hiện Tại:</span>
                            <span style="font-weight:800; color:#0d9488; font-size:14px;">${r.weight} kg</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; border-bottom:1px solid #f1f5f9; padding-bottom:8px;">
                            <span style="color:#64748b; font-weight:600;">Phân Loại Cây:</span>
                            <span>${typeLabel}</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; border-bottom:1px solid #f1f5f9; padding-bottom:8px;">
                            <span style="color:#64748b; font-weight:600;">Vị Trí Kệ Lưu Trữ:</span>
                            <span style="font-weight:700; color:#4f46e5;">📍 ${r.location}</span>
                        </div>
                        <div style="display:flex; flex-direction:column; gap:4px; background:#f8fafc; padding:10px 14px; border-radius:8px; border:1px solid #e2e8f0; text-align:left;">
                            <span style="color:#64748b; font-weight:600; font-size:11px;">Ghi chú chi tiết lúc kiểm:</span>
                            <span style="font-style:italic; color:#475569; font-weight:500; line-height:1.4;">${r.note || 'Không có ghi chú thêm'}</span>
                        </div>
                    </div>
                    <div class="kk-modal-footer" style="background:#fafafa; display:flex; justify-content:flex-end; padding:12px 20px; border-top:1px solid #f1f5f9;">
                        <button class="kk-btn kk-btn-secondary" onclick="_kvCloseRollOriginModal()" style="background:#64748b; color:#fff; border:none; padding:8px 16px; border-radius:8px; font-size:12px; font-weight:700; cursor:pointer;">Đóng</button>
                    </div>
                </div>
            </div>
        `;

        const oldContainer = document.getElementById('kkRollOriginModalContainer');
        if (oldContainer) oldContainer.remove();

        const div = document.createElement('div');
        div.id = 'kkRollOriginModalContainer';
        div.innerHTML = modalHtml;
        document.body.appendChild(div);
    } catch (e) {
        console.error('[KV] Open roll origin detail error:', e);
        showToast('Không lấy được thông tin chi tiết cây vải', 'error');
    }
}
window._kvOpenRollOrigin = _kvOpenRollOrigin;

function _kvCloseRollOriginModal() {
    const el = document.getElementById('kkRollOriginModalContainer');
    if (el) el.remove();
}
window._kvCloseRollOriginModal = _kvCloseRollOriginModal;

async function _kvCreateOrderFromFabric(colorId, materialName, colorName) {
    var isDirector = typeof currentUser !== 'undefined' && currentUser && (
        currentUser.role === 'giam_doc' || 
        currentUser.username === 'trinh' || 
        currentUser.username === 'leviettrinh' || 
        currentUser.username === 'trinh.lvt' || 
        (currentUser.full_name && (currentUser.full_name.indexOf('Lê Việt Trinh') !== -1 || currentUser.full_name.indexOf('Le Viet Trinh') !== -1))
    );
    if (!isDirector) {
        showToast('Bạn không có quyền thực hiện thao tác này!', 'error');
        return;
    }

    var r = _kv.summary.find(function(x) { return x.id === colorId; });
    if (!r) return;
    
    if (r.is_active === false || r.allowed_slips !== null || r.color_stop_import) {
        var defaultVal = r.allowed_slips !== null ? String(r.allowed_slips) : '1';
        _kvShowCreateOrderFromFabricModal(colorId, materialName, colorName, defaultVal);
    } else {
        showToast('Màu vải này đang được mở bán bình thường.', 'info');
    }
}
window._kvCreateOrderFromFabric = _kvCreateOrderFromFabric;

function _kvShowCreateOrderFromFabricModal(colorId, materialName, colorName, defaultVal) {
    const modalHtml = `
        <div class="kk-modal-overlay" id="kvCreateOrderFabricModal" style="position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(15,23,42,0.6); z-index:99999; display:flex; align-items:center; justify-content:center; padding:20px; backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px);">
            <div class="kk-modal" style="background:#fff; border-radius:16px; width:100%; max-width:440px; box-shadow:0 25px 60px rgba(0,0,0,0.25); overflow:hidden; font-family:Inter,system-ui,sans-serif; transform:scale(1); transition:transform 0.3s cubic-bezier(0.34,1.56,0.64,1);">
                <div class="kk-modal-header" style="display:flex; justify-content:space-between; align-items:center; padding:16px 20px; border-bottom:1px solid #e2e8f0; background:linear-gradient(135deg,#b8860b,#daa520); color:#fff;">
                    <div class="kk-modal-title" style="font-size:15px; font-weight:800; display:flex; align-items:center; gap:6px;">✨ Cấp Thêm Đơn Hàng</div>
                    <button onclick="_kvCloseCreateOrderFabricModal()" style="background:rgba(255,255,255,0.2); border:none; color:#fff; border-radius:6px; padding:4px 10px; cursor:pointer; font-size:12px; font-weight:700;">✕ Đóng</button>
                </div>
                <div class="kk-modal-body" style="padding:24px; display:flex; flex-direction:column; gap:16px; font-size:13px; color:#334155;">
                    <div style="font-weight:600; color:#1e293b; font-size:14px; text-align:center; line-height: 1.5;">
                        Màu vải <b style="color:#b8860b;">${materialName} - ${colorName}</b> đang dừng bán (giới hạn).
                    </div>
                    <div style="font-size:13px; color:#64748b; text-align:center; margin-top:-8px;">
                        Bạn muốn cho phép tạo thêm bao nhiêu đơn hàng cho Sale nhập?
                    </div>
                    
                    <div style="display:flex; flex-direction:column; gap:6px; align-items:center; margin-top:8px;">
                        <input type="number" id="createOrderSlipsCountInput" value="${defaultVal}" min="1" step="1" style="width:120px; padding:10px 14px; border:2px solid #daa520; border-radius:10px; font-size:20px; font-weight:800; color:#b8860b; background:#fffdf5; outline:none; text-align:center; box-shadow:0 2px 8px rgba(218,165,32,0.1);">
                    </div>
                </div>
                <div class="kk-modal-footer" style="background:#f8fafc; display:flex; gap:10px; padding:16px 24px; border-top:1px solid #f1f5f9;">
                    <button class="kk-btn kk-btn-secondary" onclick="_kvCloseCreateOrderFabricModal()" style="flex:1; background:#e2e8f0; color:#475569; border:none; padding:12px; border-radius:10px; font-size:14px; font-weight:700; cursor:pointer; transition:all 0.2s;">Hủy</button>
                    <button class="kk-btn kk-btn-primary" onclick="_kvSubmitCreateOrderFabric(${colorId})" style="flex:1; background:linear-gradient(135deg,#b8860b,#daa520); color:#fff; border:none; padding:12px; border-radius:10px; font-size:14px; font-weight:700; cursor:pointer; box-shadow:0 4px 15px rgba(218,165,32,0.3); transition:all 0.2s;">Xác nhận</button>
                </div>
            </div>
        </div>
    `;

    const oldContainer = document.getElementById('kvCreateOrderFabricModalContainer');
    if (oldContainer) oldContainer.remove();

    const div = document.createElement('div');
    div.id = 'kvCreateOrderFabricModalContainer';
    div.innerHTML = modalHtml;
    document.body.appendChild(div);
    
    setTimeout(() => {
        const input = document.getElementById('createOrderSlipsCountInput');
        if (input) {
            input.focus();
            input.select();
        }
    }, 100);
}
window._kvShowCreateOrderFromFabricModal = _kvShowCreateOrderFromFabricModal;

function _kvCloseCreateOrderFabricModal() {
    const container = document.getElementById('kvCreateOrderFabricModalContainer');
    if (container) container.remove();
}
window._kvCloseCreateOrderFabricModal = _kvCloseCreateOrderFabricModal;

async function _kvSubmitCreateOrderFabric(colorId) {
    const input = document.getElementById('createOrderSlipsCountInput');
    if (!input) return;
    const count = parseInt(input.value, 10);
    if (isNaN(count) || count <= 0) {
        showToast('Số lượng đơn hàng không hợp lệ!', 'error');
        return;
    }

    _kvCloseCreateOrderFabricModal();

    try {
        var res = await apiCall('/api/khovai/colors/' + colorId + '/toggle', 'PUT', {
            is_active: true,
            allowed_slips: count
        });
        if (res && res.success) {
            showToast('Đã mở giới hạn ' + count + ' đơn cho màu vải này!', 'success');
            _kvLoadSummary();
            try {
                var treeData = await apiCall('/api/khovai/tree');
                _kv.tree = treeData.tree || [];
                _kvRenderSidebar();
            } catch(e) {}
        } else {
            showToast((res && res.error) || 'Lỗi khi mở bán giới hạn', 'error');
        }
    } catch(e) {
        showToast('Lỗi kết nối: ' + e.message, 'error');
    }
}
window._kvSubmitCreateOrderFabric = _kvSubmitCreateOrderFabric;
