// ========== KHO VẬT LIỆU SPA PAGE ==========

var _kvl = {
    tree: null,
    summary: [],
    filter: {
        warehouse_id: null,
        material_item_id: null
    },
    search: '',
    currentMaterialId: null,
    currentMaterialName: ''
};

function renderKhovatlieuPage(content) {
    if (!document.getElementById('_kvlStyle')) {
        var st = document.createElement('style');
        st.id = '_kvlStyle';
        st.textContent = 
            '.kvl-wrap { display: flex; height: calc(100vh - 60px); overflow: hidden; font-family: "Inter", sans-serif; background: #f8fafc; color: #0f172a; }'
            + '.kvl-sb { width: 280px; min-width: 280px; background: #ffffff; border-right: 1px solid #e2e8f0; overflow-y: auto; display: flex; flex-direction: column; }'
            + '.kvl-sb-header { padding: 18px 20px; font-weight: 800; font-size: 13px; letter-spacing: 1px; color: #0284c7; border-bottom: 1px solid #e2e8f0; text-transform: uppercase; text-align: center; }'
            + '.kvl-tree { padding: 12px 8px; flex: 1; overflow-y: auto; }'
            + '.kvl-wh-node { margin-bottom: 6px; }'
            + '.kvl-wh-title { padding: 8px 12px; border-radius: 8px; font-weight: 700; font-size: 12px; color: #334155; display: flex; align-items: center; justify-content: space-between; cursor: pointer; transition: all 0.2s; }'
            + '.kvl-wh-title:hover { background: rgba(0,0,0,0.04); }'
            + '.kvl-wh-title.active { background: rgba(2, 132, 199, 0.1); color: #0284c7; }'
            + '.kvl-wh-items { padding-left: 16px; margin-top: 4px; display: none; }'
            + '.kvl-wh-items.open { display: block; }'
            + '.kvl-item-node { padding: 6px 12px; margin: 2px 0; border-radius: 6px; font-size: 11px; font-weight: 600; color: #475569; display: flex; align-items: center; justify-content: space-between; cursor: pointer; transition: all 0.2s; }'
            + '.kvl-item-node:hover { background: rgba(0,0,0,0.03); color: #0f172a; }'
            + '.kvl-item-node.active { background: linear-gradient(135deg, #0284c7, #0369a1); color: #fff; }'
            + '.kvl-main { flex: 1; min-width: 0; display: flex; flex-direction: column; padding: 20px; overflow-y: auto; }'
            + '.kvl-header-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }'
            + '.kvl-title-section h2 { margin: 0; font-size: 20px; font-weight: 800; color: #0f172a; }'
            + '.kvl-title-section p { margin: 4px 0 0 0; font-size: 12px; color: #475569; }'
            + '.kvl-search-input { background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; color: #0f172a; padding: 8px 16px; font-size: 12px; width: 240px; outline: none; transition: all 0.2s; }'
            + '.kvl-search-input:focus { border-color: #0284c7; box-shadow: 0 0 0 2px rgba(2,132,199,0.2); }'
            + '.kvl-stats-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 20px; }'
            + '.kvl-stat-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; display: flex; flex-direction: column; justify-content: center; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }'
            + '.kvl-stat-card .label { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px; }'
            + '.kvl-stat-card .val { font-size: 20px; font-weight: 900; color: #0f172a; margin-top: 6px; }'
            + '.kvl-stat-card.blue { border-left: 4px solid #0284c7; }'
            + '.kvl-stat-card.amber { border-left: 4px solid #d97706; }'
            + '.kvl-stat-card.emerald { border-left: 4px solid #059669; }'
            + '.kvl-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }'
            + '.kvl-card-body { padding: 12px; overflow-x: auto; }'
            + '.kvl-table { width: 100%; border-collapse: collapse; font-size: 11px; text-align: left; }'
            + '.kvl-table th { background: #f1f5f9; padding: 10px 12px; color: #475569; font-weight: 700; text-transform: uppercase; font-size: 10px; border-bottom: 1px solid #e2e8f0; }'
            + '.kvl-table td { padding: 12px; border-bottom: 1px solid #e2e8f0; color: #1e293b; vertical-align: middle; }'
            + '.kvl-table tbody tr:hover { background: rgba(0,0,0,0.01); }'
            + '.kvl-badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 9px; font-weight: 800; background: #e2e8f0; color: #475569; }'
            + '.kvl-badge.purple { background: rgba(124,58,237,0.1); color: #6d28d9; border: 1px solid rgba(124,58,237,0.2); }'
            + '.kvl-badge.emerald { background: rgba(16,185,129,0.1); color: #047857; border: 1px solid rgba(16,185,129,0.2); }'
            + '.kvl-badge.rose { background: rgba(244,63,94,0.1); color: #be123c; border: 1px solid rgba(244,63,94,0.2); }'
            + '.kvl-badge.zero { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; }'
            + '.kvl-btn { padding: 6px 12px; font-size: 11px; font-weight: 700; border-radius: 6px; cursor: pointer; border: none; transition: all 0.2s; display: inline-flex; align-items: center; gap: 4px; }'
            + '.kvl-btn-primary { background: #0284c7; color: #fff; }'
            + '.kvl-btn-primary:hover { background: #0369a1; }'
            + '.kvl-btn-secondary { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; }'
            + '.kvl-btn-secondary:hover { background: #e2e8f0; }'
            + '.kvl-modal { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; }'
            + '.kvl-modal-content { background: #ffffff; border: 1px solid #cbd5e1; border-radius: 16px; width: 900px; max-width: 95%; max-height: 90vh; display: flex; flex-direction: column; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); animation: kvlFadeIn 0.2s ease-out; color: #0f172a; }'
            + '.kvl-modal-header { padding: 16px 20px; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between; }'
            + '.kvl-modal-header h3 { margin: 0; font-size: 15px; font-weight: 800; color: #0f172a; }'
            + '.kvl-close-btn { font-size: 20px; cursor: pointer; color: #64748b; transition: color 0.2s; }'
            + '.kvl-close-btn:hover { color: #0f172a; }'
            + '.kvl-modal-body { padding: 20px; overflow-y: auto; flex: 1; }'
            + '.kvl-modal-stats { display: flex; gap: 16px; margin-bottom: 20px; }'
            + '.kvl-modal-stat-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 16px; flex: 1; }'
            + '.kvl-modal-stat-card span { font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase; }'
            + '.kvl-modal-stat-card h4 { margin: 4px 0 0 0; font-size: 16px; font-weight: 900; color: #0284c7; }'
            + '.kvl-modal-actions-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }'
            + '.kvl-modal-actions-row h4 { margin: 0; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #475569; }'
            + '.kvl-modal-table { width: 100%; border-collapse: collapse; font-size: 11px; text-align: left; }'
            + '.kvl-modal-table th { background: #f1f5f9; padding: 8px 10px; color: #475569; border-bottom: 1px solid #e2e8f0; }'
            + '.kvl-modal-table td { padding: 10px 8px; border-bottom: 1px solid #e2e8f0; color: #1e293b; }'
            + '.kvl-nested-table { width: 100%; border-collapse: collapse; font-size: 10px; margin-top: 4px; background: #ffffff; border-radius: 6px; overflow: hidden; border: 1px solid #e2e8f0; }'
            + '.kvl-nested-table th { background: rgba(2, 132, 199, 0.08); padding: 6px 8px; color: #0284c7; font-weight: 700; border-bottom: 1px solid #cbd5e1; }'
            + '.kvl-nested-table td { padding: 6px 8px; border-bottom: 1px solid #f1f5f9; color: #334155; }'
            + '.kvl-nested-wrap { padding: 8px 12px; border-left: 3px solid #7c3aed; background: rgba(124,58,237,0.02); border-radius: 4px; margin: 4px 0; }'
            + '.kvl-link-badge { cursor: pointer; display: inline-flex; align-items: center; gap: 4px; padding: 2px 6px; border-radius: 4px; background: rgba(124,58,237,0.1); color: #6d28d9; font-weight: 700; font-size: 9px; transition: all 0.2s; }'
            + '.kvl-link-badge:hover { background: #7c3aed; color: #fff; }'
            + '.kvl-form-group { margin-bottom: 12px; }'
            + '.kvl-form-group label { display: block; font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase; margin-bottom: 4px; }'
            + '.kvl-form-group input, .kvl-form-group select, .kvl-form-group textarea { width: 100%; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; color: #0f172a; padding: 8px; font-size: 12px; outline: none; }'
            + '.kvl-form-group input:focus, .kvl-form-group select:focus, .kvl-form-group textarea:focus { border-color: #0284c7; }'
            + '@keyframes kvlFadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }';
        document.head.appendChild(st);
    }

    content.innerHTML = 
        '<div class="kvl-wrap">'
        + '<div class="kvl-sb" id="kvlSb"><div style="padding:20px;text-align:center;color:#64748b;font-size:11px">Đang tải...</div></div>'
        + '<div class="kvl-main">'
        +   '<div class="kvl-header-row">'
        +     '<div class="kvl-title-section">'
        +       '<h2>📦 Quản Lý Kho Vật Liệu</h2>'
        +       '<p id="kvlFilterDesc">Đang hiển thị toàn bộ vật liệu</p>'
        +     '</div>'
        +     '<div>'
        +       '<input type="text" id="kvlSearch" class="kvl-search-input" placeholder="🔍 Tìm kiếm vật liệu, nhà cung cấp...">'
        +     '</div>'
        +   '</div>'
        +   '<div class="kvl-stats-row" id="kvlStatsRow"></div>'
        +   '<div class="kvl-card">'
        +     '<div class="kvl-card-body">'
        +       '<table class="kvl-table">'
        +         '<thead>'
        +           '<tr>'
        +             '<th style="text-align:center">STT</th>'
        +             '<th>Tên Vật Liệu</th>'
        +             '<th>Kho Phân Loại</th>'
        +             '<th>Nguồn Cung Cấp</th>'
        +             '<th>Định Lượng</th>'
        +             '<th style="text-align:center">Tổng Nhập</th>'
        +             '<th style="text-align:center">Tổng Xuất</th>'
        +             '<th style="text-align:center">Hoàn</th>'
        +             '<th style="text-align:center">Cuối Kỳ</th>'
        +             '<th style="text-align:center">Lịch Sử</th>'
        +           '</tr>'
        +         '</thead>'
        +         '<tbody id="kvlTableBody"></tbody>'
        +       '</table>'
        +     '</div>'
        +   '</div>'
        + '</div>'
        + '</div>';

    // Search event
    var searchTimer;
    document.getElementById('kvlSearch').addEventListener('input', function() {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(function() {
            _kvl.search = document.getElementById('kvlSearch').value || '';
            _kvlRenderTable();
        }, 250);
    });

    _kvlLoadAll();
}

async function _kvlLoadAll() {
    try {
        var resTree = await apiCall('/api/khovatlieu/tree');
        _kvl.tree = resTree.tree || [];
        _kvlRenderSidebar();

        var resSum = await apiCall('/api/khovatlieu/summary');
        _kvl.summary = resSum.summaries || [];
        _kvlRenderTable();
    } catch(e) {
        console.error('[KVL] Load error:', e);
        showToast('Lỗi tải dữ liệu kho vật liệu: ' + e.message, 'error');
    }
}

function _kvlRenderSidebar() {
    var sb = document.getElementById('kvlSb');
    if (!sb) return;
    
    var activeWh = _kvl.filter.warehouse_id;
    var activeItem = _kvl.filter.material_item_id;

    var h = '<div class="kvl-sb-header">🏢 HỆ THỐNG KHO</div>';
    h += '<div class="kvl-tree">';
    
    // "All" node
    var isAllActive = !activeWh && !activeItem ? ' active' : '';
    h += '<div class="kvl-wh-node">'
       +   '<div class="kvl-wh-title' + isAllActive + '" onclick="_kvlSetFilter(null, null)">'
       +     '<span>📦 Tất cả vật liệu</span>'
       +   '</div>'
       + '</div>';

    _kvl.tree.forEach(function(wh) {
        var isWhActive = String(wh.id) === String(activeWh) ? ' active' : '';
        var itemsOpenClass = (String(wh.id) === String(activeWh) || wh.items.some(i => String(i.id) === String(activeItem))) ? ' open' : '';
        var chevron = itemsOpenClass ? '▼' : '▶';

        h += '<div class="kvl-wh-node">'
           +   '<div class="kvl-wh-title' + isWhActive + '" onclick="_kvlToggleWhNode(this, ' + wh.id + ')">'
           +     '<span>🏢 ' + wh.name + '</span>'
           +     '<span style="font-size:9px;color:#64748b">' + chevron + ' (' + wh.items.length + ')</span>'
           +   '</div>'
           +   '<div class="kvl-wh-items' + itemsOpenClass + '">';
           
        wh.items.forEach(function(item) {
            var isItemActive = String(item.id) === String(activeItem) ? ' active' : '';
            h += '<div class="kvl-item-node' + isItemActive + '" onclick="event.stopPropagation(); _kvlSetFilter(' + wh.id + ', ' + item.id + ')">'
               +   '<span>🔸 ' + item.name + '</span>'
               +   '<span class="kvl-badge emerald">' + _kvlFormatNum(item.remaining_stock) + '</span>'
               + '</div>';
        });

        h += '  </div>'
           + '</div>';
    });

    h += '</div>';
    sb.innerHTML = h;
}

function _kvlToggleWhNode(element, whId) {
    var sibling = element.nextElementSibling;
    if (sibling && sibling.classList.contains('kvl-wh-items')) {
        var isOpen = sibling.classList.toggle('open');
        var chevronSpan = element.querySelector('span:last-child');
        if (chevronSpan) {
            var count = sibling.children.length;
            chevronSpan.textContent = (isOpen ? '▼' : '▶') + ' (' + count + ')';
        }
    }
    _kvlSetFilter(whId, null);
}

function _kvlSetFilter(whId, itemId) {
    _kvl.filter.warehouse_id = whId;
    _kvl.filter.material_item_id = itemId;
    
    // Update description text
    var desc = 'Đang hiển thị toàn bộ vật liệu';
    if (itemId) {
        // Find item name
        var foundName = '';
        _kvl.tree.forEach(w => {
            var it = w.items.find(i => String(i.id) === String(itemId));
            if (it) foundName = it.name;
        });
        desc = 'Lọc theo vật liệu: <b>' + foundName + '</b>';
    } else if (whId) {
        var foundWh = _kvl.tree.find(w => String(w.id) === String(whId));
        desc = 'Lọc theo kho: <b>' + (foundWh ? foundWh.name : '') + '</b>';
    }
    document.getElementById('kvlFilterDesc').innerHTML = desc;

    _kvlRenderSidebar();
    _kvlRenderTable();
}

function _kvlRenderTable() {
    var tb = document.getElementById('kvlTableBody');
    if (!tb) return;

    var f = _kvl.filter;
    var list = _kvl.summary.slice();

    // Apply sidebar filters
    if (f.material_item_id) {
        list = list.filter(function(r) { return String(r.id) === String(f.material_item_id); });
    } else if (f.warehouse_id) {
        list = list.filter(function(r) { return String(r.warehouse_id) === String(f.warehouse_id); });
    }

    // Apply search filter
    if (_kvl.search) {
        var q = _kvl.search.toLowerCase();
        list = list.filter(function(r) {
            return (r.name || '').toLowerCase().indexOf(q) >= 0 ||
                   (r.warehouse_name || '').toLowerCase().indexOf(q) >= 0 ||
                   (r.suppliers || []).some(function(s) { return (s || '').toLowerCase().indexOf(q) >= 0; });
        });
    }

    // Update stats cards
    var totalImp = 0, totalExp = 0, totalRem = 0;
    list.forEach(function(r) {
        totalImp += Number(r.total_import) || 0;
        totalExp += Number(r.total_export) || 0;
        totalRem += Number(r.remaining_stock) || 0;
    });

    var stats = document.getElementById('kvlStatsRow');
    if (stats) {
        stats.innerHTML = 
            '<div class="kvl-stat-card blue"><span class="label">📥 TỔNG NHẬP</span><span class="val">' + _kvlFormatNum(totalImp) + '</span></div>'
            + '<div class="kvl-stat-card amber"><span class="label">📤 TỔNG XUẤT</span><span class="val">' + _kvlFormatNum(totalExp) + '</span></div>'
            + '<div class="kvl-stat-card emerald"><span class="label">📊 CỦỐI KỲ (TỒN)</span><span class="val">' + _kvlFormatNum(totalRem) + '</span></div>';
    }

    if (!list.length) {
        tb.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:40px;color:#64748b">📭 Không tìm thấy vật liệu nào matching bộ lọc.</td></tr>';
        return;
    }

    tb.innerHTML = list.map(function(r, idx) {
        var suppliersDisp = (r.suppliers || []).map(s => '<span class="kvl-badge purple" style="margin-right:3px">' + s + '</span>').join('') || '—';
        var endBal = Number(r.remaining_stock) || 0;
        var balClass = endBal > 0 ? 'emerald' : endBal === 0 ? 'zero' : 'rose';
        var balLabel = endBal > 0 ? '🟢 ' + _kvlFormatNum(endBal) : endBal === 0 ? '⚪ 0' : '🔴 ' + _kvlFormatNum(endBal);

        return '<tr>'
            + '<td style="text-align:center;font-weight:700;color:#64748b">' + (idx + 1) + '</td>'
            + '<td style="font-weight:700;color:#0f172a">' + (r.name || '—') + '</td>'
            + '<td><span class="kvl-badge">' + (r.warehouse_name || '—') + '</span></td>'
            + '<td>' + suppliersDisp + '</td>'
            + '<td>' + (r.spec || '—') + '</td>'
            + '<td style="text-align:center;font-weight:700;color:#0284c7">' + _kvlFormatNum(r.total_import) + '</td>'
            + '<td style="text-align:center;font-weight:700;color:#d97706">' + _kvlFormatNum(r.total_export) + '</td>'
            + '<td style="text-align:center;font-weight:700;color:#e11d48">' + _kvlFormatNum(r.total_refund) + '</td>'
            + '<td style="text-align:center;font-weight:800"><span class="kvl-badge ' + balClass + '">' + balLabel + '</span></td>'
            + '<td style="text-align:center"><button class="kvl-btn kvl-btn-primary" onclick="openKvlHistoryModal(' + r.id + ', \'' + (r.name || '').replace(/'/g, "\\'") + '\')">📋 LỊCH SỬ</button></td>'
            + '</tr>';
    }).join('');
}

// ========== TRANSACTION LOG MODAL ==========
async function openKvlHistoryModal(itemId, itemName) {
    _kvl.currentMaterialId = itemId;
    _kvl.currentMaterialName = itemName;
    
    // Create history modal in DOM if missing
    var m = document.getElementById('kvlHistoryModal');
    if (!m) {
        m = document.createElement('div');
        m.id = 'kvlHistoryModal';
        m.className = 'kvl-modal';
        document.body.appendChild(m);
    }
    
    m.innerHTML = 
        '<div class="kvl-modal-content">'
        + '  <div class="kvl-modal-header">'
        + '    <h3>📋 Lịch Sử Giao Dịch: ' + itemName + '</h3>'
        + '    <span class="kvl-close-btn" onclick="closeKvlHistoryModal()">&times;</span>'
        + '  </div>'
        + '  <div class="kvl-modal-body">'
        + '    <div class="kvl-modal-stats" id="kvlModStats">'
        + '      <div class="kvl-modal-stat-card"><span>Tổng tiền nhập</span><h4 id="kvlModTotalCost">⏳</h4></div>'
        + '      <div class="kvl-modal-stat-card"><span>Đơn giá nhập trung bình</span><h4 id="kvlModAvgPrice">⏳</h4></div>'
        + '    </div>'
        + '    <div class="kvl-modal-actions-row">'
        + '      <h4>LỊCH SỬ NHẬP XUẤT HOÂN</h4>'
        + '      <button class="kvl-btn kvl-btn-primary" onclick="openKvlAdjustModal()">➕ ĐIỀU CHỈNH THỦ CÔNG</button>'
        + '    </div>'
        + '    <div style="overflow-y:auto;flex:1;max-height:50vh">'
        + '      <table class="kvl-modal-table">'
        + '        <thead>'
        + '          <tr>'
        + '            <th>Mã lô</th>'
        + '            <th>Thời gian</th>'
        + '            <th>Loại</th>'
        + '            <th style="text-align:center">Số lượng</th>'
        + '            <th style="text-align:right">Đơn giá</th>'
        + '            <th style="text-align:right">Thành tiền</th>'
        + '            <th>Người làm</th>'
        + '            <th>Nguồn / Chi tiết</th>'
        + '            <th style="text-align:center">Lô in</th>'
        + '          </tr>'
        + '        </thead>'
        + '        <tbody id="kvlHistoryBody">'
        + '          <tr><td colspan="9" style="text-align:center;padding:30px">⏳ Đang tải lịch sử...</td></tr>'
        + '        </tbody>'
        + '      </table>'
        + '    </div>'
        + '  </div>'
        + '</div>';
        
    m.style.display = 'flex';
    await _kvlLoadHistory(itemId);
}

function closeKvlHistoryModal() {
    var m = document.getElementById('kvlHistoryModal');
    if (m) m.style.display = 'none';
}

async function _kvlLoadHistory(itemId) {
    try {
        var res = await apiCall('/api/khovatlieu/history?material_item_id=' + itemId);
        
        // Render stats
        var st = res.stats || {};
        document.getElementById('kvlModTotalCost').textContent = _kvlFormatMoney(st.total_import_cost);
        document.getElementById('kvlModAvgPrice').textContent = _kvlFormatMoney(st.average_import_price) + ' / đơn vị';

        var list = res.history || [];
        var hb = document.getElementById('kvlHistoryBody');
        if (!list.length) {
            hb.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:30px;color:#64748b">📭 Chưa có giao dịch nào được ghi nhận.</td></tr>';
            return;
        }

        hb.innerHTML = list.map(function(tx) {
            var typeLabel = tx.tx_type;
            var typeClass = 'rose';
            if (tx.tx_type === 'NHAP') { typeLabel = '📥 NHẬP'; typeClass = 'emerald'; }
            else if (tx.tx_type === 'XUAT') { typeLabel = '📤 XUẤT'; typeClass = 'purple'; }
            else if (tx.tx_type === 'HOAN') { typeLabel = '↩️ HOÀN'; typeClass = 'rose'; }

            var sourceCol = tx.supplier_name ? '🏭 ' + tx.supplier_name : '';
            if (tx.notes) {
                if (sourceCol) sourceCol += '<br>';
                sourceCol += '<span style="color:#64748b;font-size:9px">' + tx.notes + '</span>';
            }
            if (!sourceCol) sourceCol = '—';

            var printOrdersLink = '—';
            if (tx.tx_type === 'NHAP' && tx.printed_orders && tx.printed_orders.length > 0) {
                printOrdersLink = '<span class="kvl-link-badge" onclick="event.stopPropagation(); _kvlTogglePrintedOrdersList(this, ' + tx.id + ')">📋 Xem ' + tx.printed_orders.length + ' đơn in</span>';
            }

            var trHtml = '<tr>'
                + '<td><span style="font-weight:700;color:#64748b">#' + tx.id + '</span></td>'
                + '<td style="font-size:10px;color:#475569">' + _kvlFormatDateTime(tx.performed_at) + '</td>'
                + '<td><span class="kvl-badge ' + typeClass + '">' + typeLabel + '</span></td>'
                + '<td style="text-align:center;font-weight:700;color:#0f172a">' + _kvlFormatNum(tx.quantity) + '</td>'
                + '<td style="text-align:right;color:#475569">' + (tx.price ? _kvlFormatMoney(tx.price) : '—') + '</td>'
                + '<td style="text-align:right;font-weight:700;color:#0f172a">' + (tx.total_amount ? _kvlFormatMoney(tx.total_amount) : '—') + '</td>'
                + '<td><span style="font-size:10px;color:#059669">' + tx.performer_name + '</span></td>'
                + '<td style="color:#1e293b">' + sourceCol + '</td>'
                + '<td style="text-align:center">' + printOrdersLink + '</td>'
                + '</tr>';

            // Collapsible printed orders table
            if (tx.tx_type === 'NHAP' && tx.printed_orders && tx.printed_orders.length > 0) {
                var orderRows = tx.printed_orders.map(function(o) {
                    return '<tr>'
                        + '  <td style="color:#0284c7;font-weight:700"><a href="/donhangtong?search=' + o.order_code + '" style="color:#0284c7;text-decoration:none" target="_blank">' + o.order_code + '</a></td>'
                        + '  <td style="color:#334155">' + (o.customer_name || '—') + '</td>'
                        + '  <td style="text-align:center;font-weight:700;color:#7c3aed">' + _kvlFormatNum(o.order_quantity) + '</td>'
                        + '  <td style="text-align:center;font-weight:700;color:#059669">' + _kvlFormatNum(o.print_meters) + 'm</td>'
                        + '  <td style="text-align:right;color:#64748b">' + _kvlFormatDateTime(o.print_done_at) + '</td>'
                        + '</tr>';
                }).join('');

                trHtml += '<tr id="kvl-printed-orders-' + tx.id + '" style="display:none;background:rgba(124,58,237,0.02)">'
                    + '  <td colspan="9" style="padding:10px 15px">'
                    + '    <div class="kvl-nested-wrap">'
                    + '      <div style="font-weight:800;color:#6d28d9;font-size:11px;margin-bottom:6px">🌀 ĐƠN HÀNG IN THỰC TẾ TỪ LÔ NÀY (' + tx.printed_orders.length + ' đơn):</div>'
                    + '      <table class="kvl-nested-table">'
                    + '        <thead>'
                    + '          <tr>'
                    + '            <th>Mã đơn</th>'
                    + '            <th>Tên khách</th>'
                    + '            <th style="text-align:center">SL đơn</th>'
                    + '            <th style="text-align:center">Mét in thực tế</th>'
                    + '            <th style="text-align:right">Ngày hoàn thành</th>'
                    + '          </tr>'
                    + '        </thead>'
                    + '        <tbody>' + orderRows + '</tbody>'
                    + '      </table>'
                    + '    </div>'
                    + '  </td>'
                    + '</tr>';
            }

            return trHtml;
        }).join('');

    } catch(e) {
        console.error('[KVL] History load error:', e);
        hb.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:30px;color:#f43f5e">❌ Lỗi tải lịch sử giao dịch: ' + e.message + '</td></tr>';
    }
}

function _kvlTogglePrintedOrdersList(element, txId) {
    var tr = document.getElementById('kvl-printed-orders-' + txId);
    if (!tr) return;
    var isHidden = tr.style.display === 'none';
    tr.style.display = isHidden ? 'table-row' : 'none';
    element.textContent = isHidden ? '✕ Đóng chi tiết' : '📋 Xem ' + tr.querySelectorAll('.kvl-nested-table tbody tr').length + ' đơn in';
    element.style.background = isHidden ? '#dc2626' : 'rgba(124,58,237,0.2)';
    element.style.color = isHidden ? '#fff' : '#c4b5fd';
}

// ========== ADJUST MODAL ==========
function openKvlAdjustModal() {
    var m = document.getElementById('kvlAdjustModal');
    if (!m) {
        m = document.createElement('div');
        m.id = 'kvlAdjustModal';
        m.className = 'kvl-modal';
        m.style.zIndex = '1100'; // Make sure it sits above history modal
        document.body.appendChild(m);
    }

    m.innerHTML = 
        '<div class="kvl-modal-content" style="width:400px">'
        + '  <div class="kvl-modal-header">'
        + '    <h3>➕ Điều Chỉnh Kho: ' + _kvl.currentMaterialName + '</h3>'
        + '    <span class="kvl-close-btn" onclick="closeKvlAdjustModal()">&times;</span>'
        + '  </div>'
        + '  <form id="kvlAdjustForm" onsubmit="_kvlSubmitAdjustment(event)">'
        + '    <div class="kvl-modal-body">'
        + '      <div class="kvl-form-group">'
        + '        <label>Loại điều chỉnh</label>'
        + '        <select id="kvlAdjType" required>'
        + '          <option value="XUAT">📤 Xuất hao hụt / Sử dụng thủ công</option>'
        + '          <option value="HOAN">↩️ Hoàn trả vật liệu</option>'
        + '        </select>'
        + '      </div>'
        + '      <div class="kvl-form-group">'
        + '        <label>Số lượng điều chỉnh</label>'
        + '        <input type="number" step="0.01" id="kvlAdjQty" placeholder="Ví dụ: 10 hoặc 2.5" required min="0.01">'
        + '      </div>'
        + '      <div class="kvl-form-group">'
        + '        <label>Đơn giá nhập (nếu có)</label>'
        + '        <input type="number" id="kvlAdjPrice" placeholder="Mặc định: 0" min="0">'
        + '      </div>'
        + '      <div class="kvl-form-group">'
        + '        <label>Lý do / Ghi chú</label>'
        + '        <textarea id="kvlAdjNotes" rows="3" placeholder="Nhập lý do xuất/hoàn..."></textarea>'
        + '      </div>'
        + '    </div>'
        + '    <div style="padding: 16px 20px; border-top: 1px solid #334155; display:flex; justify-content:flex-end; gap:8px">'
        + '      <button type="button" class="kvl-btn kvl-btn-secondary" onclick="closeKvlAdjustModal()">Hủy</button>'
        + '      <button type="submit" id="kvlAdjSubmitBtn" class="kvl-btn kvl-btn-primary">Lưu giao dịch</button>'
        + '    </div>'
        + '  </form>'
        + '</div>';

    m.style.display = 'flex';
}

function closeKvlAdjustModal() {
    var m = document.getElementById('kvlAdjustModal');
    if (m) m.style.display = 'none';
}

async function _kvlSubmitAdjustment(e) {
    e.preventDefault();
    var btn = document.getElementById('kvlAdjSubmitBtn');
    if (btn) btn.disabled = true;

    var txType = document.getElementById('kvlAdjType').value;
    var qty = Number(document.getElementById('kvlAdjQty').value);
    var price = Number(document.getElementById('kvlAdjPrice').value) || 0;
    var notes = document.getElementById('kvlAdjNotes').value.trim();

    try {
        await apiCall('/api/khovatlieu/transaction', 'POST', {
            material_item_id: _kvl.currentMaterialId,
            tx_type: txType,
            quantity: qty,
            price: price,
            notes: notes
        });

        showToast('✅ Đã thực hiện điều chỉnh kho thành công!');
        closeKvlAdjustModal();
        
        // Refresh details and summary table
        await _kvlLoadHistory(_kvl.currentMaterialId);
        
        // Reload overall table data
        var resSum = await apiCall('/api/khovatlieu/summary');
        _kvl.summary = resSum.summaries || [];
        _kvlRenderTable();
    } catch(err) {
        showToast('Lỗi điều chỉnh: ' + err.message, 'error');
        if (btn) btn.disabled = false;
    }
}

// ========== FORMAT HELPER FUNCTIONS ==========
function _kvlFormatNum(n) {
    if (!n && n !== 0) return '0';
    return Number(n).toLocaleString('vi-VN');
}

function _kvlFormatMoney(m) {
    if (!m && m !== 0) return '0đ';
    return Number(m).toLocaleString('vi-VN') + 'đ';
}

function _kvlFormatDateTime(d) {
    if (!d) return '—';
    try {
        var date = new Date(d);
        var options = {
            timeZone: 'Asia/Ho_Chi_Minh',
            hour12: false,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        };
        var formatter = new Intl.DateTimeFormat('vi-VN', options);
        var parts = formatter.formatToParts(date);
        var p = {};
        parts.forEach(function(x) { p[x.type] = x.value; });
        return p.hour + ':' + p.minute + ':' + p.second + ' ' + p.day + '/' + p.month + '/' + p.year;
    } catch(e) {
        return d;
    }
}
