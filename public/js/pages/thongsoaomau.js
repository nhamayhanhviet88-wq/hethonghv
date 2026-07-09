// ========== THÔNG SỐ MẪU ÁO — Frontend ==========
var _tsam = { tree: [], samples: [], filter: {}, categories: [] };
var _tsamFmt = function(n) { return Number(n||0).toLocaleString('vi-VN'); };
var _tsamTypes = { PHA_PHOI: 'Pha Phối', '3D': '3D', DON: 'Đơn' };
var _tsamTypeColors = { PHA_PHOI: '#8b5cf6', '3D': '#3b82f6', DON: '#059669' };
var _tsamStatusColors = { APPROVED: '#059669', PENDING: '#f59e0b', REJECTED: '#dc2626' };
var _tsamStatusLabels = { APPROVED: '✅ Đã Duyệt', PENDING: '🟡 Chờ Duyệt', REJECTED: '❌ Từ Chối' };
var _tsamIsUrl = function(v) { return v && /^https?:\/\/.+/i.test(v); };
var _tsamLinkCell = function(v) { return _tsamIsUrl(v) ? '<a href="'+v+'" target="_blank" onclick="event.stopPropagation()" style="color:#3b82f6;font-weight:700;font-size:10px" title="'+v+'">🔗 Mở Link</a>' : (v||'—'); };

async function renderThongsoaomauPage(content) {
    if (!document.getElementById('tsamCSS')) {
        var st = document.createElement('style'); st.id = 'tsamCSS';
        st.textContent = [
            '.tsam-wrap{display:flex;height:calc(100vh - 60px);overflow:hidden}',
            '.tsam-sb{width:270px;min-width:270px;background:#fff;border-right:1px solid var(--gray-200);overflow-y:auto}',
            '.tsam-main{flex:1;min-width:0;display:flex;flex-direction:column;overflow-y:auto;padding:16px}',
            '.tsam-sb-title{font-size:13px;font-weight:800;padding:16px;border-bottom:1px solid var(--gray-200);text-align:center;color:#7c3aed}',
            '.tsam-sb-total{background:linear-gradient(135deg,#7c3aed,#8b5cf6);color:#fff;padding:12px 16px;font-size:13px;font-weight:800;display:flex;justify-content:space-between;cursor:pointer}',
            '.tsam-sb-cat{padding:8px 16px;font-size:12px;font-weight:700;cursor:pointer;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #f0f0f0;color:#7c3aed}',
            '.tsam-sb-cat:hover{background:#f5f3ff}',
            '.tsam-sb-cat.active{background:#ede9fe;font-weight:800}',
            '.tsam-tbl{width:100%;border-collapse:collapse;font-size:11px;white-space:nowrap}',
            '.tsam-tbl th{padding:8px 6px;text-align:left;font-size:10px;font-weight:700;color:#fff;background:#1e1b4b;text-transform:uppercase}',
            '.tsam-tbl td{padding:7px 6px;border-bottom:1px solid var(--gray-100);vertical-align:middle}',
            '.tsam-tbl tr:hover{background:#f5f3ff}',
            '.tsam-badge{padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;color:#fff;display:inline-block}'
        ].join('');
        document.head.appendChild(st);
    }
    var [treeRes, catRes, phieuOpts] = await Promise.all([
        apiCall('/api/tsam/tree'),
        apiCall('/api/dht/categories'),
        apiCall('/api/dht/phieu-options')
    ]);
    _tsam.tree = treeRes.categories || [];
    _tsam.categories = catRes.categories || [];
    _tsam.products = phieuOpts.products || [];
    _tsam.totalInfo = treeRes.total || {};
    content.innerHTML = '<div class="tsam-wrap"><div class="tsam-sb" id="tsamSB"></div><div class="tsam-main"><div style="display:flex;gap:10px;margin-bottom:12px;flex-wrap:wrap;align-items:center"><input type="text" id="tsamSearch" class="form-control" placeholder="🔍 Tìm mã mẫu, BST..." style="width:auto;min-width:220px"><select id="tsamStatusFilter" class="form-control" style="width:auto" onchange="_tsamLoad()"><option value="">Tất cả trạng thái</option><option value="PENDING">🟡 Chờ Duyệt</option><option value="APPROVED">✅ Đã Duyệt</option><option value="REJECTED">❌ Từ Chối</option></select><div style="margin-left:auto"><button class="btn" onclick="_tsamShowCreate()" style="font-size:13px;padding:8px 20px;background:linear-gradient(135deg,#7c3aed,#8b5cf6);color:#fff;border:none;border-radius:8px;font-weight:800;cursor:pointer">➕ Thêm Mẫu</button></div></div><div class="card"><div class="card-body" style="overflow-x:auto;padding:8px"><table class="tsam-tbl"><thead><tr><th style="text-align:center">STT</th><th style="text-align:center">Lĩnh Vực</th><th style="text-align:center">Mã Mẫu</th><th style="text-align:center">Loại</th><th style="text-align:center">SL Màu Phối</th><th style="text-align:center">Bộ Sưu Tập</th><th style="text-align:center">KT May</th><th style="text-align:center">Giá May Nhà</th><th style="text-align:center">Giá Gia Công</th><th style="text-align:center">Duyệt</th><th style="text-align:center">Lịch Sử CN</th></tr></thead><tbody id="tsamTbody"><tr><td colspan="11" style="text-align:center;padding:40px">⏳</td></tr></tbody></table></div></div></div></div>';
    var _st; document.getElementById('tsamSearch').addEventListener('input', function() { clearTimeout(_st); _st = setTimeout(function() { _tsamLoad(); }, 400); });
    _tsamRenderSB();
    await _tsamLoad();
}

function _tsamRenderSB() {
    var sb = document.getElementById('tsamSB'); if (!sb) return;
    var t = _tsam.totalInfo;
    var h = '<div class="tsam-sb-title">───  📐 Thông Số Mẫu Áo  ───</div>';
    h += '<div class="tsam-sb-total" onclick="_tsamFilter({})"><span>📋 Tất cả</span><span>' + (t.total || 0) + ' mẫu</span></div>';
    _tsam.tree.forEach(function(c) {
        var active = _tsam.filter.category_id == c.id;
        h += '<div class="tsam-sb-cat' + (active ? ' active' : '') + '" onclick="_tsamFilter({category_id:' + c.id + '})"><span>🏷️ ' + c.name + '</span><span style="display:flex;gap:4px">';
        if (Number(c.pending_count) > 0) h += '<span style="background:#f59e0b;color:#fff;padding:1px 6px;border-radius:8px;font-size:9px">' + c.pending_count + '</span>';
        h += '<span style="background:#7c3aed;color:#fff;padding:1px 6px;border-radius:8px;font-size:9px">' + (c.sample_count || 0) + '</span></span></div>';
    });
    sb.innerHTML = h;
}

function _tsamFilter(f) { _tsam.filter = f; _tsamRenderSB(); _tsamLoad(); }

async function _tsamLoad() {
    var f = _tsam.filter, url = '/api/tsam/samples?';
    if (f.category_id) url += 'category_id=' + f.category_id + '&';
    var status = document.getElementById('tsamStatusFilter')?.value;
    if (status) url += 'status=' + status + '&';
    var search = document.getElementById('tsamSearch')?.value;
    if (search) url += 'search=' + encodeURIComponent(search) + '&';
    var data = await apiCall(url);
    _tsam.samples = data.samples || [];
    var tbody = document.getElementById('tsamTbody'); if (!tbody) return;
    if (!_tsam.samples.length) { tbody.innerHTML = '<tr><td colspan="11"><div class="empty-state"><div class="icon">📐</div><h3>Chưa có mẫu áo</h3></div></td></tr>'; return; }
    tbody.innerHTML = _tsam.samples.map(function(s, i) {
        var typeColor = _tsamTypeColors[s.sample_type] || '#64748b';
        var stColor = _tsamStatusColors[s.approval_status] || '#94a3b8';
        var stLabel = _tsamStatusLabels[s.approval_status] || s.approval_status;
        var sewing = []; try { sewing = typeof s.sewing_tech === 'string' ? JSON.parse(s.sewing_tech) : (s.sewing_tech || []); } catch(e) {}
        var sewNames = sewing.map(function(t){ return typeof t === 'string' ? t : (t.name || ''); }).filter(Boolean);
        var lastUp = '—'; try { if (s.updated_at) { var _d = new Date(s.updated_at); lastUp = _d.toLocaleString('vi-VN', {timeZone:'Asia/Ho_Chi_Minh', day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'}); } } catch(e) {}
        var lastUser = s.created_by_name ? '<br><span style="color:#7c3aed;font-size:10px">' + s.created_by_name + '</span>' : '';
        var isGD = typeof currentUser !== 'undefined' && currentUser && (currentUser.role === 'giam_doc' || currentUser.can_approve_tsam);
        var approveBtn = '';
        if (isGD && s.approval_status === 'PENDING') {
            approveBtn = '<button onclick="event.stopPropagation();_tsamApprove(' + s.id + ')" style="background:#059669;color:#fff;border:none;padding:2px 6px;border-radius:3px;font-size:9px;cursor:pointer;margin-right:2px" title="Duyệt">✅</button>'
                + '<button onclick="event.stopPropagation();_tsamReject(' + s.id + ')" style="background:#dc2626;color:#fff;border:none;padding:2px 6px;border-radius:3px;font-size:9px;cursor:pointer" title="Từ chối">❌</button>';
        }
        return '<tr style="cursor:pointer" onclick="_tsamDetail(' + s.id + ')">'
            + '<td style="text-align:center;color:var(--gray-400)">' + (i + 1) + '</td>'
            + '<td style="text-align:center"><span class="tsam-badge" style="background:#7c3aed">' + (s.category_name || '—') + '</span></td>'
            + '<td style="text-align:center;font-weight:800;color:#7c3aed">' + s.sample_code + '</td>'
            + '<td style="text-align:center"><span class="tsam-badge" style="background:' + typeColor + '">' + (_tsamTypes[s.sample_type] || s.sample_type) + '</span></td>'
            + '<td style="text-align:center;font-weight:700">' + (s.mix_color_count || 0) + '</td>'
            + '<td style="text-align:center">' + (s.collection || '—') + '</td>'
            + '<td style="text-align:center;font-size:10px">' + (sewNames.length ? sewNames.join(', ') : '—') + '</td>'
            + '<td style="text-align:center;font-weight:700;color:#059669">' + (s.factory_price ? _tsamFmt(s.factory_price) + 'đ' : '—') + '</td>'
            + '<td style="text-align:center;font-weight:700;color:#2563eb">' + (s.processing_price ? _tsamFmt(s.processing_price) + 'đ' : '—') + '</td>'
            + '<td style="text-align:center;white-space:nowrap">' + '<span style="color:' + stColor + ';font-weight:700;font-size:10px">' + stLabel + '</span> ' + approveBtn + '</td>'
            + '<td style="text-align:center;font-size:10px">' + lastUp + lastUser + '</td></tr>';
    }).join('');
}

// ========== CREATE / EDIT MODAL ==========
function _tsamShowCreate(editId) {
    var s = editId ? _tsam.samples.find(function(x) { return x.id === editId; }) : {};
    var isEdit = !!editId;
    var catOpts = _tsam.categories.map(function(c) { return '<option value="' + c.id + '"' + (c.id == s.category_id ? ' selected' : '') + '>' + c.name + '</option>'; }).join('');
    var curType = s.sample_type || 'DON';
    var isLocked = (curType === 'DON' || curType === '3D');
    var mixVal = isLocked ? 1 : (s.mix_color_count || 2);
    var rq = '<span style="color:red">*</span>';
    // Parse existing sewing_tech (now stores BGM item IDs with qty)
    var sewExist = []; try { sewExist = typeof s.sewing_tech === 'string' ? JSON.parse(s.sewing_tech) : (s.sewing_tech || []); } catch(e) {}
    window._tsamImgUrl = s.spec_image || '';
    window._tsamSewItems = sewExist.slice(); // [{id,name,qty,fp,pp}]
    var body = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
        + '<div class="form-group"><label>Lĩnh Vực ' + rq + '</label><select id="_tsamCat" class="form-control"><option value="">-- Chọn --</option>' + catOpts + '</select></div>'
        + '<div class="form-group"><label>Mã Mẫu ' + rq + '</label><input id="_tsamCode" class="form-control" autocomplete="off" value="' + (s.sample_code || '') + '"' + (isEdit ? ' disabled' : '') + ' placeholder="VD: DP-001"></div>'
        + '<div class="form-group"><label>Loại ' + rq + '</label><select id="_tsamType" class="form-control" onchange="_tsamTypeChanged()"><option value="DON"' + (curType === 'DON' ? ' selected' : '') + '>Đơn</option><option value="PHA_PHOI"' + (curType === 'PHA_PHOI' ? ' selected' : '') + '>Pha Phối</option><option value="3D"' + (curType === '3D' ? ' selected' : '') + '>3D</option></select></div>'
        + '<div class="form-group"><label>SL Màu Phối ' + rq + ' <span id="_tsamMixHint" style="font-size:10px;color:' + (isLocked ? '#059669' : '#f59e0b') + '">' + (isLocked ? '🔒 Auto = 1' : '✏️ Nhập ≥ 2') + '</span></label><input type="number" id="_tsamMixCount" class="form-control" value="' + mixVal + '" min="' + (isLocked ? '1' : '2') + '"' + (isLocked ? ' disabled style="background:#f1f5f9;cursor:not-allowed"' : '') + '></div>'
        + '</div>'
        // === PRODUCT CHECKLIST PICKER (Loại Bán) ===
        + '<div class="form-group" style="margin-top:8px"><label>📦 Sản Phẩm Áp Dụng (Loại Bán) ' + rq + '</label>'
        + '<div style="margin-bottom:6px;display:flex;gap:6px;align-items:center">'
        + '<input type="text" id="_tsamProdSearch" class="form-control" placeholder="🔍 Tìm nhanh sản phẩm..." oninput="_tsamFilterProds(this.value)" style="font-size:11px;padding:4px 8px;height:auto;width:180px">'
        + '<button type="button" class="btn btn-secondary" onclick="_tsamSelectAllProds(true)" style="font-size:10px;padding:3px 8px;white-space:nowrap;background:#e2e8f0;border:1px solid #cbd5e1;cursor:pointer;border-radius:4px">Chọn tất cả</button>'
        + '<button type="button" class="btn btn-secondary" onclick="_tsamSelectAllProds(false)" style="font-size:10px;padding:3px 8px;white-space:nowrap;background:#e2e8f0;border:1px solid #cbd5e1;cursor:pointer;border-radius:4px;margin-left:4px">Bỏ chọn</button>'
        + '</div>'
        + '<div id="_tsamProdList" style="display:grid;grid-template-columns:repeat(auto-fill, minmax(200px, 1fr));gap:6px;max-height:130px;overflow-y:auto;padding:8px;border:1px solid #e2e8f0;border-radius:6px;background:#f8fafc"></div>'
        + '</div>'
        // === MIX POSITION PICKER (only for PHA_PHOI) ===
        + '<div id="_tsamMixPosWrap" style="margin-top:8px;display:' + (curType === 'PHA_PHOI' ? 'block' : 'none') + '"><div class="form-group"><label>📌 Vị Trí Phối ' + rq + '</label>'
        + '<div id="_tsamMixPosList" style="display:flex;flex-wrap:wrap;gap:6px;padding:8px;border:1px solid #e2e8f0;border-radius:6px;background:#f8fafc;min-height:36px"><span style="color:#94a3b8;font-size:11px">Đang tải...</span></div></div></div>'
        // === IMAGE PASTE AREA (full width) ===
        + '<div class="form-group" style="margin-top:8px"><label>📷 Hình Ảnh Thông Số ' + rq + ' <span style="font-size:10px;color:#3b82f6">Ctrl+V để dán ảnh</span></label>'
        + '<div id="_tsamPasteZone" tabindex="0" style="border:2px dashed ' + (s.spec_image ? '#059669' : '#cbd5e1') + ';border-radius:10px;min-height:120px;display:flex;align-items:center;justify-content:center;cursor:pointer;background:' + (s.spec_image ? '#f0fdf4' : '#f8fafc') + ';transition:all .2s;outline:none;position:relative">'
        + (s.spec_image ? '<img src="' + s.spec_image + '" style="max-height:200px;max-width:100%;border-radius:8px">' : '<div style="text-align:center;color:#94a3b8"><div style="font-size:32px;margin-bottom:4px">📋</div><div style="font-size:11px;font-weight:600">Nhấn Ctrl+V để dán ảnh từ clipboard</div></div>')
        + '</div></div>'
        // === REMAINING FIELDS ===
        + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:8px">'
        + '<div class="form-group"><label>Bộ Sưu Tập ' + rq + '</label><input id="_tsamCollection" class="form-control" autocomplete="off" value="' + (s.collection || '') + '" placeholder="VD: BST Hè 2026"></div>'
        + '<div class="form-group"><label>🔗 Market Thiết Kế ' + rq + '</label><input id="_tsamMarket" class="form-control" autocomplete="off" value="' + (s.design_market || '') + '" placeholder="https://drive.google.com/drive/folders/..."></div>'
        + '<div class="form-group"><label>🔗 Tổng Hợp Áo Mẫu ' + rq + '</label><input id="_tsamTotal" class="form-control" autocomplete="off" value="' + (s.total_sample || '') + '" placeholder="https://drive.google.com/drive/folders/..."></div>'
        + '<div class="form-group"><label>🔗 Dưỡng Áo Mẫu ' + rq + '</label><input id="_tsamCare" class="form-control" autocomplete="off" value="' + (s.sample_care || '') + '" placeholder="https://drive.google.com/drive/folders/..."></div>'
        + '</div>'
        // === SEWING TECH PICKER (full width) ===
        + '<div class="form-group" style="margin-top:8px"><label>✂️ Kỹ Thuật May ' + rq + '</label>'
        + '<div id="_tsamSewTags" style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px;min-height:28px;padding:4px;border:1px solid #e2e8f0;border-radius:6px;background:#f8fafc"></div>'
        + '<button type="button" onclick="_tsamOpenBgmPicker()" style="background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;padding:5px 14px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer">➕ Chọn từ Bảng Giá May</button>'
        + '</div>'
        // === PRICES (auto-calculated from BGM) ===
        + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:8px">'
        + '<div class="form-group"><label>Giá Nhà May <span style="font-size:10px;color:#94a3b8">🔒 Auto SUM</span></label><input type="number" id="_tsamFactoryPrice" class="form-control" value="' + (s.factory_price || 0) + '" disabled style="background:#f1f5f9;cursor:not-allowed"></div>'
        + '<div class="form-group"><label>Giá Gia Công <span style="font-size:10px;color:#94a3b8">🔒 Auto SUM</span></label><input type="number" id="_tsamProcessPrice" class="form-control" value="' + (s.processing_price || 0) + '" disabled style="background:#f1f5f9;cursor:not-allowed"></div>'
        + '</div>';
    var footer = '<button class="btn btn-secondary" onclick="closeModal()">Hủy</button>'
        + '<button class="btn" onclick="_tsamSubmit(' + (editId || 0) + ')" style="background:linear-gradient(135deg,#7c3aed,#8b5cf6);color:#fff;border:none;padding:8px 24px;border-radius:8px;font-weight:800">💾 ' + (isEdit ? 'Cập Nhật' : 'Tạo Mẫu') + '</button>';
    openModal((isEdit ? '✏️ Sửa Mẫu ' + s.sample_code : '➕ Thêm Mẫu Áo Mới'), body, footer);
    // Attach paste handler + render sewing tags
    setTimeout(function() {
        var zone = document.getElementById('_tsamPasteZone');
        if (zone) {
            zone.addEventListener('paste', _tsamHandlePaste);
            zone.addEventListener('click', function() { this.focus(); });
        }
        var selectedIds = [];
        if (s.product_ids) {
            if (typeof s.product_ids === 'string') {
                try { selectedIds = JSON.parse(s.product_ids); } catch(e) {}
            } else if (Array.isArray(s.product_ids)) {
                selectedIds = s.product_ids;
            }
        }
        _tsamRenderProdList(selectedIds);
        _tsamRenderSewTags();
        _tsamLoadMixPositions(s);
        // Attach real-time Google Drive link validation
        ['_tsamMarket', '_tsamTotal', '_tsamCare'].forEach(function(id) {
            var el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', function() { _tsamValidateLinkInput(this); _tsamCheckDupLinks(); });
                el.addEventListener('blur', function() { _tsamValidateLinkInput(this); _tsamCheckDupLinks(); });
                _tsamValidateLinkInput(el);
            }
        });
    }, 100);
}

function _tsamTypeChanged() {
    var type = document.getElementById('_tsamType')?.value;
    var inp = document.getElementById('_tsamMixCount');
    var hint = document.getElementById('_tsamMixHint');
    if (!inp) return;
    if (type === 'DON' || type === '3D') {
        inp.value = 1; inp.disabled = true; inp.min = 1;
        inp.style.background = '#f1f5f9'; inp.style.cursor = 'not-allowed';
        if (hint) { hint.textContent = '🔒 Auto = 1'; hint.style.color = '#059669'; }
    } else {
        inp.disabled = false; inp.min = 2;
        inp.style.background = ''; inp.style.cursor = '';
        if (Number(inp.value) < 2) inp.value = 2;
        if (hint) { hint.textContent = '✏️ Nhập ≥ 2'; hint.style.color = '#f59e0b'; }
    }
    // Toggle mix position picker visibility
    var wrap = document.getElementById('_tsamMixPosWrap');
    if (wrap) wrap.style.display = (type === 'PHA_PHOI') ? 'block' : 'none';
}

// ========== REAL-TIME LINK VALIDATION ==========
var _tsamDriveRe = /^https:\/\/drive\.google\.com\/drive\/(u\/\d+\/)?folders\/.+/i;
function _tsamValidateLinkInput(el) {
    var val = (el.value || '').trim();
    if (!val) { el.style.borderColor = ''; el.style.boxShadow = ''; return; }
    if (_tsamDriveRe.test(val)) { el.style.borderColor = '#059669'; el.style.boxShadow = '0 0 0 2px rgba(5,150,105,0.15)'; }
    else { el.style.borderColor = '#dc2626'; el.style.boxShadow = '0 0 0 2px rgba(220,38,38,0.15)'; }
}
function _tsamCheckDupLinks() {
    var ids = ['_tsamMarket', '_tsamTotal', '_tsamCare'];
    var vals = ids.map(function(id) { return (document.getElementById(id)?.value || '').trim().toLowerCase(); });
    ids.forEach(function(id, i) {
        var el = document.getElementById(id);
        if (!el) return;
        var v = vals[i];
        if (!v) return;
        var isDup = vals.some(function(x, j) { return j !== i && x && x === v; });
        if (isDup) { el.style.borderColor = '#dc2626'; el.style.boxShadow = '0 0 0 2px rgba(220,38,38,0.15)'; }
    });
}

// ========== MIX POSITION LOADER ==========
async function _tsamLoadMixPositions(existingSample) {
    var list = document.getElementById('_tsamMixPosList');
    if (!list) return;
    var res = await apiCall('/api/tsam/mix-positions');
    var positions = res.positions || [];
    if (!positions.length) {
        list.innerHTML = '<span style="color:#f59e0b;font-size:11px">⚠️ Chưa setup vị trí phối trong Cài Đặt Sản Xuất</span>';
        return;
    }
    // Parse existing mix_positions
    var existing = [];
    try { existing = typeof existingSample.mix_positions === 'string' ? JSON.parse(existingSample.mix_positions) : (existingSample.mix_positions || []); } catch(e) {}
    var h = '';
    positions.forEach(function(p) {
        var checked = existing.indexOf(p.name) >= 0;
        h += '<label style="display:flex;align-items:center;gap:4px;padding:4px 10px;background:' + (checked ? '#ede9fe' : '#fff') + ';border:1px solid ' + (checked ? '#7c3aed' : '#e2e8f0') + ';border-radius:6px;cursor:pointer;font-size:11px;font-weight:600;transition:all .2s">'
            + '<input type="checkbox" class="_tsamMixCb" value="' + p.name + '"' + (checked ? ' checked' : '') + ' style="cursor:pointer">'
            + ' ' + p.name + '</label>';
    });
    list.innerHTML = h;
    // Add visual feedback on change
    list.querySelectorAll('._tsamMixCb').forEach(function(cb) {
        cb.addEventListener('change', function() {
            var lbl = this.parentElement;
            if (this.checked) { lbl.style.background = '#ede9fe'; lbl.style.borderColor = '#7c3aed'; }
            else { lbl.style.background = '#fff'; lbl.style.borderColor = '#e2e8f0'; }
        });
    });
}

// ========== IMAGE PASTE HANDLER ==========
async function _tsamHandlePaste(e) {
    var items = (e.clipboardData || e.originalEvent.clipboardData).items;
    for (var i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
            e.preventDefault();
            var blob = items[i].getAsFile();
            var zone = document.getElementById('_tsamPasteZone');
            if (zone) {
                zone.style.borderColor = '#f59e0b';
                zone.innerHTML = '<div style="text-align:center;color:#f59e0b"><div style="font-size:24px;animation:_tsamSpin 1s linear infinite">⚙️</div><div style="font-size:11px;font-weight:600;margin-top:4px">Đang upload...</div></div>';
            }
            var fd = new FormData();
            fd.append('file', blob, 'paste_' + Date.now() + '.png');
            try {
                var resp = await fetch('/api/tsam/upload', { method: 'POST', body: fd, credentials: 'include' });
                var data = await resp.json();
                if (data.success && data.url) {
                    window._tsamImgUrl = data.url;
                    if (zone) {
                        zone.style.borderColor = '#059669'; zone.style.background = '#f0fdf4';
                        zone.innerHTML = '<img src="' + data.url + '" style="max-height:200px;max-width:100%;border-radius:8px">';
                    }
                    showToast('✅ Đã upload hình ảnh');
                } else { showToast(data.error || 'Lỗi upload', 'error'); }
            } catch(err) { showToast('Lỗi upload ảnh', 'error'); }
            return;
        }
    }
}

async function _tsamSubmit(editId) {
    var urlRe = /^https:\/\/drive\.google\.com\/drive\/(u\/\d+\/)?folders\/.+/i;
    var sewArr = (window._tsamSewItems || []).slice();
    // Auto-calc prices from selected BGM items
    var autoFP = 0, autoPP = 0;
    sewArr.forEach(function(s) { autoFP += (Number(s.fp)||0)*(Number(s.qty)||1); autoPP += (Number(s.pp)||0)*(Number(s.qty)||1); });
    var data = {
        category_id: document.getElementById('_tsamCat')?.value || null,
        sample_code: document.getElementById('_tsamCode')?.value?.trim(),
        sample_type: document.getElementById('_tsamType')?.value || 'DON',
        mix_color_count: document.getElementById('_tsamMixCount')?.value || 0,
        mix_positions: [],
        product_ids: [],
        collection: document.getElementById('_tsamCollection')?.value?.trim() || '',
        design_market: document.getElementById('_tsamMarket')?.value?.trim() || '',
        total_sample: document.getElementById('_tsamTotal')?.value?.trim() || '',
        sample_care: document.getElementById('_tsamCare')?.value?.trim() || '',
        sewing_tech: sewArr,
        spec_image: window._tsamImgUrl || '',
        factory_price: autoFP,
        processing_price: autoPP
    };
    // Collect mix positions from checkboxes
    document.querySelectorAll('._tsamMixCb:checked').forEach(function(cb) { data.mix_positions.push(cb.value); });
    // Collect checked product IDs
    document.querySelectorAll('#_tsamProdList ._tsamProdCb:checked').forEach(function(cb) { data.product_ids.push(Number(cb.value)); });
    // === Client-side validation ===
    if (!data.category_id) { showToast('Chọn Lĩnh Vực', 'error'); return; }
    if (!data.sample_code) { showToast('Nhập Mã Mẫu', 'error'); return; }
    if (data.product_ids.length === 0) { showToast('Chọn ít nhất 1 sản phẩm áp dụng (Loại Bán)', 'error'); return; }
    if (!data.spec_image) { showToast('Chưa dán Hình Ảnh Thông Số (Ctrl+V)', 'error'); return; }
    if (!data.collection) { showToast('Nhập Bộ Sưu Tập', 'error'); return; }
    if (!data.design_market) { showToast('Nhập Market Thiết Kế', 'error'); return; }
    if (!urlRe.test(data.design_market)) { showToast('Market Thiết Kế phải là link Google Drive folder (https://drive.google.com/drive/folders/...)', 'error'); return; }
    if (!data.total_sample) { showToast('Nhập Tổng Hợp Áo Mẫu', 'error'); return; }
    if (!urlRe.test(data.total_sample)) { showToast('Tổng Hợp Áo Mẫu phải là link Google Drive folder (https://drive.google.com/drive/folders/...)', 'error'); return; }
    if (!data.sample_care) { showToast('Nhập Dưỡng Áo Mẫu', 'error'); return; }
    if (!urlRe.test(data.sample_care)) { showToast('Dưỡng Áo Mẫu phải là link Google Drive folder (https://drive.google.com/drive/folders/...)', 'error'); return; }
    // === Check duplicate links ===
    var _dm = data.design_market.trim().toLowerCase(), _ts = data.total_sample.trim().toLowerCase(), _sc = data.sample_care.trim().toLowerCase();
    if (_dm === _ts || _dm === _sc || _ts === _sc) { showToast('3 link (Market TK, Tổng Hợp, Dưỡng) không được trùng nhau!', 'error'); return; }
    if (sewArr.length === 0) { showToast('Chọn Kỹ Thuật May từ Bảng Giá May', 'error'); return; }
    if (data.sample_type === 'PHA_PHOI' && Number(data.mix_color_count) < 2) { showToast('Pha Phối phải có ≥ 2 màu', 'error'); return; }
    if (data.sample_type === 'PHA_PHOI' && data.mix_positions.length === 0) { showToast('Chọn ít nhất 1 Vị Trí Phối', 'error'); return; }
    var res;
    if (editId) { res = await apiCall('/api/tsam/samples/' + editId, 'PUT', data); }
    else { res = await apiCall('/api/tsam/samples', 'POST', data); }
    if (res.success) { showToast('✅ ' + (editId ? 'Đã cập nhật' : 'Đã tạo mẫu')); closeModal(); await _tsamRefresh(); }
    else { showToast(res.error || 'Lỗi', 'error'); }
}

// ========== DETAIL MODAL ==========
async function _tsamDetail(id) {
    var s = _tsam.samples.find(function(x) { return x.id === id; });
    if (!s) return;
    var sewing = []; try { sewing = typeof s.sewing_tech === 'string' ? JSON.parse(s.sewing_tech) : (s.sewing_tech || []); } catch(e) {}
    var mix = []; try { mix = typeof s.mix_positions === 'string' ? JSON.parse(s.mix_positions) : (s.mix_positions || []); } catch(e) {}
    var stColor = _tsamStatusColors[s.approval_status] || '#94a3b8';
    var sewTags = sewing.length ? sewing.map(function(t){ var nm = typeof t === 'string' ? t : (t.name || ''); return '<span style="background:#6366f1;color:#fff;padding:1px 6px;border-radius:4px;font-size:10px;font-weight:700;margin-right:3px">'+nm+'</span>'; }).join('') : '—';
    var updatedStr = '—'; try { if (s.updated_at) { var _d2 = new Date(s.updated_at); updatedStr = _d2.toLocaleString('vi-VN', {timeZone:'Asia/Ho_Chi_Minh', day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit'}); } } catch(e) {}
    var body = '<div style="background:#f8fafc;border:1px solid var(--gray-200);border-radius:10px;padding:16px;margin-bottom:12px">'
        + '<table style="width:100%;font-size:13px;border-collapse:collapse">';
    var rows = [
        ['MÃ MẪU', '<b style="color:#7c3aed;font-size:15px">' + s.sample_code + '</b>'],
        ['LĨNH VỰC', s.category_name || '—'],
        ['SẢN PHẨM ÁP DỤNG', '<span style="color:#4f46e5;font-weight:700">' + (s.product_names || '—') + '</span>'],
        ['LOẠI', '<span class="tsam-badge" style="background:' + (_tsamTypeColors[s.sample_type]||'#64748b') + '">' + (_tsamTypes[s.sample_type]||s.sample_type) + '</span>'],
        ['VỊ TRÍ PHỐI', mix.length ? mix.join(', ') : '—'],
        ['SL MÀU PHỐI', s.mix_color_count || 0],
        ['BỘ SƯU TẬP', s.collection || '—'],
        ['MARKET TK', _tsamIsUrl(s.design_market) ? '<a href="'+s.design_market+'" target="_blank" style="color:#3b82f6;font-weight:700">🔗 '+s.design_market.substring(0,50)+'...</a>' : (s.design_market||'—')],
        ['TỔNG HỢP ÁO MẪU', _tsamIsUrl(s.total_sample) ? '<a href="'+s.total_sample+'" target="_blank" style="color:#3b82f6;font-weight:700">🔗 '+s.total_sample.substring(0,50)+'...</a>' : (s.total_sample||'—')],
        ['DƯỠNG ÁO MẪU', _tsamIsUrl(s.sample_care) ? '<a href="'+s.sample_care+'" target="_blank" style="color:#3b82f6;font-weight:700">🔗 '+s.sample_care.substring(0,50)+'...</a>' : (s.sample_care||'—')],
        ['KỸ THUẬT MAY', sewTags],
        ['GIÁ NHÀ MAY', '<span style="color:#059669;font-weight:800;font-size:14px">' + (s.factory_price ? _tsamFmt(s.factory_price) + 'đ' : '0đ') + '</span> <span style="font-size:10px;color:#94a3b8">🔒 từ Bảng Giá May</span>'],
        ['GIÁ GIA CÔNG', '<span style="color:#2563eb;font-weight:800;font-size:14px">' + (s.processing_price ? _tsamFmt(s.processing_price) + 'đ' : '0đ') + '</span> <span style="font-size:10px;color:#94a3b8">🔒 từ Bảng Giá May</span>'],
        ['ĐƠN SẢN XUẤT', '<span style="background:#3b82f6;color:#fff;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;cursor:pointer" onclick="_tsamShowOrders(' + s.id + ')">' + (s.order_count || 0) + ' đơn</span>'],
        ['TRẠNG THÁI', '<span style="color:' + stColor + ';font-weight:800">' + (_tsamStatusLabels[s.approval_status]||'—') + '</span>' + (s.approved_by_name ? ' — ' + s.approved_by_name : '')],
        ['NGƯỜI TẠO', s.created_by_name || '—'],
        ['CẬP NHẬT', updatedStr]
    ];
    rows.forEach(function(r) {
        body += '<tr><td style="padding:6px 12px;color:#64748b;font-weight:700;font-size:11px;text-transform:uppercase;width:140px;border-bottom:1px solid var(--gray-100)">' + r[0] + '</td>'
            + '<td style="padding:6px 12px;border-bottom:1px solid var(--gray-100)">' + r[1] + '</td></tr>';
    });
    body += '</table></div>';
    // === Spec Image ===
    if (s.spec_image) {
        body += '<div style="margin-bottom:12px"><div style="font-weight:700;font-size:12px;color:#7c3aed;margin-bottom:6px">📷 Hình Ảnh Thông Số</div>'
            + '<div style="background:#f8fafc;border:1px solid var(--gray-200);border-radius:10px;padding:12px;text-align:center">'
            + '<img src="' + s.spec_image + '" style="max-width:100%;max-height:400px;border-radius:8px;cursor:pointer" onclick="window.open(\'' + s.spec_image + '\',\'_blank\')">'
            + '</div></div>';
    }
    // History section
    body += '<div id="_tsamHistArea" style="color:var(--gray-400);text-align:center;padding:12px">Đang tải lịch sử...</div>';
    var isGD = typeof currentUser !== 'undefined' && currentUser && (currentUser.role === 'giam_doc' || currentUser.can_approve_tsam);
    var isApproved = s.approval_status === 'APPROVED';
    var isDirector = typeof currentUser !== 'undefined' && currentUser && currentUser.role === 'giam_doc';
    var footer = '<button class="btn btn-secondary" onclick="closeModal()">Đóng</button>';
    if (!isApproved || isDirector) footer += '<button class="btn" onclick="_tsamShowCreate(' + s.id + ')" style="background:#f59e0b;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-weight:700">✏️ Sửa</button>';
    if (isGD && (!isApproved || isDirector)) footer += '<button class="btn" onclick="_tsamDelete(' + s.id + ')" style="background:#dc2626;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-weight:700">🗑️ Xóa</button>';
    openModal('📐 ' + s.sample_code, body, footer);
    // Load history async
    var histRes = await apiCall('/api/tsam/samples/' + id + '/history');
    var area = document.getElementById('_tsamHistArea');
    if (!area) return;
    var hist = histRes.history || [];
    if (!hist.length) { area.innerHTML = '<div style="color:var(--gray-400);font-size:11px">Chưa có lịch sử</div>'; return; }
    var hh = '<div style="font-weight:800;font-size:13px;margin-bottom:8px;color:#7c3aed">📋 Lịch Sử Cập Nhật</div>';
    hh += '<table style="width:100%;border-collapse:collapse;font-size:11px"><thead><tr><th style="padding:6px;border-bottom:2px solid var(--gray-200);text-align:left">Thời gian</th><th style="padding:6px;border-bottom:2px solid var(--gray-200);text-align:left">Hành động</th><th style="padding:6px;border-bottom:2px solid var(--gray-200);text-align:left">Người thực hiện</th></tr></thead><tbody>';
    hist.forEach(function(h) {
        var actionColors = { CREATE: '#059669', UPDATE: '#3b82f6', APPROVE: '#059669', REJECT: '#dc2626', DELETE: '#dc2626' };
        var histTime = '—'; try { if (h.changed_at) { var _d3 = new Date(h.changed_at); histTime = _d3.toLocaleString('vi-VN', {timeZone:'Asia/Ho_Chi_Minh', day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit'}); } } catch(e) {}
        hh += '<tr><td style="padding:5px 6px">' + histTime + '</td>'
            + '<td style="padding:5px 6px"><span style="background:' + (actionColors[h.action]||'#64748b') + ';color:#fff;padding:1px 6px;border-radius:3px;font-size:9px;font-weight:700">' + h.action + '</span></td>'
            + '<td style="padding:5px 6px">' + (h.changed_by_name || '—') + '</td></tr>';
    });
    hh += '</tbody></table>';
    area.innerHTML = hh;
}

// ========== LINKED ORDERS MODAL ==========
async function _tsamShowOrders(id) {
    var s = _tsam.samples.find(function(x) { return x.id === id; });
    var res = await apiCall('/api/tsam/samples/' + id + '/orders');
    var orders = res.orders || [];
    var body = '';
    if (!orders.length) { body = '<div style="text-align:center;padding:30px;color:var(--gray-400)"><div style="font-size:32px">📭</div>Chưa có đơn sản xuất nào link với mẫu này</div>'; }
    else {
        body = '<table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr><th style="padding:6px;border-bottom:2px solid var(--gray-200)">#</th><th style="padding:6px;border-bottom:2px solid var(--gray-200)">Mã Đơn</th><th style="padding:6px;border-bottom:2px solid var(--gray-200)">Ngày</th><th style="padding:6px;border-bottom:2px solid var(--gray-200)">Khách</th><th style="padding:6px;border-bottom:2px solid var(--gray-200);text-align:right">Tổng Tiền</th></tr></thead><tbody>';
        orders.forEach(function(o, i) {
            body += '<tr><td style="padding:5px 6px">' + (i+1) + '</td><td style="padding:5px 6px;font-weight:700;color:#7c3aed">' + (o.dht_order_code || '—') + '</td><td style="padding:5px 6px">' + (o.order_date || '—') + '</td><td style="padding:5px 6px">' + (o.customer_name || '—') + '</td><td style="padding:5px 6px;text-align:right;font-weight:700">' + _tsamFmt(o.total_amount) + 'đ</td></tr>';
        });
        body += '</tbody></table>';
    }
    openModal('📦 Đơn SX — ' + (s ? s.sample_code : ''), body, '<button class="btn btn-secondary" onclick="closeModal()">Đóng</button>');
}

// ========== APPROVE / REJECT ==========
async function _tsamApprove(id) {
    if (!confirm('Duyệt mẫu áo này?')) return;
    var res = await apiCall('/api/tsam/samples/' + id + '/approve', 'PUT');
    if (res.success) { showToast('✅ Đã duyệt'); await _tsamRefresh(); } else { showToast(res.error || 'Lỗi', 'error'); }
}
async function _tsamReject(id) {
    var reason = prompt('Lý do từ chối:');
    if (reason === null) return;
    var res = await apiCall('/api/tsam/samples/' + id + '/reject', 'PUT', { reason: reason });
    if (res.success) { showToast('❌ Đã từ chối'); await _tsamRefresh(); } else { showToast(res.error || 'Lỗi', 'error'); }
}
async function _tsamDelete(id) {
    if (!confirm('Xóa mẫu áo này?')) return;
    var res = await apiCall('/api/tsam/samples/' + id, 'DELETE');
    if (res.success) { showToast('🗑️ Đã xóa'); closeModal(); await _tsamRefresh(); } else { showToast(res.error || 'Lỗi', 'error'); }
}

async function _tsamRefresh() {
    var treeRes = await apiCall('/api/tsam/tree');
    _tsam.tree = treeRes.categories || [];
    _tsam.totalInfo = treeRes.total || {};
    _tsamRenderSB();
    await _tsamLoad();
}

// ========== BGM PICKER FOR TSAM ==========
function _tsamRenderSewTags() {
    var el = document.getElementById('_tsamSewTags'); if (!el) return;
    var items = window._tsamSewItems || [];
    if (items.length === 0) { el.innerHTML = '<span style="color:#94a3b8;font-size:11px">Chưa chọn kỹ thuật may nào</span>'; _tsamCalcPrices(); return; }
    el.innerHTML = items.map(function(s, i) {
        return '<span style="background:#6366f1;color:#fff;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;display:inline-flex;align-items:center;gap:3px">'
            + s.name
            + '<button type="button" onclick="_tsamRemoveSew(' + i + ')" style="background:none;border:none;color:#fde68a;cursor:pointer;font-size:12px;padding:0 2px">&times;</button></span>';
    }).join('');
    _tsamCalcPrices();
}

function _tsamRemoveSew(idx) {
    (window._tsamSewItems || []).splice(idx, 1);
    _tsamRenderSewTags();
}

function _tsamCalcPrices() {
    var items = window._tsamSewItems || [];
    var fp = 0, pp = 0;
    items.forEach(function(s) { fp += (Number(s.fp)||0)*(Number(s.qty)||1); pp += (Number(s.pp)||0)*(Number(s.qty)||1); });
    var fpEl = document.getElementById('_tsamFactoryPrice');
    var ppEl = document.getElementById('_tsamProcessPrice');
    if (fpEl) fpEl.value = fp;
    if (ppEl) ppEl.value = pp;
}

async function _tsamOpenBgmPicker() {
    var res = await apiCall('/api/bgm/dropdown');
    var allItems = res.items || [];
    // Save parent modal state for restoration
    window._bgmPickerItems = allItems;
    window._bgmPickerExisting = (window._tsamSewItems || []).slice();
    // Save form values (innerHTML doesn't preserve typed input values)
    window._bgmParentFormValues = {
        category_id: document.getElementById('_tsamCat')?.value || '',
        sample_code: document.getElementById('_tsamCode')?.value || '',
        sample_type: document.getElementById('_tsamType')?.value || 'DON',
        mix_color_count: document.getElementById('_tsamMixCount')?.value || '',
        collection: document.getElementById('_tsamCollection')?.value || '',
        design_market: document.getElementById('_tsamMarket')?.value || '',
        total_sample: document.getElementById('_tsamTotal')?.value || '',
        sample_care: document.getElementById('_tsamCare')?.value || '',
        spec_image: window._tsamImgUrl || ''
    };
    // Also save checked mix positions
    var mixPosChecked = [];
    document.querySelectorAll('._tsamMixCb:checked').forEach(function(cb) { mixPosChecked.push(cb.value); });
    window._bgmParentFormValues.mix_positions = mixPosChecked;

    // Also save checked product_ids
    var prodIdsChecked = [];
    document.querySelectorAll('#_tsamProdList ._tsamProdCb:checked').forEach(function(cb) { prodIdsChecked.push(Number(cb.value)); });
    window._bgmParentFormValues.product_ids = prodIdsChecked;

    window._bgmParentModal = {
        title: document.getElementById('modalTitle').innerHTML,
        body: document.getElementById('modalBody').innerHTML,
        footer: document.getElementById('modalFooter').innerHTML
    };

    var search = '<input type="text" id="_bgmPickerSearch" placeholder="🔍 Tìm tên chi tiết..." style="width:100%;padding:6px 12px;border:1px solid #e2e8f0;border-radius:6px;font-size:12px;margin-bottom:8px">';
    var totalBar = '<div id="_bgmPickerTotals" style="display:flex;gap:12px;padding:6px 10px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;margin-bottom:8px;font-size:11px;font-weight:700;align-items:center">'
        + '<span style="flex:1;color:#64748b">💰 Tổng:</span>'
        + '<span style="color:#059669">NM: <span id="_bgmTotalFP">0</span></span>'
        + '<span style="color:#2563eb">GC: <span id="_bgmTotalPP">0</span></span>'
        + '</div>';
    var legend = '<div style="display:flex;gap:12px;margin-bottom:6px;font-size:10px;padding:0 8px;align-items:center">'
        + '<span style="font-weight:700;color:#64748b;flex:1">Chi tiết</span>'
        + '<span style="color:#dc2626;font-weight:700">🔒 Chỉ 1</span>'
        + '<span style="color:#059669;font-weight:700">🔓 Nhiều</span>'
        + '<span style="min-width:50px;text-align:right;color:#059669;font-weight:700">Giá NM</span>'
        + '<span style="min-width:50px;text-align:right;color:#2563eb;font-weight:700">Giá GC</span>'
        + '</div>';
    var listContainer = '<div id="_bgmPickerListWrap"></div>';

    var footer = '<button class="btn btn-secondary" onclick="_tsamCloseBgmPicker()">Hủy</button>'
        + '<button class="btn" onclick="_tsamApplyBgm()" style="background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;padding:8px 20px;border-radius:6px;font-weight:700">✅ Xác Nhận</button>';
    openModal('✂️ Chọn Kỹ Thuật May', search + totalBar + legend + listContainer, footer);

    // Render initial list
    _tsamRenderBgmList('');

    // Attach search handler
    setTimeout(function() {
        var searchEl = document.getElementById('_bgmPickerSearch');
        if (searchEl) {
            searchEl.focus();
            searchEl.addEventListener('input', function() {
                _tsamSaveBgmChecked();
                _tsamRenderBgmList(searchEl.value);
            });
        }
    }, 100);
}

function _tsamRenderBgmList(query) {
    var wrap = document.getElementById('_bgmPickerListWrap');
    if (!wrap) return;
    var allItems = window._bgmPickerItems || [];
    var existing = window._bgmPickerExisting || [];
    var existIds = existing.map(function(s) { return s.id; });
    var q = (query || '').toLowerCase().trim();

    // Filter items by search
    var filtered = allItems;
    if (q) {
        filtered = allItems.filter(function(item) {
            return item.name.toLowerCase().indexOf(q) >= 0 || item.group_name.toLowerCase().indexOf(q) >= 0;
        });
    }

    // Group by group_name and detect group type
    var groups = {};
    filtered.forEach(function(item) {
        if (!groups[item.group_name]) groups[item.group_name] = { items: [], type: item.add_type };
        groups[item.group_name].items.push(item);
        if (item.add_type === 'once') groups[item.group_name].type = 'once';
    });

    var h = '';
    var groupKeys = Object.keys(groups).sort();
    if (groupKeys.length === 0 && q) {
        h += '<div style="text-align:center;padding:20px;color:#94a3b8;font-size:12px">Không tìm thấy "' + q + '"</div>';
    }
    groupKeys.forEach(function(gName) {
        var g = groups[gName];
        var isOnce = g.type === 'once';
        var safeName = gName.replace(/[^a-zA-Z0-9_]/g, '_');
        var ruleIcon = isOnce ? '🔒' : '🔓';
        var ruleText = isOnce ? 'Chỉ chọn 1' : 'Chọn nhiều';
        var ruleColor = isOnce ? '#dc2626' : '#059669';
        h += '<div style="margin-bottom:10px"><div style="font-weight:800;font-size:11px;color:#1d4ed8;padding:4px 8px;background:#dbeafe;border-radius:4px;margin-bottom:4px;display:flex;align-items:center;gap:6px">'
            + '<span>' + gName + '</span>'
            + '<span style="margin-left:auto;font-size:9px;font-weight:700;color:' + ruleColor + ';background:' + (isOnce ? '#fef2f2' : '#f0fdf4') + ';padding:1px 6px;border-radius:3px">' + ruleIcon + ' ' + ruleText + '</span>'
            + '</div>';
        g.items.forEach(function(item) {
            var checked = existIds.indexOf(item.id) >= 0;
            var inputHtml;
            if (isOnce) {
                // Checkbox with JS mutual exclusion (allows uncheck, unlike radio)
                inputHtml = '<input type="checkbox" class="_bgmCb _bgmOnce" data-id="' + item.id + '" data-name="' + item.name + '" data-fp="' + item.factory_price + '" data-pp="' + item.processing_price + '" data-type="once" data-group="' + gName + '"' + (checked ? ' checked' : '') + ' onchange="_bgmOnceCheck(this);_bgmUpdateTotals()" style="cursor:pointer">';
            } else {
                inputHtml = '<input type="checkbox" class="_bgmCb" data-id="' + item.id + '" data-name="' + item.name + '" data-fp="' + item.factory_price + '" data-pp="' + item.processing_price + '" data-type="multi" data-group="' + gName + '"' + (checked ? ' checked' : '') + ' onchange="_bgmUpdateTotals()" style="cursor:pointer">';
            }
            h += '<label style="display:flex;align-items:center;gap:6px;padding:4px 8px;font-size:11px;cursor:pointer;border-bottom:1px solid #f8fafc" onmouseover="this.style.background=\'#f0fdf4\'" onmouseout="this.style.background=\'\'">'
                + inputHtml
                + '<span style="flex:1;font-weight:600">' + item.name + '</span>'
                + '<span style="color:#059669;font-weight:700;font-size:10px;min-width:50px;text-align:right">' + Number(item.factory_price).toLocaleString('vi-VN') + '</span>'
                + '<span style="color:#2563eb;font-weight:700;font-size:10px;min-width:50px;text-align:right">' + Number(item.processing_price).toLocaleString('vi-VN') + '</span>'
                + '</label>';
        });
        h += '</div>';
    });
    if (allItems.length === 0) h = '<div style="text-align:center;padding:20px;color:#94a3b8">Chưa có chi tiết may nào trong Bảng Giá May</div>';

    wrap.innerHTML = '<div style="max-height:55vh;overflow-y:auto">' + h + '</div>';
    _bgmUpdateTotals();
}

function _bgmOnceCheck(el) {
    if (!el.checked) return; // allow uncheck freely
    // Uncheck all other checkboxes in the same group
    var group = el.dataset.group;
    var id = el.dataset.id;
    document.querySelectorAll('._bgmOnce[data-group="' + group + '"]').forEach(function(cb) {
        if (cb.dataset.id !== id) cb.checked = false;
    });
}

function _bgmUpdateTotals() {
    var cbs = document.querySelectorAll('._bgmCb:checked');
    var fp = 0, pp = 0;
    cbs.forEach(function(cb) { fp += Number(cb.dataset.fp) || 0; pp += Number(cb.dataset.pp) || 0; });
    // Also add hidden items (filtered out by search but still selected)
    var prev = window._bgmPickerExisting || [];
    var visibleIds = {};
    document.querySelectorAll('._bgmCb').forEach(function(cb) { visibleIds[Number(cb.dataset.id)] = true; });
    prev.forEach(function(p) {
        if (!visibleIds[p.id]) { fp += Number(p.fp) || 0; pp += Number(p.pp) || 0; }
    });
    var fpEl = document.getElementById('_bgmTotalFP');
    var ppEl = document.getElementById('_bgmTotalPP');
    if (fpEl) fpEl.textContent = Number(fp).toLocaleString('vi-VN');
    if (ppEl) ppEl.textContent = Number(pp).toLocaleString('vi-VN');
}
function _tsamSaveBgmChecked() {
    var cbs = document.querySelectorAll('._bgmCb:checked');
    var items = [];
    cbs.forEach(function(cb) {
        items.push({ id: Number(cb.dataset.id), name: cb.dataset.name, fp: Number(cb.dataset.fp), pp: Number(cb.dataset.pp) });
    });
    // Merge with existing selections (keep items that were checked but now filtered out)
    var prev = window._bgmPickerExisting || [];
    var newIds = items.map(function(i) { return i.id; });
    var visibleIds = (document.querySelectorAll('._bgmCb') || []);
    var visibleIdSet = {};
    visibleIds.forEach(function(cb) { visibleIdSet[Number(cb.dataset.id)] = true; });
    prev.forEach(function(p) {
        if (!visibleIdSet[p.id] && newIds.indexOf(p.id) < 0) {
            items.push(p);
        }
    });
    window._bgmPickerExisting = items;
}

function _tsamCloseBgmPicker() {
    // Restore parent modal
    var p = window._bgmParentModal;
    if (p) {
        document.getElementById('modalTitle').innerHTML = p.title;
        document.getElementById('modalBody').innerHTML = p.body;
        document.getElementById('modalFooter').innerHTML = p.footer;
        // Restore form values that innerHTML lost
        var fv = window._bgmParentFormValues || {};
        setTimeout(function() {
            if (fv.category_id) { var el = document.getElementById('_tsamCat'); if (el) el.value = fv.category_id; }
            if (fv.sample_code) { var el = document.getElementById('_tsamCode'); if (el) el.value = fv.sample_code; }
            if (fv.sample_type) { var el = document.getElementById('_tsamType'); if (el) el.value = fv.sample_type; }
            if (fv.mix_color_count) { var el = document.getElementById('_tsamMixCount'); if (el) el.value = fv.mix_color_count; }
            if (fv.collection) { var el = document.getElementById('_tsamCollection'); if (el) el.value = fv.collection; }
            if (fv.design_market) { var el = document.getElementById('_tsamMarket'); if (el) el.value = fv.design_market; }
            if (fv.total_sample) { var el = document.getElementById('_tsamTotal'); if (el) el.value = fv.total_sample; }
            if (fv.sample_care) { var el = document.getElementById('_tsamCare'); if (el) el.value = fv.sample_care; }
            // Restore spec image
            if (fv.spec_image) {
                window._tsamImgUrl = fv.spec_image;
                var zone = document.getElementById('_tsamPasteZone');
                if (zone) {
                    zone.style.borderColor = '#059669'; zone.style.background = '#f0fdf4';
                    zone.innerHTML = '<img src="' + fv.spec_image + '" style="max-height:200px;max-width:100%;border-radius:8px">';
                }
            }
            // Restore mix position checkboxes
            if (fv.mix_positions && fv.mix_positions.length) {
                document.querySelectorAll('._tsamMixCb').forEach(function(cb) {
                    if (fv.mix_positions.indexOf(cb.value) >= 0) {
                        cb.checked = true;
                        cb.parentElement.style.background = '#ede9fe';
                        cb.parentElement.style.borderColor = '#7c3aed';
                    }
                });
            }
            // Restore product_ids checkboxes
            if (fv.product_ids && fv.product_ids.length) {
                _tsamRenderProdList(fv.product_ids);
            } else {
                _tsamRenderProdList([]);
            }
            // Show/hide mix position section based on type
            _tsamTypeChanged();
            // Re-attach paste handler
            var zone = document.getElementById('_tsamPasteZone');
            if (zone) {
                zone.addEventListener('paste', _tsamHandlePaste);
                zone.addEventListener('click', function() { this.focus(); });
            }
            _tsamRenderSewTags();
            // Reload mix positions for PHA_PHOI
            _tsamLoadMixPositions({ mix_positions: fv.mix_positions || [] });
        }, 100);
    } else {
        closeModal();
    }
}

function _tsamApplyBgm() {
    _tsamSaveBgmChecked();
    var items = (window._bgmPickerExisting || []).map(function(s) {
        return { id: s.id, name: s.name, qty: 1, fp: Number(s.fp), pp: Number(s.pp) };
    });
    window._tsamSewItems = items;
    // Restore parent modal (Thêm Mẫu Áo Mới)
    _tsamCloseBgmPicker();
}

function _tsamRenderProdList(selectedIds) {
    var container = document.getElementById('_tsamProdList');
    if (!container) return;
    if (!_tsam.products || _tsam.products.length === 0) {
        container.innerHTML = '<span style="color:#94a3b8;font-size:11px">Không có sản phẩm nào</span>';
        return;
    }
    var h = _tsam.products.map(function(p) {
        var isChecked = selectedIds.indexOf(p.id) >= 0;
        var checkedAttr = isChecked ? ' checked' : '';
        var bg = isChecked ? '#ede9fe' : '#fff';
        var border = isChecked ? '#7c3aed' : '#e2e8f0';
        return '<label class="_tsamProdLabel" data-name="' + p.name.toLowerCase() + '" style="display:flex;align-items:center;gap:6px;padding:6px 10px;background:' + bg + ';border:1px solid ' + border + ';border-radius:6px;cursor:pointer;font-size:11px;font-weight:600;margin-bottom:0;transition:all 0.15s;user-select:none">'
            + '<input type="checkbox" class="_tsamProdCb" value="' + p.id + '"' + checkedAttr + ' onchange="_tsamProdCbChanged(this)" style="cursor:pointer;margin:0">'
            + ' <span style="flex-grow:1">' + p.name + '</span>'
            + '<span style="font-size:9px;color:#94a3b8;font-weight:normal">(' + (p.sale_type_name || 'Bán') + ')</span>'
            + '</label>';
    }).join('');
    container.innerHTML = h;
}

function _tsamProdCbChanged(cb) {
    var label = cb.closest('label');
    if (label) {
        if (cb.checked) {
            label.style.background = '#ede9fe';
            label.style.borderColor = '#7c3aed';
        } else {
            label.style.background = '#fff';
            label.style.borderColor = '#e2e8f0';
        }
    }
}

function _tsamFilterProds(val) {
    var q = (val || '').toLowerCase().trim();
    var labels = document.querySelectorAll('#_tsamProdList ._tsamProdCb');
    labels.forEach(function(cb) {
        var l = cb.closest('label');
        if (l) {
            var name = l.getAttribute('data-name') || '';
            if (!q || name.indexOf(q) >= 0) {
                l.style.display = 'flex';
            } else {
                l.style.display = 'none';
            }
        }
    });
}

function _tsamSelectAllProds(select) {
    var cbs = document.querySelectorAll('#_tsamProdList ._tsamProdCb');
    cbs.forEach(function(cb) {
        var label = cb.closest('label');
        if (label && label.style.display !== 'none') {
            cb.checked = select;
            _tsamProdCbChanged(cb);
        }
    });
}
