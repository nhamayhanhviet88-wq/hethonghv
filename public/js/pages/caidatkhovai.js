// ========== CÀI ĐẶT KHO VẢI — Dedicated Settings Page ==========
var _cdk = { warehouses: [], materials: [], colors: [], selWid: null, selMid: null };

async function renderCaidatkhovaiPage(content) {
    if (!document.getElementById('cdkStyles')) {
        var st = document.createElement('style'); st.id = 'cdkStyles';
        st.textContent = [
            '.cdk-wrap{display:flex;height:calc(100vh - 60px);overflow:hidden;background:#f8fafc}',
            '.cdk-col{flex:1;min-width:0;border-right:1px solid var(--gray-200);display:flex;flex-direction:column;background:#fff}',
            '.cdk-col:last-child{border-right:none}',
            '.cdk-col-head{padding:14px 16px;background:linear-gradient(135deg,#0d9488,#0f766e);color:#fff;font-weight:800;font-size:13px;display:flex;justify-content:space-between;align-items:center}',
            '.cdk-col-head.col2{background:linear-gradient(135deg,#7c3aed,#6d28d9)}',
            '.cdk-col-head.col3{background:linear-gradient(135deg,#2563eb,#1d4ed8)}',
            '.cdk-col-body{flex:1;overflow-y:auto;padding:8px 0}',
            '.cdk-item{padding:10px 16px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #f1f5f9;cursor:pointer;transition:background .15s}',
            '.cdk-item:hover{background:#f0fdfa}',
            '.cdk-item.active{background:#ccfbf1;border-left:3px solid #0d9488}',
            '.cdk-item.inactive{opacity:0.5}',
            '.cdk-item-name{font-size:12px;font-weight:600;display:flex;align-items:center;gap:6px}',
            '.cdk-item-actions{display:flex;gap:4px;align-items:center}',
            '.cdk-toggle{width:36px;height:20px;border-radius:10px;border:none;cursor:pointer;position:relative;transition:background .2s}',
            '.cdk-toggle.on{background:#0d9488}',
            '.cdk-toggle.off{background:#cbd5e1}',
            '.cdk-toggle::after{content:"";position:absolute;width:16px;height:16px;border-radius:50%;background:#fff;top:2px;transition:left .2s;box-shadow:0 1px 3px rgba(0,0,0,.2)}',
            '.cdk-toggle.on::after{left:18px}',
            '.cdk-toggle.off::after{left:2px}',
            '.cdk-btn-sm{border:none;padding:3px 8px;border-radius:4px;font-size:10px;cursor:pointer;font-weight:700}',
            '.cdk-add-form{padding:12px 16px;border-bottom:2px solid var(--gray-200);background:#f0fdfa}',
            '.cdk-empty{text-align:center;padding:30px;color:var(--gray-400);font-size:12px}',
            '.cdk-back{background:none;border:none;color:#fff;cursor:pointer;font-size:14px;font-weight:700;padding:4px 8px;border-radius:6px}',
            '.cdk-back:hover{background:rgba(255,255,255,0.2)}',
            '.cdk-bulk-area{padding:12px 16px;border-bottom:2px solid var(--gray-200);background:#eff6ff}',
            '.cdk-badge{font-size:9px;padding:1px 6px;border-radius:8px;font-weight:700}',
            '@media(max-width:768px){.cdk-wrap{flex-direction:column;height:auto}.cdk-col{min-height:200px;border-right:none;border-bottom:1px solid var(--gray-200)}}'
        ].join('');
        document.head.appendChild(st);
    }

    content.innerHTML = '<div style="padding:12px 16px;display:flex;align-items:center;gap:10px;background:#fff;border-bottom:1px solid var(--gray-200)">'
        + '<button onclick="navigate(\'khovai\')" style="background:#0d9488;color:#fff;border:none;padding:6px 14px;border-radius:6px;font-weight:700;font-size:12px;cursor:pointer">← Quay lại Kho Vải</button>'
        + '<span style="font-size:16px;font-weight:800;color:#0f172a">⚙️ Cài Đặt Kho Vải</span>'
        + '<span style="font-size:11px;color:#64748b">Quản lý kho, chất liệu & màu sắc</span></div>'
        + '<div class="cdk-wrap" id="cdkWrap">'
        + '<div class="cdk-col" id="cdkCol1"></div>'
        + '<div class="cdk-col" id="cdkCol2"></div>'
        + '<div class="cdk-col" id="cdkCol3"></div>'
        + '</div>';

    _cdk.selWid = null; _cdk.selMid = null;
    await _cdkLoadWarehouses();
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
    var h = '<div class="cdk-col-head"><span>🏭 KHO (' + _cdk.warehouses.length + ')</span></div>';
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
            h += '<div class="cdk-item' + (isActive ? ' active' : '') + (isOn ? '' : ' inactive') + '" onclick="_cdkSelectWh(' + w.id + ')">';
            h += '<div class="cdk-item-name">';
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

function _cdkSelectWh(wid) {
    _cdk.selWid = wid; _cdk.selMid = null;
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
    var h = '<div class="cdk-col-head col2"><span>🧵 CHẤT LIỆU — ' + whName + ' (' + _cdk.materials.length + ')</span></div>';
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
            h += '<div class="cdk-item' + (isActive ? ' active' : '') + (isOn ? '' : ' inactive') + '" onclick="_cdkSelectMat(' + m.id + ')">';
            h += '<div class="cdk-item-name">';
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

function _cdkSelectMat(mid) {
    _cdk.selMid = mid;
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
    var h = '<div class="cdk-col-head col3"><span>🎨 MÀU — ' + matName + ' (' + _cdk.colors.length + ')</span></div>';

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
            var priceStr = c.price ? Number(c.price).toLocaleString('vi-VN') + 'đ' : '—';
            h += '<div class="cdk-item' + (isOn ? '' : ' inactive') + '">';
            h += '<div class="cdk-item-name" style="flex:1">';
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
