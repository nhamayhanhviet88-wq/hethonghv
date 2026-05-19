// ========== CÀI ĐẶT KHO VẢI ==========
// Now integrated as a tab inside Cài Đặt Sản Xuất
// This file keeps all helper functions; renderCaidatkhovaiPage redirects to the new page
var _cdk = { warehouses: [], materials: [], colors: [], selWid: null, selMid: null, chkWh: {}, chkMat: {}, chkColor: {} };

async function renderCaidatkhovaiPage(content) {
    // Redirect to Cài Đặt Sản Xuất with Kho Vải tab
    localStorage.setItem('cdsxActiveTab', 'kho-vai');
    navigate('caidatsanxuat');
}


// ========== COLUMN 1: WAREHOUSES ==========
async function _cdkLoadWarehouses() {
    try {
        var data = await apiCall('/api/khovai/warehouses/all');
        _cdk.warehouses = data.warehouses || [];
    } catch(e) { _cdk.warehouses = []; }
    _cdkRenderCol1();
    _cdkRenderCol2();
    _cdkRenderCol3();
}

function _cdkRenderCol1() {
    var col = document.getElementById('cdkCol1'); if (!col) return;
    var chkCnt = Object.keys(_cdk.chkWh).length;
    var h = '<div class="cdk-col-head"><span>🏭 KHO (' + _cdk.warehouses.length + ')</span></div>';
    if (_cdk.warehouses.length) {
        h += '<div class="cdk-bulk-bar" style="display:flex;gap:4px;padding:4px 8px;background:#f8fafc;border-bottom:1px solid #e2e8f0;align-items:center;flex-wrap:wrap">';
        h += '<button onclick="_cdkChkAllWh(true)" class="cdk-btn-sm" style="background:#059669;color:#fff;padding:4px 8px;font-size:10px">☑ Chọn tất cả</button>';
        h += '<button onclick="_cdkChkAllWh(false)" class="cdk-btn-sm" style="background:#6b7280;color:#fff;padding:4px 8px;font-size:10px">☐ Bỏ chọn</button>';
        if (chkCnt) h += '<button onclick="_cdkDelChkWh()" class="cdk-btn-sm" style="background:#dc2626;color:#fff;padding:4px 8px;font-size:10px;margin-left:auto">🗑️ Xóa đã chọn (' + chkCnt + ')</button>';
        h += '</div>';
    }
    h += '<div class="cdk-add-form"><div style="display:flex;gap:6px">'
        + '<input type="text" id="cdkNewWhName" class="form-control" placeholder="Tên kho mới" style="flex:1;padding:8px;font-size:12px">'
        + '<input type="text" id="cdkNewWhUnit" class="form-control" placeholder="ĐVT" style="width:60px;padding:8px;font-size:12px">'
        + '<button onclick="_cdkCreateWh()" class="cdk-btn-sm" style="background:#0d9488;color:#fff;padding:8px 12px">Tạo</button>'
        + '</div></div>';
    h += '<div class="cdk-col-body">';
    if (!_cdk.warehouses.length) {
        h += '<div class="cdk-empty">Chưa có kho nào</div>';
    } else {
        _cdk.warehouses.forEach(function(w) {
            var isActive = _cdk.selWid === w.id;
            var isOn = w.is_active;
            var isChk = !!_cdk.chkWh[w.id];
            h += '<div class="cdk-item' + (isActive ? ' active' : '') + (isOn ? '' : ' inactive') + (isChk ? ' checked' : '') + '" onclick="_cdkSelectWh(' + w.id + ')">';
            h += '<div class="cdk-item-name" style="align-items:center">';
            h += '<input type="checkbox" ' + (isChk ? 'checked' : '') + ' onclick="event.stopPropagation();_cdkChkWh(' + w.id + ')" style="width:16px;height:16px;cursor:pointer;accent-color:#059669;flex-shrink:0">';
            h += '<span>🏭 ' + w.name + '</span>';
            h += '<span class="cdk-badge" style="background:' + (isOn ? '#d1fae5;color:#059669' : '#fee2e2;color:#dc2626') + '">' + (w.unit||'kg') + '</span>';
            if (!isOn) h += '<span class="cdk-badge" style="background:#fee2e2;color:#dc2626">ẨN</span>';
            h += '</div>';
            h += '<div class="cdk-item-actions">';
            h += '<button class="cdk-toggle ' + (isOn ? 'on' : 'off') + '" onclick="event.stopPropagation();_cdkToggleWh(' + w.id + ',' + !isOn + ')" title="' + (isOn ? 'Tắt' : 'Bật') + '"></button>';
            h += '<button class="cdk-btn-sm" style="background:#dc2626;color:#fff" onclick="event.stopPropagation();_cdkDeleteWh(' + w.id + ')" title="Xóa">🗑️</button>';
            h += '</div></div>';
        });
    }
    h += '</div>';
    col.innerHTML = h;
}

async function _cdkCreateWh() {
    var name = document.getElementById('cdkNewWhName')?.value;
    var unit = document.getElementById('cdkNewWhUnit')?.value;
    if (!name || !name.trim()) { showToast('Nhập tên kho!', 'error'); return; }
    if (!unit || !unit.trim()) { showToast('Nhập đơn vị!', 'error'); return; }
    try {
        var data = await apiCall('/api/khovai/warehouses', 'POST', { name: name.trim(), unit: unit.trim() });
        if (data.success) { showToast('✅ Đã tạo kho'); await _cdkLoadWarehouses(); }
        else showToast(data.error || 'Lỗi', 'error');
    } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
}

async function _cdkToggleWh(id, newState) {
    try {
        await apiCall('/api/khovai/warehouses/' + id + '/toggle', 'PUT', { is_active: newState });
        showToast(newState ? '✅ Đã bật kho' : '⚫ Đã tắt kho');
        await _cdkLoadWarehouses();
    } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
}

async function _cdkDeleteWh(id) {
    if (!confirm('Xóa kho này? (soft delete)')) return;
    try {
        await apiCall('/api/khovai/warehouses/' + id, 'DELETE');
        showToast('🗑️ Đã xóa');
        if (_cdk.selWid === id) { _cdk.selWid = null; _cdk.selMid = null; }
        await _cdkLoadWarehouses();
    } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
}

function _cdkChkWh(id) {
    if (_cdk.chkWh[id]) delete _cdk.chkWh[id]; else _cdk.chkWh[id] = true;
    _cdkRenderCol1();
}
function _cdkChkAllWh(state) {
    _cdk.chkWh = {};
    if (state) _cdk.warehouses.forEach(function(w) { _cdk.chkWh[w.id] = true; });
    _cdkRenderCol1();
}
async function _cdkDelChkWh() {
    var ids = Object.keys(_cdk.chkWh).map(Number);
    if (!ids.length) { showToast('Chưa chọn kho nào!', 'error'); return; }
    if (!confirm('⚠️ Xóa ' + ids.length + ' kho đã chọn?\nDữ liệu liên quan cũng sẽ bị xóa!')) return;
    try {
        await apiCall('/api/khovai/warehouses/bulk-delete', 'POST', { ids: ids });
        showToast('🗑️ Đã xóa ' + ids.length + ' kho');
        _cdk.chkWh = {};
        if (ids.indexOf(_cdk.selWid) >= 0) { _cdk.selWid = null; _cdk.selMid = null; }
        await _cdkLoadWarehouses();
    } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
}

function _cdkSelectWh(wid) {
    _cdk.selWid = wid; _cdk.selMid = null;
    _cdk.chkMat = {}; _cdk.chkColor = {};
    _cdkRenderCol1();
    _cdkLoadMaterials();
}

// ========== COLUMN 2: MATERIALS ==========
async function _cdkLoadMaterials() {
    if (!_cdk.selWid) { _cdk.materials = []; _cdkRenderCol2(); _cdkRenderCol3(); return; }
    try {
        var data = await apiCall('/api/khovai/materials/all?wid=' + _cdk.selWid);
        _cdk.materials = data.materials || [];
    } catch(e) { _cdk.materials = []; }
    _cdkRenderCol2();
    _cdkRenderCol3();
}

function _cdkRenderCol2() {
    var col = document.getElementById('cdkCol2'); if (!col) return;
    if (!_cdk.selWid) {
        col.innerHTML = '<div class="cdk-col-head col2"><span>🧵 CHẤT LIỆU</span></div><div class="cdk-col-body"><div class="cdk-empty">← Chọn kho bên trái</div></div>';
        return;
    }
    var wh = _cdk.warehouses.find(function(w) { return w.id === _cdk.selWid; });
    var whName = wh ? wh.name : '';
    var chkCnt = Object.keys(_cdk.chkMat).length;
    var h = '<div class="cdk-col-head col2"><span>🧵 CHẤT LIỆU — ' + whName + ' (' + _cdk.materials.length + ')</span></div>';
    if (_cdk.materials.length) {
        h += '<div class="cdk-bulk-bar" style="display:flex;gap:4px;padding:4px 8px;background:#faf5ff;border-bottom:1px solid #e9d5ff;align-items:center;flex-wrap:wrap">';
        h += '<button onclick="_cdkChkAllMat(true)" class="cdk-btn-sm" style="background:#059669;color:#fff;padding:4px 8px;font-size:10px">☑ Chọn tất cả</button>';
        h += '<button onclick="_cdkChkAllMat(false)" class="cdk-btn-sm" style="background:#6b7280;color:#fff;padding:4px 8px;font-size:10px">☐ Bỏ chọn</button>';
        if (chkCnt) h += '<button onclick="_cdkDelChkMat()" class="cdk-btn-sm" style="background:#dc2626;color:#fff;padding:4px 8px;font-size:10px;margin-left:auto">🗑️ Xóa đã chọn (' + chkCnt + ')</button>';
        h += '</div>';
    }
    h += '<div class="cdk-add-form" style="background:#f5f3ff"><div style="display:flex;gap:6px">'
        + '<input type="text" id="cdkNewMatName" class="form-control" placeholder="Tên chất liệu mới" style="flex:1;padding:8px;font-size:12px">'
        + '<button onclick="_cdkCreateMat()" class="cdk-btn-sm" style="background:#7c3aed;color:#fff;padding:8px 12px">Tạo</button>'
        + '</div></div>';
    h += '<div class="cdk-col-body">';
    if (!_cdk.materials.length) {
        h += '<div class="cdk-empty">Chưa có chất liệu</div>';
    } else {
        _cdk.materials.forEach(function(m) {
            var isActive = _cdk.selMid === m.id;
            var isOn = m.is_active;
            var isChk = !!_cdk.chkMat[m.id];
            h += '<div class="cdk-item' + (isActive ? ' active' : '') + (isOn ? '' : ' inactive') + (isChk ? ' checked' : '') + '" onclick="_cdkSelectMat(' + m.id + ')">';
            h += '<div class="cdk-item-name" style="align-items:center">';
            h += '<input type="checkbox" ' + (isChk ? 'checked' : '') + ' onclick="event.stopPropagation();_cdkChkMat(' + m.id + ')" style="width:16px;height:16px;cursor:pointer;accent-color:#7c3aed;flex-shrink:0">';
            h += '<span>🧵 ' + m.name + '</span>';
            if (!isOn) h += '<span class="cdk-badge" style="background:#fee2e2;color:#dc2626">ẨN</span>';
            h += '</div>';
            h += '<div class="cdk-item-actions">';
            h += '<button class="cdk-toggle ' + (isOn ? 'on' : 'off') + '" onclick="event.stopPropagation();_cdkToggleMat(' + m.id + ',' + !isOn + ')" title="' + (isOn ? 'Tắt' : 'Bật') + '"></button>';
            h += '<button class="cdk-btn-sm" style="background:#dc2626;color:#fff" onclick="event.stopPropagation();_cdkDeleteMat(' + m.id + ')">🗑️</button>';
            h += '</div></div>';
        });
    }
    h += '</div>';
    col.innerHTML = h;
}

async function _cdkCreateMat() {
    var name = document.getElementById('cdkNewMatName')?.value;
    if (!name || !name.trim()) { showToast('Nhập tên!', 'error'); return; }
    try {
        var data = await apiCall('/api/khovai/materials', 'POST', { warehouse_id: _cdk.selWid, name: name.trim() });
        if (data.success) { showToast('✅ Đã tạo'); await _cdkLoadMaterials(); }
        else showToast(data.error || 'Lỗi', 'error');
    } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
}

async function _cdkToggleMat(id, newState) {
    try {
        await apiCall('/api/khovai/materials/' + id + '/toggle', 'PUT', { is_active: newState });
        showToast(newState ? '✅ Đã bật' : '⚫ Đã tắt');
        await _cdkLoadMaterials();
    } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
}

async function _cdkDeleteMat(id) {
    if (!confirm('Xóa chất liệu này?')) return;
    try {
        await apiCall('/api/khovai/materials/' + id, 'DELETE');
        showToast('🗑️ Đã xóa');
        if (_cdk.selMid === id) _cdk.selMid = null;
        await _cdkLoadMaterials();
    } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
}

function _cdkChkMat(id) {
    if (_cdk.chkMat[id]) delete _cdk.chkMat[id]; else _cdk.chkMat[id] = true;
    _cdkRenderCol2();
}
function _cdkChkAllMat(state) {
    _cdk.chkMat = {};
    if (state) _cdk.materials.forEach(function(m) { _cdk.chkMat[m.id] = true; });
    _cdkRenderCol2();
}
async function _cdkDelChkMat() {
    var ids = Object.keys(_cdk.chkMat).map(Number);
    if (!ids.length) { showToast('Chưa chọn chất liệu nào!', 'error'); return; }
    if (!confirm('⚠️ Xóa ' + ids.length + ' chất liệu đã chọn?\nMàu vải liên quan cũng sẽ bị xóa!')) return;
    try {
        await apiCall('/api/khovai/materials/bulk-delete', 'POST', { ids: ids });
        showToast('🗑️ Đã xóa ' + ids.length + ' chất liệu');
        _cdk.chkMat = {};
        if (ids.indexOf(_cdk.selMid) >= 0) _cdk.selMid = null;
        await _cdkLoadMaterials();
    } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
}

function _cdkSelectMat(mid) {
    _cdk.selMid = mid;
    _cdk.chkColor = {};
    _cdkRenderCol2();
    _cdkLoadColors();
}

// ========== COLUMN 3: COLORS ==========
async function _cdkLoadColors() {
    if (!_cdk.selMid) { _cdk.colors = []; _cdkRenderCol3(); return; }
    try {
        var data = await apiCall('/api/khovai/colors/all?mid=' + _cdk.selMid);
        _cdk.colors = data.colors || [];
    } catch(e) { _cdk.colors = []; }
    _cdkRenderCol3();
}

function _cdkRenderCol3() {
    var col = document.getElementById('cdkCol3'); if (!col) return;
    if (!_cdk.selMid) {
        col.innerHTML = '<div class="cdk-col-head col3"><span>🎨 MÀU SẮC</span></div><div class="cdk-col-body"><div class="cdk-empty">← Chọn chất liệu bên trái</div></div>';
        return;
    }
    var mat = _cdk.materials.find(function(m) { return m.id === _cdk.selMid; });
    var matName = mat ? mat.name : '';
    var chkCnt = Object.keys(_cdk.chkColor).length;
    var h = '<div class="cdk-col-head col3"><span>🎨 MÀU — ' + matName + ' (' + _cdk.colors.length + ')</span></div>';
    if (_cdk.colors.length) {
        h += '<div class="cdk-bulk-bar" style="display:flex;gap:4px;padding:4px 8px;background:#eff6ff;border-bottom:1px solid #bfdbfe;align-items:center;flex-wrap:wrap">';
        h += '<button onclick="_cdkChkAllColor(true)" class="cdk-btn-sm" style="background:#059669;color:#fff;padding:4px 8px;font-size:10px">☑ Chọn tất cả</button>';
        h += '<button onclick="_cdkChkAllColor(false)" class="cdk-btn-sm" style="background:#6b7280;color:#fff;padding:4px 8px;font-size:10px">☐ Bỏ chọn</button>';
        if (chkCnt) h += '<button onclick="_cdkDelChkColor()" class="cdk-btn-sm" style="background:#dc2626;color:#fff;padding:4px 8px;font-size:10px;margin-left:auto">🗑️ Xóa đã chọn (' + chkCnt + ')</button>';
        h += '</div>';
    }

    // Single add form
    h += '<div class="cdk-add-form" style="background:#eff6ff"><div style="display:flex;gap:6px">'
        + '<input type="text" id="cdkNewColorName" class="form-control" placeholder="Tên màu" style="flex:1;padding:8px;font-size:12px">'
        + '<input type="number" id="cdkNewColorPrice" class="form-control" placeholder="Giá" style="width:80px;padding:8px;font-size:12px">'
        + '<button onclick="_cdkCreateColor()" class="cdk-btn-sm" style="background:#2563eb;color:#fff;padding:8px 12px">Tạo</button>'
        + '</div>'
        + '<div style="margin-top:6px"><button onclick="_cdkToggleBulk()" class="cdk-btn-sm" style="background:#f59e0b;color:#fff;padding:6px 12px">📋 Nhập nhiều</button></div>'
        + '</div>';

    // Bulk import area (hidden by default)
    h += '<div class="cdk-bulk-area" id="cdkBulkArea" style="display:none">'
        + '<div style="font-size:11px;color:#1e40af;font-weight:700;margin-bottom:6px">📋 Nhập nhiều — mỗi dòng 1 màu (tên | giá)</div>'
        + '<textarea id="cdkBulkText" style="width:100%;height:100px;padding:8px;font-size:12px;border:1px solid #93c5fd;border-radius:6px;resize:vertical;font-family:monospace" placeholder="Đỏ | 85000\nXanh dương | 90000\nTrắng\nĐen | 75000"></textarea>'
        + '<div style="display:flex;gap:6px;margin-top:6px">'
        + '<button onclick="_cdkSubmitBulk()" class="cdk-btn-sm" style="background:#2563eb;color:#fff;padding:8px 16px;font-size:12px">✅ Tạo tất cả</button>'
        + '<span id="cdkBulkResult" style="font-size:11px;color:#64748b;align-self:center"></span>'
        + '</div></div>';

    h += '<div class="cdk-col-body">';
    if (!_cdk.colors.length) {
        h += '<div class="cdk-empty">Chưa có màu nào</div>';
    } else {
        _cdk.colors.forEach(function(c) {
            var isOn = c.is_active;
            var isChk = !!_cdk.chkColor[c.id];
            var priceStr = c.price ? Number(c.price).toLocaleString('vi-VN') + 'đ' : '—';
            h += '<div class="cdk-item' + (isOn ? '' : ' inactive') + (isChk ? ' checked' : '') + '">';
            h += '<div class="cdk-item-name" style="flex:1;align-items:center">';
            h += '<input type="checkbox" ' + (isChk ? 'checked' : '') + ' onclick="_cdkChkColor(' + c.id + ')" style="width:16px;height:16px;cursor:pointer;accent-color:#2563eb;flex-shrink:0">';
            h += '<span>🎨 ' + c.color_name + '</span>';
            h += '<span style="color:#64748b;font-size:10px;font-weight:400;margin-left:4px">' + priceStr + '</span>';
            if (c.original_tree_threshold) h += '<span class="cdk-badge" style="background:#ede9fe;color:#7c3aed">≥' + c.original_tree_threshold + '</span>';
            if (!isOn) h += '<span class="cdk-badge" style="background:#fee2e2;color:#dc2626">ẨN</span>';
            h += '</div>';
            h += '<div class="cdk-item-actions">';
            h += '<button class="cdk-btn-sm" style="background:#6366f1;color:#fff" onclick="_cdkEditColor(' + c.id + ')" title="Sửa">✏️</button>';
            h += '<button class="cdk-toggle ' + (isOn ? 'on' : 'off') + '" onclick="_cdkToggleColor(' + c.id + ',' + !isOn + ')" title="' + (isOn ? 'Tắt' : 'Bật') + '"></button>';
            h += '<button class="cdk-btn-sm" style="background:#dc2626;color:#fff" onclick="_cdkDeleteColor(' + c.id + ')">🗑️</button>';
            h += '</div></div>';
        });
    }
    h += '</div>';
    col.innerHTML = h;
}

async function _cdkCreateColor() {
    var name = document.getElementById('cdkNewColorName')?.value;
    var price = document.getElementById('cdkNewColorPrice')?.value;
    if (!name || !name.trim()) { showToast('Nhập tên màu!', 'error'); return; }
    try {
        var data = await apiCall('/api/khovai/colors', 'POST', { material_id: _cdk.selMid, color_name: name.trim(), price: price ? Number(price) : 0 });
        if (data.success) { showToast('✅ Đã tạo'); document.getElementById('cdkNewColorName').value = ''; document.getElementById('cdkNewColorPrice').value = ''; await _cdkLoadColors(); }
        else showToast(data.error || 'Lỗi', 'error');
    } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
}

async function _cdkToggleColor(id, newState) {
    try {
        await apiCall('/api/khovai/colors/' + id + '/toggle', 'PUT', { is_active: newState });
        showToast(newState ? '✅ Đã bật' : '⚫ Đã tắt');
        await _cdkLoadColors();
    } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
}

async function _cdkDeleteColor(id) {
    if (!confirm('Xóa màu này?')) return;
    try {
        await apiCall('/api/khovai/colors/' + id, 'DELETE');
        showToast('🗑️ Đã xóa');
        await _cdkLoadColors();
    } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
}

function _cdkChkColor(id) {
    if (_cdk.chkColor[id]) delete _cdk.chkColor[id]; else _cdk.chkColor[id] = true;
    _cdkRenderCol3();
}
function _cdkChkAllColor(state) {
    _cdk.chkColor = {};
    if (state) _cdk.colors.forEach(function(c) { _cdk.chkColor[c.id] = true; });
    _cdkRenderCol3();
}
async function _cdkDelChkColor() {
    var ids = Object.keys(_cdk.chkColor).map(Number);
    if (!ids.length) { showToast('Chưa chọn màu nào!', 'error'); return; }
    if (!confirm('⚠️ Xóa ' + ids.length + ' màu đã chọn?')) return;
    try {
        await apiCall('/api/khovai/colors/bulk-delete', 'POST', { ids: ids });
        showToast('🗑️ Đã xóa ' + ids.length + ' màu');
        _cdk.chkColor = {};
        await _cdkLoadColors();
    } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
}

function _cdkEditColor(id) {
    var c = _cdk.colors.find(function(x) { return x.id === id; });
    if (!c) return;
    var body = '<div style="display:grid;gap:10px">'
        + '<div><label style="font-size:11px;font-weight:700;color:#64748b">Tên màu</label><input type="text" id="cdkEditName" class="form-control" value="' + (c.color_name||'') + '" style="padding:10px"></div>'
        + '<div><label style="font-size:11px;font-weight:700;color:#64748b">Giá</label><input type="number" id="cdkEditPrice" class="form-control" value="' + (c.price||0) + '" style="padding:10px"></div>'
        + '<div><label style="font-size:11px;font-weight:700;color:#64748b">Ngưỡng cây nguyên</label><input type="number" id="cdkEditThreshold" class="form-control" value="' + (c.original_tree_threshold||10) + '" style="padding:10px"></div>'
        + '</div>';
    openModal('✏️ Sửa Màu: ' + c.color_name, body,
        '<button class="btn btn-secondary" onclick="closeModal()">Hủy</button>'
        + '<button class="btn btn-primary" onclick="_cdkSaveColor(' + id + ')" style="width:auto">Lưu</button>');
}

async function _cdkSaveColor(id) {
    var name = document.getElementById('cdkEditName')?.value;
    var price = document.getElementById('cdkEditPrice')?.value;
    var threshold = document.getElementById('cdkEditThreshold')?.value;
    if (!name || !name.trim()) { showToast('Nhập tên!', 'error'); return; }
    try {
        var data = await apiCall('/api/khovai/colors/' + id, 'PUT', {
            color_name: name.trim(),
            price: price ? Number(price) : 0,
            original_tree_threshold: threshold ? Number(threshold) : 10
        });
        if (data.success) { showToast('✅ Đã lưu'); closeModal(); await _cdkLoadColors(); }
        else showToast(data.error || 'Lỗi', 'error');
    } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
}

// ========== BULK IMPORT ==========
function _cdkToggleBulk() {
    var area = document.getElementById('cdkBulkArea');
    if (area) area.style.display = area.style.display === 'none' ? 'block' : 'none';
}

async function _cdkSubmitBulk() {
    var text = document.getElementById('cdkBulkText')?.value;
    if (!text || !text.trim()) { showToast('Nhập danh sách màu!', 'error'); return; }
    var lines = text.trim().split('\n').filter(function(l) { return l.trim(); });
    if (!lines.length) { showToast('Không có dòng nào!', 'error'); return; }
    var ok = 0, fail = 0;
    var resultEl = document.getElementById('cdkBulkResult');
    if (resultEl) resultEl.textContent = '⏳ Đang tạo ' + lines.length + ' màu...';

    for (var i = 0; i < lines.length; i++) {
        var parts = lines[i].split('|');
        var cName = (parts[0] || '').trim();
        var cPrice = parts.length > 1 ? Number((parts[1] || '').trim()) : 0;
        if (!cName) { fail++; continue; }
        try {
            var data = await apiCall('/api/khovai/colors', 'POST', { material_id: _cdk.selMid, color_name: cName, price: cPrice || 0 });
            if (data.success) ok++;
            else fail++;
        } catch(e) { fail++; }
    }

    if (resultEl) resultEl.textContent = '✅ ' + ok + '/' + lines.length + ' thành công' + (fail ? ' | ❌ ' + fail + ' lỗi' : '');
    showToast('✅ Đã tạo ' + ok + '/' + lines.length + ' màu');
    document.getElementById('cdkBulkText').value = '';
    await _cdkLoadColors();
}
