// ========== Cài Đặt Sản Phẩm & Quy Trình ==========
// Now integrated as a tab inside Cài Đặt Sản Xuất
// This file keeps all helper functions; renderCaidatspqtPage redirects to the new page

var _spqt = { saleTypes: [], products: [], steps: [], materials: [], cuttingCategories: [], selProduct: null };

async function renderCaidatspqtPage(content) {
    // Redirect to Cài Đặt Sản Xuất with SP & QT tab
    localStorage.setItem('cdsxActiveTab', 'sp-qt');
    navigate('caidatsanxuat');
}

async function _spqtLoadAll() {
    var [stRes, pRes, sRes, mRes] = await Promise.all([
        apiCall('/api/dht/phieu-options'),
        apiCall('/api/dht/products'),
        apiCall('/api/dht/process-steps'),
        apiCall('/api/dht/material-colors/0').catch(function(){ return {}; })
    ]);
    _spqt.saleTypes = (stRes.sale_types || []);
    _spqt.cuttingCategories = (stRes.cutting_categories || []);
    _spqt.products = (pRes.products || []);
    _spqt.steps = (sRes.steps || []);
    // Load all materials from khovai (no wid = return all)
    try { var mr = await apiCall('/api/khovai/materials'); _spqt.materials = mr.materials || []; } catch(e) { _spqt.materials = []; }
}

function _spqtRenderSidebar() {
    var sb = document.getElementById('_spqtSidebar'); if (!sb) return;
    var h = '<div style="font-size:13px;font-weight:800;color:#475569;margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid #e2e8f0">📋 Loại Bán/Quà</div>';

    // Sale types
    _spqt.saleTypes.forEach(function(st) {
        h += '<div style="margin-bottom:10px">';
        h += '<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 8px;background:#f1f5f9;border-radius:6px">'
            + '<span style="font-weight:700;font-size:12px;color:#334155;cursor:pointer;flex:1" onclick="document.getElementById(\'_stGrp_'+st.id+'\').style.display=document.getElementById(\'_stGrp_'+st.id+'\').style.display===\'none\'?\'block\':\'none\'">📦 ' + st.name + ' <span style="font-size:10px;color:#94a3b8">▼</span></span>'
            + '<button onclick="event.stopPropagation();_spqtDeleteSaleType('+st.id+',\''+st.name.replace(/'/g,"\\'")+'\')" style="background:none;border:none;cursor:pointer;font-size:11px;padding:2px 4px;color:#dc2626;opacity:0.5" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0.5" title="Xóa">🗑️</button></div>';
        
        // Products under this sale type
        var prods = _spqt.products.filter(function(p) { return p.sale_type_id === st.id; });
        h += '<div id="_stGrp_' + st.id + '" style="margin-top:4px">';
        prods.forEach(function(p) {
            var sel = (_spqt.selProduct && _spqt.selProduct.id === p.id);
            var ccBadge = p.cutting_category_name
                ? '<span style="background:#dbeafe;color:#1d4ed8;padding:1px 5px;border-radius:3px;font-size:9px;font-weight:700;margin-left:4px">' + p.cutting_category_name + '</span>'
                : '<span style="background:#fee2e2;color:#dc2626;padding:1px 5px;border-radius:3px;font-size:9px;font-weight:700;margin-left:4px">⚠️</span>';
            h += '<div onclick="_spqtSelectProduct(' + p.id + ')" style="padding:5px 10px 5px 20px;font-size:12px;cursor:pointer;border-radius:4px;margin:1px 0;font-weight:'+(sel?'700':'500')+';background:'+(sel?'#fef3c7':'#fff')+';color:'+(sel?'#b45309':'#64748b')+'" onmouseover="if(!this.style.fontWeight||this.style.fontWeight!==\'700\')this.style.background=\'#f8fafc\'" onmouseout="if(!this.style.fontWeight||this.style.fontWeight!==\'700\')this.style.background=\'#fff\'">'
                + '🏷️ ' + p.name + ccBadge + '</div>';
        });
        // Add product button
        h += '<div style="padding:3px 10px 3px 20px"><button onclick="_spqtShowAddProduct(' + st.id + ')" style="background:none;border:1px dashed #94a3b8;color:#64748b;padding:3px 10px;border-radius:4px;font-size:10px;cursor:pointer;font-weight:600">+ Thêm SP</button></div>';
        h += '</div></div>';
    });

    // Add Sale Type
    h += '<div style="margin-top:10px;padding-top:8px;border-top:1px solid #e2e8f0">'
        + '<button onclick="_spqtAddSaleType()" style="width:100%;background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;border:none;padding:6px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer">+ Thêm Loại Bán/Quà</button></div>';

    sb.innerHTML = h;
}

function _spqtRenderWelcome() {
    var ct = document.getElementById('_spqtContent'); if (!ct) return;
    ct.innerHTML = '<div style="text-align:center;padding:60px 20px;color:#94a3b8">'
        + '<div style="font-size:48px;margin-bottom:12px">📦</div>'
        + '<h3 style="font-size:16px;font-weight:700;color:#64748b;margin:0 0 6px">Chọn Sản Phẩm bên trái</h3>'
        + '<p style="font-size:12px;margin:0">Để cấu hình Chất Liệu và Quy Trình sản xuất</p></div>';
}

async function _spqtSelectProduct(pid) {
    _spqt.selProduct = _spqt.products.find(function(p) { return p.id === pid; }) || null;
    _spqtRenderSidebar();
    if (!_spqt.selProduct) { _spqtRenderWelcome(); return; }

    var ct = document.getElementById('_spqtContent'); if (!ct) return;
    ct.innerHTML = '<div style="text-align:center;color:#94a3b8;padding:40px">⏳ Đang tải...</div>';

    // Load assignments
    var [matRes, procRes] = await Promise.all([
        apiCall('/api/dht/product-materials/' + pid),
        apiCall('/api/dht/product-process/' + pid)
    ]);
    var assignedMats = (matRes.materials || []).map(function(m) { return m.material_id; });
    var assignedSteps = (procRes.steps || []).map(function(s) { return s.step_id; });

    var p = _spqt.selProduct;
    var ccName = p.cutting_category_name || null;
    var ccBadge = ccName
        ? '<span style="background:#dbeafe;color:#1d4ed8;padding:3px 10px;border-radius:6px;font-size:11px;font-weight:700">' + ccName + '</span>'
        : '<span style="background:#fee2e2;color:#dc2626;padding:3px 10px;border-radius:6px;font-size:11px;font-weight:700">⚠️ Chưa gán</span>';
    var h = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">'
        + '<div><span style="font-size:16px;font-weight:800;color:var(--navy,#1e293b)">🏷️ ' + p.name + '</span>'
        + '<span style="font-size:11px;color:#94a3b8;margin-left:8px">(' + p.sale_type_name + ')</span> ' + ccBadge + '</div>'
        + '<div style="display:flex;gap:6px">'
        + '<button onclick="_spqtRenameProduct(' + p.id + ',\'' + p.name.replace(/'/g,"\\'") + '\')" style="background:#dbeafe;color:#2563eb;border:none;padding:4px 10px;border-radius:4px;font-size:10px;font-weight:700;cursor:pointer">✏️ Đổi Tên</button>'
        + '<button onclick="_spqtDeleteProduct(' + p.id + ')" style="background:#fee2e2;color:#dc2626;border:none;padding:4px 10px;border-radius:4px;font-size:10px;font-weight:700;cursor:pointer">🗑️ Xóa SP</button>'
        + '</div>'
        + '</div>';

    // === Section 0: Loại Sản Phẩm Cắt ===
    var ccOpts = '<option value=""' + (!p.cutting_category_id ? ' selected' : '') + '>-- Chọn loại sản phẩm --</option>';
    _spqt.cuttingCategories.forEach(function(cc) {
        ccOpts += '<option value="' + cc.id + '"' + (p.cutting_category_id === cc.id ? ' selected' : '') + '>' + cc.name + '</option>';
    });
    h += '<div style="margin-bottom:20px">'
        + '<h4 style="font-size:13px;font-weight:800;color:#475569;margin:0 0 8px;padding-bottom:4px;border-bottom:2px solid #e2e8f0">🏷️ Loại Sản Phẩm Cắt <span style="color:red">*</span></h4>'
        + '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">'
        + '<select id="_spqtCcSelect" class="form-control" style="max-width:250px;font-weight:600">' + ccOpts + '</select>'
        + '<button onclick="_spqtSaveCc(' + pid + ')" style="background:#2563eb;color:#fff;border:none;padding:5px 14px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer">💾 Lưu Loại SP</button>'
        + '<button onclick="_spqtShowAddCc()" style="background:none;border:1px dashed #94a3b8;color:#64748b;padding:4px 10px;border-radius:4px;font-size:10px;cursor:pointer;font-weight:600">+ Thêm Loại Mới</button>'
        + '</div>'
        + '<div style="font-size:10px;color:#94a3b8;margin-top:4px">Xác định sản phẩm này khi đi vào Bộ Phận Cắt sẽ cắt loại gì (Áo, Quần, Váy, Túi...)</div>'
        + '</div>';

    // === Section 1: Chất Liệu ===
    h += '<div style="margin-bottom:20px">'
        + '<h4 style="font-size:13px;font-weight:800;color:#475569;margin:0 0 8px;padding-bottom:4px;border-bottom:2px solid #e2e8f0">🧶 Chất Liệu được dùng</h4>'
        + '<div style="display:flex;flex-wrap:wrap;gap:6px" id="_spqtMats">';
    
    _spqt.materials.forEach(function(m) {
        var checked = assignedMats.indexOf(m.id) >= 0;
        h += '<label style="display:flex;align-items:center;gap:4px;padding:4px 10px;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;background:'+(checked?'#dcfce7':'#f8fafc')+';border:1px solid '+(checked?'#86efac':'#e2e8f0')+'" '
            + 'onmouseover="this.style.boxShadow=\'0 1px 3px rgba(0,0,0,0.1)\'" onmouseout="this.style.boxShadow=\'none\'">'
            + '<input type="checkbox" class="_spqtMatCb" value="' + m.id + '"' + (checked ? ' checked' : '') + '> ' + m.name + '</label>';
    });
    h += '</div>'
        + '<button onclick="_spqtSaveMats(' + pid + ')" style="margin-top:8px;background:#059669;color:#fff;border:none;padding:5px 14px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer">💾 Lưu Chất Liệu</button></div>';

    // === Tab 2: Quy Trình ===
    h += '<div>'
        + '<h4 style="font-size:13px;font-weight:800;color:#475569;margin:0 0 8px;padding-bottom:4px;border-bottom:2px solid #e2e8f0">⚙️ Quy Trình Sản Xuất</h4>'
        + '<div style="display:flex;flex-wrap:wrap;gap:6px" id="_spqtSteps">';

    _spqt.steps.forEach(function(s) {
        var checked = assignedSteps.indexOf(s.id) >= 0;
        var linkBtn = s.page_link
            ? '<span onclick="event.preventDefault();event.stopPropagation();window.open(\''+s.page_link+'\',\'_blank\')" style="cursor:pointer;font-size:10px;margin-left:2px;opacity:0.6" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0.6" title="Mở trang '+s.name+'">🔗</span>'
            : '';
        h += '<label style="display:flex;align-items:center;gap:4px;padding:6px 12px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;background:'+(checked?'#dbeafe':'#f8fafc')+';border:1px solid '+(checked?'#93c5fd':'#e2e8f0')+';transition:all 0.15s" '
            + 'onmouseover="this.style.transform=\'translateY(-1px)\';this.style.boxShadow=\'0 2px 6px rgba(0,0,0,0.1)\'" onmouseout="this.style.transform=\'none\';this.style.boxShadow=\'none\'">'
            + '<input type="checkbox" class="_spqtStepCb" value="' + s.id + '"' + (checked ? ' checked' : '') + '> '
            + '<span style="background:'+(checked?'#3b82f6':'#94a3b8')+';color:#fff;padding:1px 5px;border-radius:3px;font-size:9px;font-weight:800">' + (s.short_name||'') + '</span> '
            + s.name + linkBtn + '</label>';
    });
    h += '</div>'
        + '<button onclick="_spqtSaveSteps(' + pid + ')" style="margin-top:8px;background:#2563eb;color:#fff;border:none;padding:5px 14px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer">💾 Lưu Quy Trình</button></div>';

    ct.innerHTML = h;
}

// ===== CRUD =====

async function _spqtAddSaleType() {
    var name = prompt('Tên loại (VD: Bán, Quà):');
    if (!name) return;
    var res = await apiCall('/api/dht/settings-options', 'POST', { category: 'sale_type', name: name.trim() });
    if (res.success) { showToast('✅ Đã thêm'); await _spqtLoadAll(); _spqtRenderSidebar(); }
    else showToast(res.error || 'Lỗi', 'error');
}

async function _spqtDeleteSaleType(id, name) {
    if (!confirm('Xóa loại "' + name + '"?\nCác sản phẩm bên trong sẽ không còn loại.')) return;
    var res = await apiCall('/api/dht/settings-options/' + id, 'DELETE');
    if (res.success) { showToast('🗑️ Đã xóa ' + name); _spqt.selProduct = null; await _spqtLoadAll(); _spqtRenderSidebar(); _spqtRenderWelcome(); }
    else showToast(res.error || 'Lỗi', 'error');
}

function _spqtShowAddProduct(saleTypeId) {
    var ccOpts = '<option value="">-- Chọn loại --</option>';
    _spqt.cuttingCategories.forEach(function(cc) {
        ccOpts += '<option value="' + cc.id + '">' + cc.name + '</option>';
    });
    var body = '<div style="display:grid;gap:12px">'
        + '<div><label style="font-weight:700;font-size:12px">Tên Sản Phẩm <span style="color:red">*</span></label>'
        + '<input id="_spqtNewName" class="form-control" placeholder="VD: Áo Polo, Áo Thun..." autofocus></div>'
        + '<div><label style="font-weight:700;font-size:12px">Loại Sản Phẩm Cắt <span style="color:red">*</span></label>'
        + '<div style="display:flex;gap:6px;align-items:center;margin-top:4px">'
        + '<select id="_spqtNewCc" class="form-control" style="flex:1">' + ccOpts + '</select>'
        + '<button onclick="_spqtShowAddCc()" type="button" style="background:none;border:1px dashed #94a3b8;color:#64748b;padding:4px 8px;border-radius:4px;font-size:10px;cursor:pointer;font-weight:600;white-space:nowrap">+ Mới</button>'
        + '</div>'
        + '<div style="font-size:10px;color:#94a3b8;margin-top:2px">Xác định sản phẩm cắt loại gì (Áo, Quần, Váy...)</div></div>'
        + '</div>';
    var footer = '<button class="btn btn-secondary" onclick="closeModal()">Hủy</button>'
        + '<button class="btn" onclick="_spqtDoAddProduct(' + saleTypeId + ')" style="background:linear-gradient(135deg,#059669,#10b981);color:#fff;border:none;padding:8px 20px;border-radius:6px;font-weight:700">➕ Tạo Sản Phẩm</button>';
    openModal('➕ Thêm Sản Phẩm', body, footer);
}

async function _spqtDoAddProduct(saleTypeId) {
    var name = document.getElementById('_spqtNewName')?.value?.trim();
    var ccId = document.getElementById('_spqtNewCc')?.value;
    if (!name) { showToast('Nhập tên sản phẩm', 'error'); return; }
    if (!ccId) { showToast('Chọn Loại Sản Phẩm Cắt', 'error'); return; }
    var res = await apiCall('/api/dht/products', 'POST', { sale_type_id: saleTypeId, name: name, cutting_category_id: Number(ccId) });
    if (res.success) { showToast('✅ Đã thêm SP'); closeModal(); await _spqtLoadAll(); _spqtRenderSidebar(); }
    else showToast(res.error || 'Lỗi', 'error');
}

async function _spqtSaveCc(pid) {
    var ccId = document.getElementById('_spqtCcSelect')?.value;
    if (!ccId) { showToast('Chọn Loại Sản Phẩm Cắt', 'error'); return; }
    var res = await apiCall('/api/dht/products/' + pid, 'PUT', { cutting_category_id: Number(ccId) });
    if (res.success) {
        showToast('✅ Đã lưu Loại SP Cắt');
        await _spqtLoadAll();
        // Re-select the product to refresh the view
        _spqt.selProduct = _spqt.products.find(function(p) { return p.id === pid; }) || null;
        _spqtRenderSidebar();
        if (_spqt.selProduct) _spqtSelectProduct(pid);
    } else showToast(res.error || 'Lỗi', 'error');
}

async function _spqtShowAddCc() {
    var name = prompt('Tên Loại Sản Phẩm Cắt mới (VD: Áo Khoác, Balo...):');
    if (!name) return;
    var res = await apiCall('/api/dht/settings-options', 'POST', { category: 'cutting_category', name: name.trim() });
    if (res.success) {
        showToast('✅ Đã thêm loại "' + name.trim() + '"');
        await _spqtLoadAll();
        // Refresh selects if open
        var sel = document.getElementById('_spqtCcSelect');
        if (sel) {
            var newOpt = document.createElement('option');
            newOpt.value = res.option.id;
            newOpt.textContent = res.option.name;
            newOpt.selected = true;
            sel.appendChild(newOpt);
        }
        var sel2 = document.getElementById('_spqtNewCc');
        if (sel2) {
            var newOpt2 = document.createElement('option');
            newOpt2.value = res.option.id;
            newOpt2.textContent = res.option.name;
            newOpt2.selected = true;
            sel2.appendChild(newOpt2);
        }
    } else showToast(res.error || 'Lỗi', 'error');
}

async function _spqtDeleteProduct(pid) {
    if (!confirm('Xóa sản phẩm này?')) return;
    var res = await apiCall('/api/dht/products/' + pid, 'DELETE');
    if (res.success) {
        showToast('🗑️ Đã xóa');
        _spqt.selProduct = null;
        await _spqtLoadAll();
        _spqtRenderSidebar();
        _spqtRenderWelcome();
    } else showToast(res.error || 'Lỗi', 'error');
}

async function _spqtSaveMats(pid) {
    var cbs = document.querySelectorAll('._spqtMatCb:checked');
    var ids = Array.from(cbs).map(function(cb) { return Number(cb.value); });
    var res = await apiCall('/api/dht/product-materials/' + pid, 'PUT', { material_ids: ids });
    if (res.success) { showToast('✅ Đã lưu Chất Liệu'); _spqtSelectProduct(pid); }
    else showToast(res.error || 'Lỗi', 'error');
}

async function _spqtSaveSteps(pid) {
    var cbs = document.querySelectorAll('._spqtStepCb:checked');
    var ids = Array.from(cbs).map(function(cb) { return Number(cb.value); });
    var res = await apiCall('/api/dht/product-process/' + pid, 'PUT', { step_ids: ids });
    if (res.success) { showToast('✅ Đã lưu Quy Trình'); _spqtSelectProduct(pid); }
    else showToast(res.error || 'Lỗi', 'error');
}

async function _spqtRenameProduct(pid, oldName) {
    var newName = prompt('Nhập tên mới cho sản phẩm:', oldName);
    if (!newName || !newName.trim() || newName.trim() === oldName) return;
    var res = await apiCall('/api/dht/products/' + pid, 'PUT', { name: newName.trim() });
    if (res.success) {
        showToast('✅ Đã đổi tên sản phẩm');
        await _spqtLoadAll();
        _spqt.selProduct = _spqt.products.find(function(p) { return p.id === pid; }) || null;
        _spqtRenderSidebar();
        if (_spqt.selProduct) _spqtSelectProduct(pid);
    } else showToast(res.error || 'Lỗi', 'error');
}
