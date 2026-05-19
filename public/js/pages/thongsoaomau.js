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
    var [treeRes, catRes] = await Promise.all([apiCall('/api/tsam/tree'), apiCall('/api/dht/categories')]);
    _tsam.tree = treeRes.categories || [];
    _tsam.categories = catRes.categories || [];
    _tsam.totalInfo = treeRes.total || {};
    content.innerHTML = '<div class="tsam-wrap"><div class="tsam-sb" id="tsamSB"></div><div class="tsam-main"><div style="display:flex;gap:10px;margin-bottom:12px;flex-wrap:wrap;align-items:center"><input type="text" id="tsamSearch" class="form-control" placeholder="🔍 Tìm mã mẫu, BST..." style="width:auto;min-width:220px"><select id="tsamStatusFilter" class="form-control" style="width:auto" onchange="_tsamLoad()"><option value="">Tất cả trạng thái</option><option value="PENDING">🟡 Chờ Duyệt</option><option value="APPROVED">✅ Đã Duyệt</option><option value="REJECTED">❌ Từ Chối</option></select><div style="margin-left:auto"><button class="btn" onclick="_tsamShowCreate()" style="font-size:13px;padding:8px 20px;background:linear-gradient(135deg,#7c3aed,#8b5cf6);color:#fff;border:none;border-radius:8px;font-weight:800;cursor:pointer">➕ Thêm Mẫu</button></div></div><div class="card"><div class="card-body" style="overflow-x:auto;padding:8px"><table class="tsam-tbl"><thead><tr><th>STT</th><th>Lĩnh Vực</th><th>Mã Mẫu</th><th>Loại</th><th>Phối</th><th>SL Màu Phối</th><th>Bộ Sưu Tập</th><th>Market TK</th><th>Tổng Hợp</th><th>Dưỡng</th><th>Đơn SX</th><th>KT May</th><th>Giá Nhà May</th><th>Giá Gia Công</th><th>Duyệt</th><th>Lịch Sử CN</th></tr></thead><tbody id="tsamTbody"><tr><td colspan="16" style="text-align:center;padding:40px">⏳</td></tr></tbody></table></div></div></div></div>';
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
    if (!_tsam.samples.length) { tbody.innerHTML = '<tr><td colspan="16"><div class="empty-state"><div class="icon">📐</div><h3>Chưa có mẫu áo</h3></div></td></tr>'; return; }
    tbody.innerHTML = _tsam.samples.map(function(s, i) {
        var typeColor = _tsamTypeColors[s.sample_type] || '#64748b';
        var stColor = _tsamStatusColors[s.approval_status] || '#94a3b8';
        var stLabel = _tsamStatusLabels[s.approval_status] || s.approval_status;
        var sewing = []; try { sewing = typeof s.sewing_tech === 'string' ? JSON.parse(s.sewing_tech) : (s.sewing_tech || []); } catch(e) {}
        var mix = []; try { mix = typeof s.mix_positions === 'string' ? JSON.parse(s.mix_positions) : (s.mix_positions || []); } catch(e) {}
        var lastUp = s.updated_at ? vnFormat(s.updated_at) : '—';
        var lastUser = s.created_by_name ? '<br><span style="color:#7c3aed;font-size:10px">' + s.created_by_name + '</span>' : '';
        var isGD = typeof currentUser !== 'undefined' && currentUser && currentUser.role === 'giam_doc';
        var approveBtn = '';
        if (isGD && s.approval_status === 'PENDING') {
            approveBtn = '<button onclick="event.stopPropagation();_tsamApprove(' + s.id + ')" style="background:#059669;color:#fff;border:none;padding:2px 6px;border-radius:3px;font-size:9px;cursor:pointer;margin-right:2px" title="Duyệt">✅</button>'
                + '<button onclick="event.stopPropagation();_tsamReject(' + s.id + ')" style="background:#dc2626;color:#fff;border:none;padding:2px 6px;border-radius:3px;font-size:9px;cursor:pointer" title="Từ chối">❌</button>';
        }
        return '<tr style="cursor:pointer" onclick="_tsamDetail(' + s.id + ')">'
            + '<td style="color:var(--gray-400)">' + (i + 1) + '</td>'
            + '<td><span class="tsam-badge" style="background:#7c3aed">' + (s.category_name || '—') + '</span></td>'
            + '<td style="font-weight:800;color:#7c3aed">' + s.sample_code + '</td>'
            + '<td><span class="tsam-badge" style="background:' + typeColor + '">' + (_tsamTypes[s.sample_type] || s.sample_type) + '</span></td>'
            + '<td style="font-size:10px">' + (mix.length ? mix.join(', ') : '—') + '</td>'
            + '<td style="text-align:center;font-weight:700">' + (s.mix_color_count || 0) + '</td>'
            + '<td>' + (s.collection || '—') + '</td>'
            + '<td>' + _tsamLinkCell(s.design_market) + '</td>'
            + '<td>' + _tsamLinkCell(s.total_sample) + '</td>'
            + '<td>' + _tsamLinkCell(s.sample_care) + '</td>'
            + '<td><span onclick="event.stopPropagation();_tsamShowOrders(' + s.id + ')" style="background:#3b82f6;color:#fff;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;cursor:pointer">' + (s.order_count || 0) + ' đơn</span></td>'
            + '<td style="font-size:10px">' + (sewing.length ? sewing.join(', ') : '—') + '</td>'
            + '<td style="text-align:right;font-weight:700">' + (s.factory_price ? _tsamFmt(s.factory_price) + 'đ' : '—') + '</td>'
            + '<td style="text-align:right;font-weight:700">' + (s.processing_price ? _tsamFmt(s.processing_price) + 'đ' : '—') + '</td>'
            + '<td style="white-space:nowrap">' + '<span style="color:' + stColor + ';font-weight:700;font-size:10px">' + stLabel + '</span> ' + approveBtn + '</td>'
            + '<td style="font-size:10px">' + lastUp + lastUser + '</td></tr>';
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
    // Parse existing sewing_tech
    var sewExist = []; try { sewExist = typeof s.sewing_tech === 'string' ? JSON.parse(s.sewing_tech) : (s.sewing_tech || []); } catch(e) {}
    window._tsamImgUrl = s.spec_image || '';
    var body = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
        + '<div class="form-group"><label>Lĩnh Vực ' + rq + '</label><select id="_tsamCat" class="form-control"><option value="">-- Chọn --</option>' + catOpts + '</select></div>'
        + '<div class="form-group"><label>Mã Mẫu ' + rq + '</label><input id="_tsamCode" class="form-control" value="' + (s.sample_code || '') + '"' + (isEdit ? ' disabled' : '') + ' placeholder="VD: DP-001"></div>'
        + '<div class="form-group"><label>Loại ' + rq + '</label><select id="_tsamType" class="form-control" onchange="_tsamTypeChanged()"><option value="DON"' + (curType === 'DON' ? ' selected' : '') + '>Đơn</option><option value="PHA_PHOI"' + (curType === 'PHA_PHOI' ? ' selected' : '') + '>Pha Phối</option><option value="3D"' + (curType === '3D' ? ' selected' : '') + '>3D</option></select></div>'
        + '<div class="form-group"><label>SL Màu Phối ' + rq + ' <span id="_tsamMixHint" style="font-size:10px;color:' + (isLocked ? '#059669' : '#f59e0b') + '">' + (isLocked ? '🔒 Auto = 1' : '✏️ Nhập ≥ 2') + '</span></label><input type="number" id="_tsamMixCount" class="form-control" value="' + mixVal + '" min="' + (isLocked ? '1' : '2') + '"' + (isLocked ? ' disabled style="background:#f1f5f9;cursor:not-allowed"' : '') + '></div>'
        + '</div>'
        // === IMAGE PASTE AREA (full width) ===
        + '<div class="form-group" style="margin-top:8px"><label>📷 Hình Ảnh Thông Số ' + rq + ' <span style="font-size:10px;color:#3b82f6">Ctrl+V để dán ảnh</span></label>'
        + '<div id="_tsamPasteZone" tabindex="0" style="border:2px dashed ' + (s.spec_image ? '#059669' : '#cbd5e1') + ';border-radius:10px;min-height:120px;display:flex;align-items:center;justify-content:center;cursor:pointer;background:' + (s.spec_image ? '#f0fdf4' : '#f8fafc') + ';transition:all .2s;outline:none;position:relative">'
        + (s.spec_image ? '<img src="' + s.spec_image + '" style="max-height:200px;max-width:100%;border-radius:8px">' : '<div style="text-align:center;color:#94a3b8"><div style="font-size:32px;margin-bottom:4px">📋</div><div style="font-size:11px;font-weight:600">Nhấn Ctrl+V để dán ảnh từ clipboard</div></div>')
        + '</div></div>'
        // === REMAINING FIELDS ===
        + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:8px">'
        + '<div class="form-group"><label>Bộ Sưu Tập ' + rq + '</label><input id="_tsamCollection" class="form-control" value="' + (s.collection || '') + '" placeholder="VD: BST Hè 2026"></div>'
        + '<div class="form-group"><label>🔗 Market Thiết Kế ' + rq + '</label><input id="_tsamMarket" class="form-control" value="' + (s.design_market || '') + '" placeholder="https://drive.google.com/..."></div>'
        + '<div class="form-group"><label>🔗 Tổng Hợp Áo Mẫu ' + rq + '</label><input id="_tsamTotal" class="form-control" value="' + (s.total_sample || '') + '" placeholder="https://drive.google.com/..."></div>'
        + '<div class="form-group"><label>🔗 Dưỡng Áo Mẫu ' + rq + '</label><input id="_tsamCare" class="form-control" value="' + (s.sample_care || '') + '" placeholder="https://drive.google.com/..."></div>'
        + '</div>'
        // === SEWING TECH (full width) ===
        + '<div class="form-group" style="margin-top:8px"><label>✂️ Kỹ Thuật May ' + rq + '</label>'
        + '<input id="_tsamSewingTech" class="form-control" value="' + sewExist.join(', ') + '" placeholder="VD: May sọn, May chỉ nổi, Ép nhiệt... (phân cách bằng dấu phẩy)">'
        + '</div>'
        // === PRICES (disabled, auto from Bảng Giá May later) ===
        + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:8px">'
        + '<div class="form-group"><label>Giá Nhà May <span style="font-size:10px;color:#94a3b8">🔒 Tự tính từ KT May</span></label><input type="number" id="_tsamFactoryPrice" class="form-control" value="' + (s.factory_price || 0) + '" disabled style="background:#f1f5f9;cursor:not-allowed"></div>'
        + '<div class="form-group"><label>Giá Gia Công <span style="font-size:10px;color:#94a3b8">🔒 Tự tính từ KT May</span></label><input type="number" id="_tsamProcessPrice" class="form-control" value="' + (s.processing_price || 0) + '" disabled style="background:#f1f5f9;cursor:not-allowed"></div>'
        + '</div>';
    var footer = '<button class="btn btn-secondary" onclick="closeModal()">Hủy</button>'
        + '<button class="btn" onclick="_tsamSubmit(' + (editId || 0) + ')" style="background:linear-gradient(135deg,#7c3aed,#8b5cf6);color:#fff;border:none;padding:8px 24px;border-radius:8px;font-weight:800">💾 ' + (isEdit ? 'Cập Nhật' : 'Tạo Mẫu') + '</button>';
    openModal((isEdit ? '✏️ Sửa Mẫu ' + s.sample_code : '➕ Thêm Mẫu Áo Mới'), body, footer);
    // Attach paste handler
    setTimeout(function() {
        var zone = document.getElementById('_tsamPasteZone');
        if (zone) {
            zone.addEventListener('paste', _tsamHandlePaste);
            zone.addEventListener('click', function() { this.focus(); });
        }
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
    var urlRe = /^https?:\/\/.+/i;
    // Parse sewing tech from comma-separated input
    var sewRaw = document.getElementById('_tsamSewingTech')?.value?.trim() || '';
    var sewArr = sewRaw ? sewRaw.split(',').map(function(s){return s.trim();}).filter(function(s){return s;}) : [];
    var data = {
        category_id: document.getElementById('_tsamCat')?.value || null,
        sample_code: document.getElementById('_tsamCode')?.value?.trim(),
        sample_type: document.getElementById('_tsamType')?.value || 'DON',
        mix_color_count: document.getElementById('_tsamMixCount')?.value || 0,
        collection: document.getElementById('_tsamCollection')?.value?.trim() || '',
        design_market: document.getElementById('_tsamMarket')?.value?.trim() || '',
        total_sample: document.getElementById('_tsamTotal')?.value?.trim() || '',
        sample_care: document.getElementById('_tsamCare')?.value?.trim() || '',
        sewing_tech: sewArr,
        spec_image: window._tsamImgUrl || '',
        factory_price: 0,
        processing_price: 0
    };
    // === Client-side validation ===
    if (!data.category_id) { showToast('Chọn Lĩnh Vực', 'error'); return; }
    if (!data.sample_code) { showToast('Nhập Mã Mẫu', 'error'); return; }
    if (!data.spec_image) { showToast('Chưa dán Hình Ảnh Thông Số (Ctrl+V)', 'error'); return; }
    if (!data.collection) { showToast('Nhập Bộ Sưu Tập', 'error'); return; }
    if (!data.design_market) { showToast('Nhập Market Thiết Kế', 'error'); return; }
    if (!urlRe.test(data.design_market)) { showToast('Market Thiết Kế phải là link (https://...)', 'error'); return; }
    if (!data.total_sample) { showToast('Nhập Tổng Hợp Áo Mẫu', 'error'); return; }
    if (!urlRe.test(data.total_sample)) { showToast('Tổng Hợp Áo Mẫu phải là link (https://...)', 'error'); return; }
    if (!data.sample_care) { showToast('Nhập Dưỡng Áo Mẫu', 'error'); return; }
    if (!urlRe.test(data.sample_care)) { showToast('Dưỡng Áo Mẫu phải là link (https://...)', 'error'); return; }
    if (sewArr.length === 0) { showToast('Nhập Kỹ Thuật May', 'error'); return; }
    if (data.sample_type === 'PHA_PHOI' && Number(data.mix_color_count) < 2) { showToast('Pha Phối phải có ≥ 2 màu', 'error'); return; }
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
    var body = '<div style="background:#f8fafc;border:1px solid var(--gray-200);border-radius:10px;padding:16px;margin-bottom:12px">'
        + '<table style="width:100%;font-size:13px;border-collapse:collapse">';
    var rows = [
        ['MÃ MẪU', '<b style="color:#7c3aed;font-size:15px">' + s.sample_code + '</b>'],
        ['LĨNH VỰC', s.category_name || '—'],
        ['LOẠI', '<span class="tsam-badge" style="background:' + (_tsamTypeColors[s.sample_type]||'#64748b') + '">' + (_tsamTypes[s.sample_type]||s.sample_type) + '</span>'],
        ['VỊ TRÍ PHỐI', mix.length ? mix.join(', ') : '—'],
        ['SL MÀU PHỐI', s.mix_color_count || 0],
        ['BỘ SƯU TẬP', s.collection || '—'],
        ['MARKET TK', _tsamIsUrl(s.design_market) ? '<a href="'+s.design_market+'" target="_blank" style="color:#3b82f6;font-weight:700">🔗 '+s.design_market.substring(0,50)+'...</a>' : (s.design_market||'—')],
        ['TỔNG HỢP ÁO MẪU', _tsamIsUrl(s.total_sample) ? '<a href="'+s.total_sample+'" target="_blank" style="color:#3b82f6;font-weight:700">🔗 '+s.total_sample.substring(0,50)+'...</a>' : (s.total_sample||'—')],
        ['DƯỠNG ÁO MẪU', _tsamIsUrl(s.sample_care) ? '<a href="'+s.sample_care+'" target="_blank" style="color:#3b82f6;font-weight:700">🔗 '+s.sample_care.substring(0,50)+'...</a>' : (s.sample_care||'—')],
        ['KỸ THUẬT MAY', sewing.length ? sewing.map(function(t){return '<span style="background:#6366f1;color:#fff;padding:1px 6px;border-radius:4px;font-size:10px;font-weight:700;margin-right:3px">'+t+'</span>';}).join('') : '—'],
        ['GIÁ NHÀ MAY', (s.factory_price ? _tsamFmt(s.factory_price) + 'đ' : '0đ') + ' <span style="font-size:10px;color:#94a3b8">🔒 từ Bảng Giá May</span>'],
        ['GIÁ GIA CÔNG', (s.processing_price ? _tsamFmt(s.processing_price) + 'đ' : '0đ') + ' <span style="font-size:10px;color:#94a3b8">🔒 từ Bảng Giá May</span>'],
        ['TRẠNG THÁI', '<span style="color:' + stColor + ';font-weight:800">' + (_tsamStatusLabels[s.approval_status]||'—') + '</span>' + (s.approved_by_name ? ' — ' + s.approved_by_name : '')],
        ['NGƯỜI TẠO', s.created_by_name || '—'],
        ['CẬP NHẬT', s.updated_at ? vnFormat(s.updated_at) : '—']
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
    var isGD = typeof currentUser !== 'undefined' && currentUser && currentUser.role === 'giam_doc';
    var footer = '<button class="btn btn-secondary" onclick="closeModal()">Đóng</button>'
        + '<button class="btn" onclick="_tsamShowCreate(' + s.id + ')" style="background:#f59e0b;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-weight:700">✏️ Sửa</button>';
    if (isGD) footer += '<button class="btn" onclick="_tsamDelete(' + s.id + ')" style="background:#dc2626;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-weight:700">🗑️ Xóa</button>';
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
        hh += '<tr><td style="padding:5px 6px">' + (h.changed_at ? vnFormat(h.changed_at) : '—') + '</td>'
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
