// ========== ĐƠN LỖI KHÁCH & NỘI BỘ — Bộ Phận Văn Phòng ==========
var _ceo = { items: [], tree: [], total: 0, year: null, month: null, editId: null };

function renderDonloikhachhangPage(content) {
    var now = vnNow();
    _ceo.year = now.getFullYear();
    _ceo.month = now.getMonth() + 1;
    content.innerHTML = '<div id="ceoRoot" style="display:flex;gap:0;min-height:calc(100vh - 80px)">' +
        '<div id="ceoSidebar" style="width:200px;min-width:200px;background:#fff;border-right:1px solid #e5e7eb;padding:0;overflow-y:auto"></div>' +
        '<div id="ceoMain" style="flex:1;padding:0;overflow-x:auto;background:#fafbfc"></div></div>';
    _ceoLoadTree();
    _ceoLoadData();
}

// ===== SIDEBAR TREE =====
async function _ceoLoadTree() {
    try {
        var data = await apiCall('/api/customer-errors/tree');
        _ceo.tree = data.tree || [];
        _ceo.total = data.total || 0;
        _ceoRenderTree();
    } catch(e) { console.error('[CEO] Tree error:', e); }
}

function _ceoRenderTree() {
    var sb = document.getElementById('ceoSidebar');
    if (!sb) return;
    var h = '<div style="padding:12px 14px;font-size:13px;font-weight:800;color:#1e293b;border-bottom:1px solid #e5e7eb;cursor:pointer;display:flex;justify-content:space-between;align-items:center" onclick="_ceoFilterAll()">' +
        '<span>All</span><span style="background:#f59e0b;color:#fff;padding:1px 8px;border-radius:10px;font-size:11px;font-weight:700">' + _ceo.total + '</span></div>';
    // Group by year
    var years = {};
    _ceo.tree.forEach(function(r) {
        if (!years[r.year]) years[r.year] = [];
        years[r.year].push(r);
    });
    var sortedYears = Object.keys(years).sort(function(a,b){return b-a;});
    sortedYears.forEach(function(yr) {
        var months = years[yr].sort(function(a,b){return b.month-a.month;});
        var yrTotal = months.reduce(function(s,m){return s+m.count;},0);
        var isOpen = _ceo.year == yr;
        h += '<div style="border-bottom:1px solid #f1f5f9">';
        h += '<div onclick="_ceoToggleYear(this,' + yr + ')" style="padding:8px 14px;font-size:12px;font-weight:700;color:#374151;cursor:pointer;display:flex;align-items:center;gap:6px;user-select:none">' +
            '<span class="ceo-arrow" style="transition:transform .2s;transform:rotate(' + (isOpen?'90':'0') + 'deg);font-size:10px">▶</span>' +
            '<span>Năm ' + yr + '</span>' +
            '<span style="margin-left:auto;background:#e5e7eb;color:#374151;padding:1px 6px;border-radius:8px;font-size:10px;font-weight:700">' + yrTotal + '</span></div>';
        h += '<div class="ceo-months" style="display:' + (isOpen?'block':'none') + '">';
        months.forEach(function(m) {
            var isActive = _ceo.year == yr && _ceo.month == m.month;
            h += '<div onclick="_ceoFilterMonth(' + yr + ',' + m.month + ')" style="padding:6px 14px 6px 32px;font-size:12px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;' +
                (isActive ? 'background:#fff7ed;color:#ea580c;font-weight:700;border-left:3px solid #f59e0b' : 'color:#6b7280;font-weight:500') + '">' +
                '<span>Tháng ' + String(m.month).padStart(2,'0') + '</span>' +
                '<span style="background:' + (isActive?'#f59e0b':'#e5e7eb') + ';color:' + (isActive?'#fff':'#374151') + ';padding:1px 6px;border-radius:8px;font-size:10px;font-weight:700">' + m.count + '</span></div>';
        });
        h += '</div></div>';
    });
    sb.innerHTML = h;
}

function _ceoToggleYear(el, yr) {
    var months = el.nextElementSibling;
    var arrow = el.querySelector('.ceo-arrow');
    if (months.style.display === 'none') { months.style.display = 'block'; arrow.style.transform = 'rotate(90deg)'; }
    else { months.style.display = 'none'; arrow.style.transform = 'rotate(0deg)'; }
}
function _ceoFilterAll() { _ceo.year = null; _ceo.month = null; _ceoLoadData(); _ceoRenderTree(); }
function _ceoFilterMonth(yr, mo) { _ceo.year = yr; _ceo.month = mo; _ceoLoadData(); _ceoRenderTree(); }

// ===== DATA TABLE =====
async function _ceoLoadData() {
    try {
        var params = [];
        if (_ceo.year) params.push('year=' + _ceo.year);
        if (_ceo.month) params.push('month=' + _ceo.month);
        var qs = params.length ? '?' + params.join('&') : '';
        var data = await apiCall('/api/customer-errors' + qs);
        _ceo.items = data.items || [];
        _ceoRenderTable();
    } catch(e) { console.error('[CEO] Load error:', e); }
}

function _ceoRenderTable() {
    var main = document.getElementById('ceoMain');
    if (!main) return;
    var items = _ceo.items;
    var title = _ceo.year && _ceo.month ? 'Tháng ' + _ceo.month + '/' + _ceo.year : _ceo.year ? 'Năm ' + _ceo.year : 'Tất Cả';

    var h = '<div style="padding:12px 16px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e5e7eb;background:#fff">' +
        '<div style="font-size:14px;font-weight:800;color:#1e293b">⚠️ ĐƠN LỖI KHÁCH & NỘI BỘ — ' + title + ' <span style="color:#9ca3af;font-weight:500;font-size:12px">(' + items.length + ' đơn)</span></div>' +
        '<button onclick="_ceoOpenForm()" style="padding:8px 16px;background:linear-gradient(135deg,#f59e0b,#ea580c);color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer">+ Thêm Đơn Lỗi</button></div>';

    h += '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px;min-width:2000px">';
    h += '<thead><tr style="background:#1e3a4f;border-bottom:2px solid #0f2a3a">';
    var cols = ['Đơn Lỗi','Lỗi Thường Gặp','Ngày','Mã Đơn','SL SX','SL Lỗi','Nội Dung Lỗi','Video','Hình Ảnh','Cách Xử Lý Lỗi',
        'Chi Phí SX (Cắt/In/Ép/May)','Phí Ship (Về/Đi/Lần 3)','Xử Lý Tháng','Đã Phạt Tháng','Người Vi Phạm','Cam Kết Người Vi Phạm','Cách Khắc Phục',''];
    cols.forEach(function(c) {
        h += '<th style="padding:8px 6px;text-align:left;font-size:11px;font-weight:700;color:#ffffff;white-space:nowrap;border-right:1px solid rgba(255,255,255,0.1)">' + c + '</th>';
    });
    h += '</tr></thead><tbody>';

    if (items.length === 0) {
        h += '<tr><td colspan="18" style="padding:40px;text-align:center;color:#9ca3af">Chưa có đơn lỗi nào</td></tr>';
    } else {
        items.forEach(function(item) {
            var imgs = [];
            try { imgs = typeof item.error_images === 'string' ? JSON.parse(item.error_images || '[]') : (item.error_images || []); } catch(e) {}
            var imgHtml = imgs.length ? imgs.slice(0,3).map(function(url) {
                return '<img src="' + url + '" style="width:32px;height:32px;object-fit:cover;border-radius:4px;cursor:pointer;border:1px solid #e5e7eb" onclick="_ceoViewImage(\'' + url + '\')">';
            }).join('') + (imgs.length > 3 ? '<span style="font-size:10px;color:#9ca3af">+' + (imgs.length-3) + '</span>' : '') : '<span style="color:#d1d5db">—</span>';
            var rd = item.report_date ? new Date(item.report_date).toLocaleDateString('vi-VN') : '—';
            var fmtMoney = function(v) { return Number(v||0) > 0 ? Number(v).toLocaleString('vi-VN') : ''; };

            // Đơn Lỗi type badge
            var errorType = item.dht_order_id ? 'Khách Hàng' : 'Nội Bộ';
            var etColor = item.dht_order_id ? '#dc2626' : '#2563eb';
            var etBg = item.dht_order_id ? '#fee2e2' : '#dbeafe';

            // Video column
            var videoHtml = item.error_video ? '<a href="' + item.error_video + '" target="_blank" style="color:#2563eb;font-weight:700;font-size:11px" title="Xem video">🎬 Xem</a>' : '<span style="color:#d1d5db">—</span>';

            h += '<tr style="border-bottom:1px solid #f1f5f9;transition:background .15s" onmouseover="this.style.background=\'#fffbeb\'" onmouseout="this.style.background=\'\'">';
            h += '<td style="padding:6px;white-space:nowrap;border-right:1px solid #f8fafc"><span style="padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;color:' + etColor + ';background:' + etBg + ';border:1px solid ' + etColor + '22">' + errorType + '</span></td>';
            h += '<td style="padding:6px;border-right:1px solid #f8fafc">' + (item.common_error_type || '') + '</td>';
            h += '<td style="padding:6px;white-space:nowrap;border-right:1px solid #f8fafc">' + rd + '</td>';
            h += '<td style="padding:6px;font-weight:700;color:#ea580c;white-space:nowrap;border-right:1px solid #f8fafc">' + (item.order_code || '—') + '</td>';
            h += '<td style="padding:6px;text-align:center;font-weight:700;border-right:1px solid #f8fafc">' + (Number(item.production_quantity)||'') + '</td>';
            h += '<td style="padding:6px;text-align:center;font-weight:700;color:#dc2626;border-right:1px solid #f8fafc">' + (Number(item.error_quantity)||'') + '</td>';
            h += '<td style="padding:6px;max-width:200px;overflow:hidden;text-overflow:ellipsis;border-right:1px solid #f8fafc" title="' + (item.error_content||'').replace(/"/g,'&quot;') + '">' + (item.error_content || '') + '</td>';
            h += '<td style="padding:6px;border-right:1px solid #f8fafc;text-align:center">' + videoHtml + '</td>';
            h += '<td style="padding:6px;border-right:1px solid #f8fafc"><div style="display:flex;gap:2px;align-items:center">' + imgHtml + '</div></td>';
            h += '<td style="padding:6px;border-right:1px solid #f8fafc">' + (item.sale_resolution || '') + '</td>';
            h += '<td style="padding:6px;text-align:right;border-right:1px solid #f8fafc">' + fmtMoney(item.production_cost) + '</td>';
            h += '<td style="padding:6px;text-align:right;border-right:1px solid #f8fafc">' + fmtMoney(item.shipping_cost) + '</td>';
            h += '<td style="padding:6px;border-right:1px solid #f8fafc">' + (item.violation_month || '') + '</td>';
            h += '<td style="padding:6px;border-right:1px solid #f8fafc">' + (item.penalty_month || '') + '</td>';
            h += '<td style="padding:6px;border-right:1px solid #f8fafc">' + (item.violator_name || '') + '</td>';
            h += '<td style="padding:6px;border-right:1px solid #f8fafc">' + (item.violator_commitment || '') + '</td>';
            h += '<td style="padding:6px;border-right:1px solid #f8fafc">' + (item.fix_plan || '') + '</td>';
            h += '<td style="padding:6px;white-space:nowrap"><button onclick="_ceoOpenForm(' + item.id + ')" style="padding:3px 8px;background:#3b82f6;color:#fff;border:none;border-radius:4px;font-size:10px;cursor:pointer;margin-right:2px">✏️</button>';
            if (currentUser && ['giam_doc','quan_ly_cap_cao','quan_ly'].includes(currentUser.role)) {
                h += '<button onclick="_ceoDelete(' + item.id + ')" style="padding:3px 8px;background:#ef4444;color:#fff;border:none;border-radius:4px;font-size:10px;cursor:pointer">🗑</button>';
            }
            h += '</td></tr>';
        });
    }
    h += '</tbody></table></div>';
    main.innerHTML = h;
}

// ===== IMAGE VIEWER =====
function _ceoViewImage(url) {
    var ov = document.createElement('div');
    ov.id = 'ceoImgViewer';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:99999;display:flex;align-items:center;justify-content:center;cursor:pointer';
    ov.onclick = function() { ov.remove(); };
    ov.innerHTML = '<img src="' + url + '" style="max-width:90vw;max-height:90vh;border-radius:8px;box-shadow:0 10px 40px rgba(0,0,0,0.5)">';
    document.body.appendChild(ov);
}

// ===== CREATE/EDIT FORM =====
async function _ceoOpenForm(id) {
    _ceo.editId = id || null;
    var item = {};
    if (id) {
        try {
            var data = await apiCall('/api/customer-errors/' + id);
            item = data.item || {};
        } catch(e) {}
    }
    var imgs = [];
    try { imgs = JSON.parse(item.error_images || '[]'); } catch(e) {}
    var today = vnDateStr();

    var ov = document.createElement('div');
    ov.id = 'ceoFormOverlay';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';

    ov.innerHTML = '<div style="background:#fff;border-radius:16px;width:720px;max-width:95vw;max-height:90vh;overflow-y:auto;box-shadow:0 25px 80px rgba(0,0,0,0.3)">' +
        '<div style="background:linear-gradient(135deg,#f59e0b,#ea580c);padding:16px 20px;border-radius:16px 16px 0 0;display:flex;justify-content:space-between;align-items:center">' +
        '<h3 style="margin:0;color:#fff;font-size:16px;font-weight:800">⚠️ ' + (id ? 'Sửa Đơn Lỗi' : 'Thêm Đơn Lỗi Mới') + '</h3>' +
        '<span onclick="document.getElementById(\'ceoFormOverlay\').remove()" style="cursor:pointer;color:#fff;font-size:22px;font-weight:700;opacity:0.8">✕</span></div>' +
        '<form id="ceoForm" style="padding:20px">' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">' +
        _ceoField('Ngày Báo Cáo Lỗi *', 'ceoF_date', item.report_date ? item.report_date.split('T')[0] : today, 'date', true) +
        _ceoField('Lỗi Thường Gặp', 'ceoF_common', item.common_error_type, 'text', false) +
        '</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">' +
        _ceoField('Mã Đơn', 'ceoF_code', item.order_code, 'text', false) +
        _ceoField('CSKH (Sale/KD)', 'ceoF_cskh', item.cskh_name, 'text', false) +
        '</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">' +
        _ceoField('Số Lượng Lỗi', 'ceoF_qty', item.error_quantity, 'number', false) +
        '<div></div></div>' +
        '<div style="margin-bottom:12px">' + _ceoTextarea('Nội Dung Lỗi', 'ceoF_content', item.error_content) + '</div>' +
        '<div style="margin-bottom:12px">' + _ceoTextarea('Cách Xử Lý Lỗi Sale', 'ceoF_resolution', item.sale_resolution) + '</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">' +
        _ceoField('Người Vi Phạm', 'ceoF_violator', item.violator_name, 'text', false) +
        _ceoField('Chi Phí SX (Cắt/In/Ép/May)', 'ceoF_prodcost', item.production_cost, 'number', false) +
        '</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">' +
        _ceoField('Phí Ship (Về/Đi/Lần 3)', 'ceoF_shipcost', item.shipping_cost, 'number', false) +
        _ceoField('Xử Lý Vi Phạm Tháng Mấy?', 'ceoF_vmonth', item.violation_month, 'text', false) +
        '</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">' +
        _ceoField('Đã Trừ Phạt Tháng Mấy?', 'ceoF_pmonth', item.penalty_month, 'text', false) +
        '<div></div></div>' +
        '<div style="margin-bottom:12px">' + _ceoTextarea('Cam Kết Người Vi Phạm', 'ceoF_commit', item.violator_commitment) + '</div>' +
        '<div style="margin-bottom:12px">' + _ceoTextarea('Cách Khắc Phục Lần Sau', 'ceoF_fix', item.fix_plan) + '</div>' +
        // Image upload section
        '<div style="margin-bottom:16px"><label style="display:block;font-size:12px;font-weight:700;color:#334155;margin-bottom:6px">📷 Hình Ảnh Lỗi</label>' +
        '<div id="ceoImgPreview" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">' +
        imgs.map(function(url) {
            return '<div style="position:relative"><img src="' + url + '" style="width:60px;height:60px;object-fit:cover;border-radius:6px;border:1px solid #e5e7eb">' +
                '<span onclick="_ceoRemoveImg(this,\'' + url + '\')" style="position:absolute;top:-4px;right:-4px;background:#ef4444;color:#fff;width:16px;height:16px;border-radius:50%;font-size:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-weight:700">×</span></div>';
        }).join('') + '</div>' +
        '<input type="file" id="ceoF_images" multiple accept="image/*" style="font-size:12px"></div>' +
        '<div style="display:flex;gap:8px"><button type="submit" style="padding:10px 28px;background:linear-gradient(135deg,#f59e0b,#ea580c);color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer">' + (id ? '💾 Cập Nhật' : '✅ Tạo Mới') + '</button>' +
        '<button type="button" onclick="document.getElementById(\'ceoFormOverlay\').remove()" style="padding:10px 20px;background:#f1f5f9;color:#64748b;border:none;border-radius:10px;font-size:13px;cursor:pointer">Hủy</button></div></form></div>';

    document.body.appendChild(ov);
    document.getElementById('ceoForm').addEventListener('submit', _ceoSubmitForm);
}

function _ceoField(label, id, value, type, required) {
    return '<div><label style="display:block;font-size:12px;font-weight:700;color:#334155;margin-bottom:4px">' + label + '</label>' +
        '<input type="' + type + '" id="' + id + '" value="' + (value||'') + '" ' + (required?'required':'') +
        ' style="width:100%;padding:8px 12px;border:1.5px solid #d1d5db;border-radius:8px;font-size:13px;font-family:Inter,sans-serif" data-num-formatted="skip"></div>';
}
function _ceoTextarea(label, id, value) {
    return '<label style="display:block;font-size:12px;font-weight:700;color:#334155;margin-bottom:4px">' + label + '</label>' +
        '<textarea id="' + id + '" rows="2" style="width:100%;padding:8px 12px;border:1.5px solid #d1d5db;border-radius:8px;font-size:13px;font-family:Inter,sans-serif;resize:vertical">' + (value||'') + '</textarea>';
}

function _ceoRemoveImg(el, url) {
    el.parentElement.remove();
    // Track removed images
    if (!window._ceoRemovedImgs) window._ceoRemovedImgs = [];
    window._ceoRemovedImgs.push(url);
}

async function _ceoSubmitForm(e) {
    e.preventDefault();
    var body = {
        report_date: document.getElementById('ceoF_date').value,
        common_error_type: document.getElementById('ceoF_common').value.trim(),
        order_code: document.getElementById('ceoF_code').value.trim(),
        cskh_name: document.getElementById('ceoF_cskh').value.trim(),
        error_quantity: document.getElementById('ceoF_qty').value,
        error_content: document.getElementById('ceoF_content').value.trim(),
        sale_resolution: document.getElementById('ceoF_resolution').value.trim(),
        violator_name: document.getElementById('ceoF_violator').value.trim(),
        production_cost: document.getElementById('ceoF_prodcost').value,
        shipping_cost: document.getElementById('ceoF_shipcost').value,
        violation_month: document.getElementById('ceoF_vmonth').value.trim(),
        penalty_month: document.getElementById('ceoF_pmonth').value.trim(),
        violator_commitment: document.getElementById('ceoF_commit').value.trim(),
        fix_plan: document.getElementById('ceoF_fix').value.trim(),
        error_images: []
    };
    // Collect remaining images from preview
    var previews = document.querySelectorAll('#ceoImgPreview img');
    previews.forEach(function(img) { body.error_images.push(img.src.replace(location.origin, '')); });

    if (!body.report_date) { showToast('Vui lòng nhập ngày báo cáo lỗi', 'error'); return; }

    try {
        var result;
        if (_ceo.editId) {
            result = await apiCall('/api/customer-errors/' + _ceo.editId, 'PUT', body);
        } else {
            result = await apiCall('/api/customer-errors', 'POST', body);
        }
        if (result.error) { showToast(result.error, 'error'); return; }

        // Upload new images if any
        var fileInput = document.getElementById('ceoF_images');
        var targetId = _ceo.editId || result.id;
        if (fileInput && fileInput.files.length > 0 && targetId) {
            var fd = new FormData();
            for (var i = 0; i < fileInput.files.length; i++) fd.append('file_' + i, fileInput.files[i]);
            await fetch('/api/customer-errors/' + targetId + '/images', { method: 'POST', body: fd });
        }

        // Remove deleted images on server
        if (window._ceoRemovedImgs && window._ceoRemovedImgs.length && _ceo.editId) {
            for (var j = 0; j < window._ceoRemovedImgs.length; j++) {
                await apiCall('/api/customer-errors/' + _ceo.editId + '/images', 'DELETE', { image_url: window._ceoRemovedImgs[j] });
            }
        }
        window._ceoRemovedImgs = [];

        showToast('✅ ' + (_ceo.editId ? 'Đã cập nhật' : 'Đã tạo') + ' đơn lỗi thành công!');
        document.getElementById('ceoFormOverlay').remove();
        _ceoLoadTree();
        _ceoLoadData();
    } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
}

// ===== DELETE =====
async function _ceoDelete(id) {
    if (!confirm('Bạn có chắc muốn xóa đơn lỗi này?')) return;
    try {
        var r = await apiCall('/api/customer-errors/' + id, 'DELETE');
        if (r.error) { showToast(r.error, 'error'); return; }
        showToast('✅ Đã xóa đơn lỗi');
        _ceoLoadTree();
        _ceoLoadData();
    } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
}
