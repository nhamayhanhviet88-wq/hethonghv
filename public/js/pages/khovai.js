// ========== KHO VẢI — Fabric Warehouse Frontend ==========
var _kv = { tree: [], summary: [], filter: {}, selectedWid: null, selectedMid: null };

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
            '@media(max-width:768px){.kv-sidebar{width:220px;min-width:220px}.kv-table{font-size:11px}}'
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
    var h = '<div class="kv-sb-title"><span>🏬 Kho Vải</span>' + (isGD ? '<span onclick="_kvShowSettings()" style="cursor:pointer;font-size:16px" title="Cài đặt">⚙️</span>' : '') + '</div>';

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

    tb.innerHTML = '<span style="font-weight:800;font-size:13px">🏬 ' + ft + '</span><span style="flex:1"></span>'
        + '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">'
        + '<div class="kv-stat-card"><div class="kv-stat-label">NHẬP</div><div class="kv-stat-val" style="color:#059669">' + _kvFmt(tNhap) + '</div></div>'
        + '<div class="kv-stat-card"><div class="kv-stat-label">XUẤT</div><div class="kv-stat-val" style="color:#dc2626">' + _kvFmt(tXuat) + '</div></div>'
        + '<div class="kv-stat-card"><div class="kv-stat-label">TỒN KHO</div><div class="kv-stat-val" style="color:' + (tCuoi >= 0 ? '#0d9488' : '#dc2626') + '">' + _kvFmt(tCuoi) + '</div></div>'
        + '</div>';
}

// ========== TABLE ==========
function _kvRenderTable() {
    var wrap = document.getElementById('kvTableWrap'); if (!wrap) return;
    if (!_kv.summary.length) {
        wrap.innerHTML = '<div style="text-align:center;padding:40px;color:var(--gray-400)"><div style="font-size:32px">🏬</div><div style="margin-top:8px">Chưa có dữ liệu kho vải</div></div>';
        return;
    }
    var h = '<table class="kv-table"><thead><tr>';
    h += '<th>#</th><th>Tên Vải</th><th>Chất Liệu</th><th>Kho</th><th>ĐVT</th>';
    h += '<th style="text-align:right">Số Cục</th><th style="text-align:right">Cây Nguyên</th>';
    h += '<th style="text-align:right">Đầu Kỳ</th><th style="text-align:right">Xuất</th>';
    h += '<th style="text-align:right">Cuối Kỳ</th><th style="text-align:right">Giá</th>';
    h += '<th>Lịch Sử CN</th><th>Thao Tác</th></tr></thead><tbody>';

    _kv.summary.forEach(function(r, i) {
        var cuoiColor = Number(r.cuoi_ky) >= 0 ? '#059669' : '#dc2626';
        var lastUp = '';
        if (r.last_update && r.last_update.name) {
            var at = r.last_update.at ? new Date(r.last_update.at) : null;
            var ds = at ? (String(at.getDate()).padStart(2,'0') + '/' + String(at.getMonth()+1).padStart(2,'0') + ' ' + String(at.getHours()).padStart(2,'0') + ':' + String(at.getMinutes()).padStart(2,'0')) : '';
            lastUp = '<div style="color:#0d9488;font-weight:600;font-size:10px">' + ds + '</div><div style="color:#64748b;font-size:10px">' + r.last_update.name + '</div>';
        }

        h += '<tr>';
        h += '<td style="color:var(--gray-400)">' + (i+1) + '</td>';
        h += '<td style="font-weight:700;color:#0f172a">' + (r.color_name||'') + '</td>';
        h += '<td>' + (r.material_name||'') + '</td>';
        h += '<td style="font-size:10px;color:#64748b">' + (r.warehouse_name||'') + '</td>';
        h += '<td style="font-size:10px">' + (r.unit||'kg') + '</td>';
        h += '<td style="text-align:right;font-weight:700">' + (r.so_cuc||0) + '</td>';
        h += '<td style="text-align:right;font-weight:700;color:#7c3aed">' + (r.cay_nguyen||0) + '</td>';
        h += '<td style="text-align:right;font-weight:700;color:#059669">' + _kvFmt(r.dau_ky) + '</td>';
        h += '<td style="text-align:right;font-weight:700;color:#dc2626">' + _kvFmt(r.xuat) + '</td>';
        h += '<td style="text-align:right;font-weight:900;color:' + cuoiColor + '">' + _kvFmt(r.cuoi_ky) + '</td>';
        h += '<td style="text-align:right;font-size:11px">' + (r.price ? _kvFmt(r.price) + 'đ' : '—') + '</td>';
        h += '<td style="white-space:nowrap">' + (lastUp || '<span style="color:var(--gray-300)">—</span>') + '</td>';
        h += '<td style="white-space:nowrap"><button onclick="_kvShowRolls(' + r.id + ')" style="background:#0d9488;color:#fff;border:none;padding:3px 8px;border-radius:4px;font-size:10px;cursor:pointer;font-weight:700" title="Xem cục vải">📦</button> ';
        h += '<button onclick="_kvShowHistory(' + r.id + ')" style="background:#6366f1;color:#fff;border:none;padding:3px 8px;border-radius:4px;font-size:10px;cursor:pointer;font-weight:700" title="Lịch sử">📋</button> ';
        h += '<button onclick="_kvShowTx(' + r.id + ')" style="background:#f59e0b;color:#fff;border:none;padding:3px 8px;border-radius:4px;font-size:10px;cursor:pointer;font-weight:700" title="Nhập/Xuất">±</button></td>';
        h += '</tr>';
    });
    h += '</tbody></table>';
    wrap.innerHTML = h;
}

// ========== ROLLS MODAL ==========
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
