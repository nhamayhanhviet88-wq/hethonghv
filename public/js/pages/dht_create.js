// ========== DHT CREATE ORDER — 2-STEP FLOW ==========
var _dhtCreate = { step: 1, depositId: null, depositAmount: 0, depositCode: '', myInfo: null };

var _dhtProvinces = ['An Giang','Bà Rịa - Vũng Tàu','Bắc Giang','Bắc Kạn','Bạc Liêu','Bắc Ninh','Bến Tre','Bình Định','Bình Dương','Bình Phước','Bình Thuận','Cà Mau','Cần Thơ','Cao Bằng','Đà Nẵng','Đắk Lắk','Đắk Nông','Điện Biên','Đồng Nai','Đồng Tháp','Gia Lai','Hà Giang','Hà Nam','Hà Nội','Hà Tĩnh','Hải Dương','Hải Phòng','Hậu Giang','Hòa Bình','Hồ Chí Minh','Hưng Yên','Khánh Hòa','Kiên Giang','Kon Tum','Lai Châu','Lâm Đồng','Lạng Sơn','Lào Cai','Long An','Nam Định','Nghệ An','Ninh Bình','Ninh Thuận','Phú Thọ','Phú Yên','Quảng Bình','Quảng Nam','Quảng Ngãi','Quảng Ninh','Quảng Trị','Sóc Trăng','Sơn La','Tây Ninh','Thái Bình','Thái Nguyên','Thanh Hóa','Thừa Thiên Huế','Tiền Giang','TP. Hồ Chí Minh','Trà Vinh','Tuyên Quang','Vĩnh Long','Vĩnh Phúc','Yên Bái'];

// === STEP 1: Select Deposit ===
async function _dhtShowCreate() {
    // Check if user has Mã Đơn KD before allowing creation
    var prefixCheck = await apiCall('/api/dht/next-order-code');
    if (prefixCheck.hasPrefix === false) {
        showToast('⚠️ Tài khoản chưa được cấp Mã Đơn KD. Không thể tạo đơn hàng. Liên hệ quản lý.', 'error');
        return;
    }
    _dhtCreate = { step: 1, depositId: null, depositAmount: 0, depositCode: '', myInfo: null };
    var data = await apiCall('/api/dht/unclaimed-deposits');
    var deps = data.deposits || [];
    var rows = '';
    if (deps.length === 0) {
        rows = '<tr><td colspan="6" style="text-align:center;padding:30px;color:#94a3b8">Không có mã tiền nào chưa nhận</td></tr>';
    }
    for (var i = 0; i < deps.length; i++) {
        var d = deps[i];
        var amt = Number(d.amount || 0).toLocaleString('vi-VN');
        rows += '<tr class="_dht-dep-row" data-id="'+d.id+'" data-amt="'+d.amount+'" data-code="'+d.payment_code+'" onclick="_dhtSelectDeposit(this)" style="cursor:pointer">'
            +'<td style="font-weight:700;color:#b8860b">'+d.payment_code+'</td>'
            +'<td style="font-weight:700;color:#059669">'+amt+'đ</td>'
            +'<td>'+d.payment_method+'</td>'
            +'<td>'+(d.payment_date||'')+'</td>'
            +'<td style="max-width:200px;overflow:hidden;text-overflow:ellipsis">'+(d.transfer_note||'—')+'</td>'
            +'<td>'+(d.customer_name||'')+'</td></tr>';
    }
    var body = '<div style="background:#f8fafc;border-radius:10px;padding:14px;border:1px solid #e2e8f0;margin-bottom:12px">'
        +'<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">'
        +'<div style="width:32px;height:32px;border-radius:8px;background:linear-gradient(135deg,#059669,#10b981);display:flex;align-items:center;justify-content:center;font-size:16px;color:#fff">💰</div>'
        +'<div><div style="font-weight:800;font-size:14px;color:var(--navy)">Bước 1: Chọn Mã Nhận Cọc</div>'
        +'<div style="font-size:11px;color:#64748b">Chọn mã tiền chưa ai nhận từ Sổ Ghi Nhận Tiền</div></div>'
        +'<div style="margin-left:auto;font-size:11px;font-weight:700;color:#059669" id="_dhtDepCount">'+deps.length+' mã</div></div>'
        +'<div style="margin-bottom:8px"><input id="_dhtDepSearch" class="form-control" placeholder="🔍 Tìm mã tiền, số tiền, nội dung CK..." oninput="_dhtFilterDeposits()" style="font-size:12px;border:1px solid #e2e8f0;border-radius:8px;padding:8px 12px"></div>'
        +'<div style="max-height:350px;overflow-y:auto"><table class="table" style="font-size:12px"><thead><tr style="background:#f1f5f9">'
        +'<th>Mã Tiền</th><th>Số Tiền</th><th>PT</th><th>Ngày</th><th>Nội Dung CK</th><th>Khách</th></tr></thead>'
        +'<tbody id="_dhtDepTbody">'+rows+'</tbody></table></div></div>'
        +'<div id="_dhtDepSelected" style="display:none;background:#fffbeb;border:1px solid #d4a017;border-radius:8px;padding:10px 14px;margin-bottom:8px">'
        +'<span style="font-weight:800;color:#b8860b">✅ Đã chọn: </span><span id="_dhtDepLabel"></span></div>'
        +'<div style="text-align:center;padding:8px;color:#94a3b8;font-size:11px">Hoặc bỏ qua nếu đơn chưa có cọc</div>';

    var footer = '<button class="btn btn-secondary" onclick="_dhtCancelCreate()">Hủy</button>'
        +'<button class="btn" onclick="_dhtGoStep2()" style="background:linear-gradient(135deg,#b8860b,#daa520);color:#fff;border:none;padding:8px 24px;border-radius:8px;font-weight:800">Tiếp Theo →</button>';

    openModal('➕ Tạo Đơn Hàng — Bước 1/2', body, footer);
}

function _dhtSelectDeposit(el) {
    document.querySelectorAll('._dht-dep-row').forEach(function(r){ r.style.background=''; });
    el.style.background = '#fef3c7';
    _dhtCreate.depositId = Number(el.dataset.id);
    _dhtCreate.depositAmount = Number(el.dataset.amt);
    _dhtCreate.depositCode = el.dataset.code;
    var sel = document.getElementById('_dhtDepSelected');
    var lbl = document.getElementById('_dhtDepLabel');
    if (sel) sel.style.display = 'block';
    if (lbl) lbl.textContent = _dhtCreate.depositCode + ' — ' + Number(_dhtCreate.depositAmount).toLocaleString('vi-VN') + 'đ';
}

function _dhtFilterDeposits() {
    var q = (document.getElementById('_dhtDepSearch')?.value || '').toLowerCase().trim();
    var rows = document.querySelectorAll('._dht-dep-row');
    var shown = 0;
    rows.forEach(function(row) {
        var text = row.textContent.toLowerCase();
        var match = !q || text.indexOf(q) >= 0;
        row.style.display = match ? '' : 'none';
        if (match) shown++;
    });
    var countEl = document.getElementById('_dhtDepCount');
    if (countEl) countEl.textContent = shown + ' mã';
}

async function _dhtCancelCreate() {
    if (_dhtCreate.depositId) {
        await apiCall('/api/dht/unlock-deposit/' + _dhtCreate.depositId, 'PUT');
    }
    _dhtCreate = { step: 1, depositId: null, depositAmount: 0, depositCode: '', myInfo: null };
    closeModal();
}

// === STEP 2: Fill Order Info ===
async function _dhtGoStep2() {
    // Lock deposit if selected
    if (_dhtCreate.depositId) {
        var lockRes = await apiCall('/api/dht/lock-deposit/' + _dhtCreate.depositId, 'PUT');
        if (!lockRes.success) { showToast(lockRes.error || 'Không thể giữ mã cọc', 'error'); return; }
    }
    // Fetch data
    var [infoRes, codeRes, designRes, carrierRes, holidayRes, phieuRes] = await Promise.all([
        apiCall('/api/dht/my-info'),
        apiCall('/api/dht/next-order-code'),
        apiCall('/api/dht/designers'),
        apiCall('/api/dht/carriers'),
        apiCall('/api/holidays'),
        apiCall('/api/dht/phieu-options')
    ]);
    _dhtCreate.phieuOpts = phieuRes || {};
    // Build holidays map: { 'YYYY-MM-DD': 'Tên lễ' }
    _dhtCreate.holidays = {};
    (holidayRes.holidays || []).forEach(function(h) {
        var d = h.holiday_date;
        if (typeof d === 'string') d = d.split('T')[0];
        _dhtCreate.holidays[d] = h.holiday_name;
    });
    _dhtCreate.myInfo = infoRes.user || {};
    var mi = _dhtCreate.myInfo;
    var catOpts = _dht.categories.map(function(c){ return '<option value="'+c.id+'">'+c.name+'</option>'; }).join('');
    var designers = designRes.designers || [];
    var desOpts = '<option value="">-- Chọn --</option><option value="old_design">🎨 Thiết Kế Cũ</option>'
        + designers.map(function(d){ return '<option value="'+d.id+'">'+d.full_name+'</option>'; }).join('');
    var carriers = carrierRes.carriers || [];
    var carOpts = carriers.map(function(c){ return '<option value="'+c.id+'">'+c.name+'</option>'; }).join('');
    var depositDisplay = _dhtCreate.depositId
        ? _dhtCreate.depositCode + ' — ' + Number(_dhtCreate.depositAmount).toLocaleString('vi-VN') + 'đ'
        : 'Không có cọc';

    var _dis = 'background:#f1f5f9;color:#64748b;cursor:not-allowed';
    var body = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
        // Row 1: NV + Phòng Ban
        +'<div class="form-group"><label>Tên Nhân Viên</label><input class="form-control" value="'+(mi.full_name||'')+'" disabled style="'+_dis+'"></div>'
        +'<div class="form-group"><label>Phòng Ban</label><input class="form-control" value="'+(mi.department_name||'')+'" disabled style="'+_dis+'"></div>'
        // Row 2: Ngày + Lĩnh vực
        +'<div class="form-group"><label>Ngày Lên Đơn</label><input class="form-control" value="'+vnDateStr()+'" disabled style="'+_dis+'"></div>'
        +'<div class="form-group"><label>Lĩnh Vực <span style="color:red">*</span></label><select id="_co_cat" class="form-control"><option value="">-- Chọn --</option>'+catOpts+'</select></div>'
        // Row 3: Mã đơn + SĐT (autocomplete)
        +'<div class="form-group"><label>Mã Đơn</label><input class="form-control" value="'+(codeRes.code||'')+'" disabled id="_co_code" style="'+_dis+'"></div>'
        +'<div class="form-group" style="position:relative"><label>Số Điện Thoại <span style="color:red">*</span></label>'
        +'<input id="_co_phone" class="form-control" placeholder="Gõ SĐT để tìm khách hàng..." autocomplete="off" oninput="_dhtSearchPhone()">'
        +'<input type="hidden" id="_co_custId">'
        +'<div id="_co_phoneList" style="display:none;position:absolute;z-index:100;background:#fff;border:1px solid #e2e8f0;border-radius:8px;max-height:200px;overflow-y:auto;width:calc(100% - 24px);box-shadow:0 6px 20px rgba(0,0,0,0.12);margin-top:2px"></div></div>'
        // Row 4: Tên KH (read-only) + Địa chỉ (editable)
        +'<div class="form-group"><label>Tên Khách Hàng <span style="color:red">*</span> <span id="_co_nameLock" style="font-size:10px;color:#9ca3af"></span></label><input id="_co_name" class="form-control" disabled placeholder="← Chọn SĐT để tự điền"></div>'
        +'<div class="form-group"><label>Địa Chỉ <span style="color:red">*</span></label><input id="_co_addr" class="form-control" placeholder="Địa chỉ giao hàng"></div>'
        // Row 5: Tỉnh (autocomplete) + Nguồn (read-only from customer)
        +'<div class="form-group" style="position:relative"><label>Tỉnh, Thành Phố <span style="color:red">*</span></label>'
        +'<input id="_co_prov" class="form-control" placeholder="Gõ để tìm tỉnh/TP..." autocomplete="off" oninput="_dhtFilterProvince()" onfocus="_dhtFilterProvince()">'
        +'<div id="_co_provList" style="display:none;position:absolute;z-index:100;background:#fff;border:1px solid #e2e8f0;border-radius:6px;max-height:180px;overflow-y:auto;width:calc(100% - 24px);box-shadow:0 4px 12px rgba(0,0,0,0.1);margin-top:2px"></div></div>'
        +'<div class="form-group"><label>Nguồn <span style="color:red">*</span> <span id="_co_srcLock" style="font-size:10px;color:#9ca3af"></span></label><input id="_co_src" class="form-control" disabled placeholder="← Tự điền từ khách hàng"></div>'
        // Row 6: Thiết kế + VAT
        +'<div class="form-group"><label>Thiết Kế</label><select id="_co_designer" class="form-control">'+desOpts+'</select></div>'
        +'<div class="form-group"><label>VAT 8%</label><select id="_co_vat" class="form-control" onchange="_dhtCalcTotal()"><option value="0">Không</option><option value="1">Có VAT 8%</option></select></div>'
        +'</div>'
        // Phiếu đơn hàng
        +'<div style="margin:12px 0;border-top:1px solid #e2e8f0;padding-top:12px">'
        +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">'
        +'<span style="font-weight:800;font-size:13px;color:var(--navy)">📋 Phiếu Đơn Hàng</span>'
        +'<button onclick="_dhtAddItem()" style="background:#059669;color:#fff;border:none;padding:4px 14px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer">➕ Thêm Phiếu</button></div>'
        +'<div id="_co_items"></div></div>'
        // === Tổng kết: 2 hàng x 2 cột ===
        +'<div style="background:#f8fafc;border-radius:8px;padding:12px;border:1px solid #e2e8f0">'
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:8px">'
        +'<div class="form-group"><label>Tổng Tiền Hàng</label><input id="_co_total" class="form-control" value="0" disabled style="'+_dis+';font-weight:700"></div>'
        +'<div class="form-group"><label>Tổng sau VAT</label><input id="_co_totalVat" class="form-control" value="0" disabled style="'+_dis+';font-weight:700"></div>'
        +'</div>'
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
        +'<div class="form-group"><label>Đã Cọc</label><input class="form-control" value="'+Number(_dhtCreate.depositAmount).toLocaleString('vi-VN')+'đ" disabled style="'+_dis+';font-weight:700;color:#059669"></div>'
        +'<div class="form-group"><label>Còn Lại</label><input id="_co_remain" class="form-control" value="0" disabled style="'+_dis+';font-weight:800;color:#dc2626"></div>'
        +'</div></div>'
        // === Vận chuyển: 2 hàng x 2 cột ===
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px">'
        +'<div class="form-group"><label>Ngày Gửi Hàng <span style="color:red">*</span></label><input type="date" id="_co_shipDate" class="form-control" min="'+vnDateStr()+'" onchange="_dhtValidateShipDate()"></div>'
        +'<div class="form-group"><label>Tiêu Chuẩn Gửi <span style="color:red">*</span></label><select id="_co_pri" class="form-control" onchange="_dhtOnPriorityChange()"><option>CHUẨN</option><option>GỬI</option><option>GẤP</option></select></div>'
        +'</div>'
        // === Paste zone for CHUẨN proof (shown by default since CHUẨN is first option) ===
        +'<div id="_co_proofWrap" style="margin-top:8px">'
        +'<label style="font-weight:700;font-size:12px;color:#1e293b">📸 Ảnh chứng minh Tiêu Chuẩn CHUẨN <span style="color:red">*</span></label>'
        +'<div id="_co_proofZone" tabindex="0" style="border:2px dashed #cbd5e1;border-radius:10px;padding:20px;text-align:center;cursor:pointer;margin-top:4px;background:#f8fafc;transition:all .2s;min-height:80px;display:flex;align-items:center;justify-content:center;flex-direction:column" onpaste="_dhtPasteProof(event)" onclick="this.focus()" onfocus="this.style.borderColor=\'#b8860b\';this.style.background=\'#fffbeb\'" onblur="this.style.borderColor=\'#cbd5e1\';this.style.background=\'#f8fafc\'">'
        +'<div id="_co_proofPlaceholder" style="color:#94a3b8;font-size:12px"><span style="font-size:24px">📋</span><br>Click vào đây rồi <b>Ctrl+V</b> dán hình ảnh</div>'
        +'<img id="_co_proofImg" style="display:none;max-width:100%;max-height:200px;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.1)">'
        +'</div></div>'
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:6px">'
        +'<div class="form-group"><label>Nhà Vận Chuyển <span style="color:red">*</span></label><select id="_co_carrier" class="form-control"><option value="">-- Chọn --</option>'+carOpts+'</select></div>'
        +'<div class="form-group"><label>Gửi Zalo OA</label><select id="_co_zalo" class="form-control"><option value="1">✅ Gửi Zalo OA</option><option value="0">Không gửi</option></select></div>'
        +'</div>'
        // Deposit info
        +'<div style="background:#fffbeb;border-radius:6px;padding:8px 12px;margin-top:8px;font-size:12px;color:#b8860b;font-weight:600">💰 Mã Cọc: '+depositDisplay+'</div>';

    var footer = '<button class="btn btn-secondary" onclick="_dhtCancelCreate()">← Hủy</button>'
        +'<button class="btn" onclick="_dhtSubmitCreateV2()" style="background:linear-gradient(135deg,#b8860b,#daa520);color:#fff;border:none;padding:8px 24px;border-radius:8px;font-weight:800">💾 Lưu Đơn Hàng</button>';

    openModal('➕ Tạo Đơn Hàng — Bước 2/2', body, footer);
    _dhtAddItem(); // Add first item row
}

// === Phone Search (autocomplete from CRM customers) ===
var _dhtPhoneTimer;
function _dhtSearchPhone() {
    clearTimeout(_dhtPhoneTimer);
    var q = document.getElementById('_co_phone')?.value;
    if (!q || q.length < 2) { document.getElementById('_co_phoneList').style.display = 'none'; return; }
    _dhtPhoneTimer = setTimeout(async function() {
        var res = await apiCall('/api/dht/customer-search?q=' + encodeURIComponent(q));
        var list = document.getElementById('_co_phoneList');
        if (!list) return;
        var custs = res.customers || [];
        if (custs.length === 0) {
            list.innerHTML = '<div style="padding:12px;text-align:center;font-size:11px;color:#9ca3af">Không tìm thấy khách hàng nào.<br><span style="color:#dc2626;font-weight:600">Vui lòng nhập khách vào CRM Chăm Sóc trước.</span></div>';
            list.style.display = 'block';
            return;
        }
        list.innerHTML = custs.map(function(c) {
            return '<div style="padding:8px 12px;cursor:pointer;border-bottom:1px solid #f1f5f9;font-size:12px;display:flex;justify-content:space-between;align-items:center"'
                +' onmouseover="this.style.background=\'#fef3c7\'" onmouseout="this.style.background=\'\'"'
                +' onclick="_dhtPickCustomer('+c.id+',this)"'
                +' data-id="'+c.id+'" data-phone="'+c.phone+'" data-name="'+(c.customer_name||'').replace(/"/g,'&quot;')+'"'
                +' data-addr="'+(c.address||'').replace(/"/g,'&quot;')+'" data-prov="'+(c.province||'')+'"'
                +' data-src="'+(c.source_name||'').replace(/"/g,'&quot;')+'">'
                +'<div><b>'+c.phone+'</b> — '+(c.customer_name||'N/A')+'</div>'
                +'<span style="font-size:10px;color:#6b7280;white-space:nowrap">'+(c.source_name||'')+'</span></div>';
        }).join('');
        list.style.display = 'block';
    }, 300);
}

function _dhtPickCustomer(custId, el) {
    // Set customer ID (hidden)
    document.getElementById('_co_custId').value = custId;
    // Phone (locked after selection)
    var phoneInput = document.getElementById('_co_phone');
    phoneInput.value = el.dataset.phone;
    phoneInput.style.background = '#f0fdf4';
    phoneInput.style.fontWeight = '700';
    // Customer name (read-only)
    var nameInput = document.getElementById('_co_name');
    nameInput.value = el.dataset.name;
    nameInput.disabled = true;
    nameInput.style.background = '#f1f5f9';
    nameInput.style.fontWeight = '700';
    document.getElementById('_co_nameLock').textContent = '🔒 Từ CRM';
    // Source (read-only)
    var srcInput = document.getElementById('_co_src');
    srcInput.value = el.dataset.src;
    srcInput.style.background = '#f1f5f9';
    srcInput.style.fontWeight = '700';
    document.getElementById('_co_srcLock').textContent = '🔒 Từ CRM';
    // Address (editable, pre-fill)
    document.getElementById('_co_addr').value = el.dataset.addr;
    // Province (editable, pre-fill)
    if (el.dataset.prov) {
        document.getElementById('_co_prov').value = el.dataset.prov;
    }
    // Close dropdown
    document.getElementById('_co_phoneList').style.display = 'none';
}

// Close phone dropdown when clicking outside
document.addEventListener('click', function(e) {
    var list = document.getElementById('_co_phoneList');
    var input = document.getElementById('_co_phone');
    if (list && input && !input.contains(e.target) && !list.contains(e.target)) {
        list.style.display = 'none';
    }
});

// === Ship Date Validation (no past + no holidays) ===
function _dhtValidateShipDate() {
    var input = document.getElementById('_co_shipDate');
    if (!input || !input.value) return;
    var val = input.value; // YYYY-MM-DD
    // Check holidays
    var holidayName = _dhtCreate.holidays && _dhtCreate.holidays[val];
    if (holidayName) {
        var parts = val.split('-');
        var display = parts[2] + '/' + parts[1] + '/' + parts[0];
        showToast('⛔ Ngày ' + display + ' là ngày lễ: ' + holidayName + ' — vui lòng chọn ngày khác', 'error');
        input.value = '';
        return;
    }
    // Double-check past date (fallback for browsers ignoring min)
    var today = vnDateStr();
    if (val < today) {
        showToast('⛔ Không thể chọn ngày trong quá khứ', 'error');
        input.value = '';
    }
}

// === Priority Change: show/hide proof image ===
var _dhtProofBase64 = null;
function _dhtOnPriorityChange() {
    var val = document.getElementById('_co_pri')?.value;
    var wrap = document.getElementById('_co_proofWrap');
    if (!wrap) return;
    if (val === 'CHUẨN') {
        wrap.style.display = 'block';
    } else {
        wrap.style.display = 'none';
        _dhtProofBase64 = null; // clear proof if switching away
    }
}

// === Paste image proof ===
function _dhtPasteProof(e) {
    var items = (e.clipboardData || e.originalEvent?.clipboardData)?.items;
    if (!items) return;
    for (var i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
            var blob = items[i].getAsFile();
            var reader = new FileReader();
            reader.onload = function(ev) {
                _dhtProofBase64 = ev.target.result;
                var img = document.getElementById('_co_proofImg');
                var ph = document.getElementById('_co_proofPlaceholder');
                if (img) { img.src = _dhtProofBase64; img.style.display = 'block'; }
                if (ph) ph.style.display = 'none';
                var zone = document.getElementById('_co_proofZone');
                if (zone) { zone.style.borderColor = '#059669'; zone.style.background = '#f0fdf4'; }
                showToast('✅ Đã dán ảnh chứng minh!');
            };
            reader.readAsDataURL(blob);
            e.preventDefault();
            return;
        }
    }
    showToast('Không tìm thấy hình ảnh trong clipboard', 'error');
}

// === Order Items (Rich Phiếu) ===
var _dhtItemCount = 0;
function _dhtAddItem() {
    _dhtItemCount++;
    var idx = _dhtItemCount;
    var po = _dhtCreate.phieuOpts || {};
    // Build dropdown options
    var saleOpts = '<option value="">-- Chọn --</option>' + (po.sale_types||[]).map(function(o){return '<option value="'+o.name+'">'+o.name+'</option>';}).join('');
    var prodOpts = '<option value="">-- Chọn --</option>' + (po.products||[]).map(function(o){return '<option value="'+o.name+'">'+o.name+'</option>';}).join('');
    var matOpts = '<option value="">-- Chọn --</option>' + (po.materials||[]).map(function(o){return '<option value="'+o.id+'">'+o.name+'</option>';}).join('');
    var patOpts = '<option value="">-- Chọn --</option>' + (po.patterns||[]).map(function(o){return '<option value="'+o.name+'">'+o.name+'</option>';}).join('');
    var sewOpts = (po.sewing_techniques||[]).map(function(o){return '<option value="'+o.name+'">'+o.name+'</option>';}).join('');
    var accOpts = '<option value="">-- Chọn --</option>' + (po.accounting_notes||[]).map(function(o){return '<option value="'+o.name+'">'+o.name+'</option>';}).join('');
    var extOpts = (po.extra_materials||[]).map(function(o){return '<option value="'+o.name+'">'+o.name+'</option>';}).join('');

    var noOpt = '<option value="" disabled selected>-- Chờ setup --</option>';
    var div = document.createElement('div');
    div.id = '_co_item_' + idx;
    div.className = '_co_phieu_card';
    div.style.cssText = 'border:1px solid #e2e8f0;border-radius:10px;padding:14px;margin-bottom:10px;background:#fff;position:relative';
    div.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">'
        +'<span style="font-weight:800;font-size:12px;color:var(--navy)">📋 Phiếu #'+idx+'</span>'
        +'<button onclick="this.closest(\'._co_phieu_card\').remove();_dhtCalcTotal()" style="background:#fee2e2;color:#dc2626;border:none;border-radius:4px;cursor:pointer;font-size:11px;padding:3px 10px">✕ Xóa</button></div>'
        // Row 1: Bán/Quà + Sản Phẩm
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">'
        +'<div class="form-group" style="margin:0"><label style="font-size:11px;font-weight:700">Bán/Quà <span style="color:red">*</span></label><select class="form-control _pi_sale" style="font-size:12px">'+saleOpts+'</select></div>'
        +'<div class="form-group" style="margin:0"><label style="font-size:11px;font-weight:700">Sản Phẩm <span style="color:red">*</span></label><select class="form-control _pi_product" style="font-size:12px">'+(prodOpts||noOpt)+'</select></div>'
        +'</div>'
        // Row 2: Chất Liệu + Màu
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">'
        +'<div class="form-group" style="margin:0"><label style="font-size:11px;font-weight:700">Chất Liệu <span style="color:red">*</span></label><select class="form-control _pi_material" style="font-size:12px" onchange="_dhtLoadColors(this,'+idx+')">'+matOpts+'</select></div>'
        +'<div class="form-group" style="margin:0"><label style="font-size:11px;font-weight:700">Màu <span style="color:red">*</span></label><select id="_pi_color_'+idx+'" class="form-control _pi_color" style="font-size:12px"><option value="">← Chọn Chất Liệu trước</option></select></div>'
        +'</div>'
        // Row 3: Mẫu Áo + Kỹ Thuật May
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">'
        +'<div class="form-group" style="margin:0"><label style="font-size:11px;font-weight:700">Mẫu Áo <span style="color:red">*</span></label><select class="form-control _pi_pattern" style="font-size:12px">'+(patOpts||noOpt)+'</select></div>'
        +'<div class="form-group" style="margin:0"><label style="font-size:11px;font-weight:700">Kỹ Thuật May</label><select class="form-control _pi_sewing" style="font-size:12px" multiple>'+(sewOpts||noOpt)+'</select></div>'
        +'</div>'
        // Row 4: Nhắc nhở KT/HT + Vật Liệu Kèm
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">'
        +'<div class="form-group" style="margin:0"><label style="font-size:11px;font-weight:700">Nhắc nhở KT, HT <span style="color:red">*</span></label><select class="form-control _pi_acctNote" style="font-size:12px">'+(accOpts||noOpt)+'</select></div>'
        +'<div class="form-group" style="margin:0"><label style="font-size:11px;font-weight:700">Vật Liệu Kèm</label><select class="form-control _pi_extraMat" style="font-size:12px" multiple>'+(extOpts||noOpt)+'</select></div>'
        +'</div>'
        // SL/Giá pairs
        +'<div class="_pi_qtyRows" data-idx="'+idx+'" style="border-top:1px solid #f1f5f9;padding-top:8px;margin-bottom:6px">'
        +'<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:4px">'
        +'<div><label style="font-size:10px;font-weight:700;color:#475569">SL1 <span style="color:red">*</span></label><input type="number" class="_pi_qty" value="0" min="0" style="width:100%;padding:4px 8px;border:1px solid #e2e8f0;border-radius:4px;font-size:12px" oninput="_dhtCalcTotal()"></div>'
        +'<div><label style="font-size:10px;font-weight:700;color:#475569">Giá 1 <span style="color:red">*</span></label><input type="number" class="_pi_price" value="0" min="0" style="width:100%;padding:4px 8px;border:1px solid #e2e8f0;border-radius:4px;font-size:12px" oninput="_dhtCalcTotal()"></div>'
        +'<div style="display:flex;align-items:flex-end"><button onclick="_dhtAddQtyRow('+idx+')" style="background:#059669;color:#fff;border:none;border-radius:4px;padding:5px 10px;font-size:11px;cursor:pointer;font-weight:700">+ Thêm SL/Giá</button></div>'
        +'</div></div>'
        // SP Khác + Giá Khác
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">'
        +'<div class="form-group" style="margin:0"><label style="font-size:11px;font-weight:700">SP Khác</label><input class="form-control _pi_extraProd" placeholder="Tên SP khác" style="font-size:12px"></div>'
        +'<div class="form-group" style="margin:0"><label style="font-size:11px;font-weight:700">Giá Khác</label><input type="number" class="form-control _pi_extraPrice" value="0" style="font-size:12px" oninput="_dhtCalcTotal()"></div>'
        +'</div>'
        // Tổng phiếu
        +'<div style="text-align:right;font-weight:800;font-size:13px;color:#b8860b">Tổng Phiếu: <span class="_pi_total">0</span>đ</div>';
    document.getElementById('_co_items')?.appendChild(div);
}

var _dhtQtyRowCount = {};
function _dhtAddQtyRow(idx) {
    if (!_dhtQtyRowCount[idx]) _dhtQtyRowCount[idx] = 1;
    _dhtQtyRowCount[idx]++;
    var n = _dhtQtyRowCount[idx];
    var container = document.querySelector('._pi_qtyRows[data-idx="'+idx+'"]');
    if (!container) return;
    var row = document.createElement('div');
    row.style.cssText = 'display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:4px';
    row.innerHTML = '<div><label style="font-size:10px;font-weight:700;color:#475569">SL'+n+'</label><input type="number" class="_pi_qty" value="0" min="0" style="width:100%;padding:4px 8px;border:1px solid #e2e8f0;border-radius:4px;font-size:12px" oninput="_dhtCalcTotal()"></div>'
        +'<div><label style="font-size:10px;font-weight:700;color:#475569">Giá '+n+'</label><input type="number" class="_pi_price" value="0" min="0" style="width:100%;padding:4px 8px;border:1px solid #e2e8f0;border-radius:4px;font-size:12px" oninput="_dhtCalcTotal()"></div>'
        +'<div style="display:flex;align-items:flex-end"><button onclick="this.parentElement.parentElement.remove();_dhtCalcTotal()" style="background:#fee2e2;color:#dc2626;border:none;border-radius:4px;padding:5px 8px;font-size:11px;cursor:pointer">✕</button></div>';
    container.appendChild(row);
}

// Cascade: load colors by material
async function _dhtLoadColors(sel, idx) {
    var mid = sel.value;
    var colorSel = document.getElementById('_pi_color_' + idx);
    if (!colorSel) return;
    if (!mid) { colorSel.innerHTML = '<option value="">← Chọn Chất Liệu trước</option>'; return; }
    var res = await apiCall('/api/dht/material-colors/' + mid);
    var colors = res.colors || [];
    colorSel.innerHTML = '<option value="">-- Chọn Màu --</option>' + colors.map(function(c) {
        return '<option value="'+c.id+'">'+c.name+'</option>';
    }).join('');
}

function _dhtCalcTotal() {
    var grandTotal = 0;
    var cards = document.querySelectorAll('._co_phieu_card');
    cards.forEach(function(card) {
        var sub = 0;
        var qtys = card.querySelectorAll('._pi_qty');
        var prices = card.querySelectorAll('._pi_price');
        for (var i = 0; i < qtys.length; i++) {
            sub += (Number(qtys[i].value)||0) * (Number(prices[i].value)||0);
        }
        sub += Number(card.querySelector('._pi_extraPrice')?.value) || 0;
        card.querySelector('._pi_total').textContent = sub.toLocaleString('vi-VN');
        grandTotal += sub;
    });
    var hasVat = document.getElementById('_co_vat')?.value === '1';
    var vatAmt = hasVat ? Math.round(grandTotal * 0.08) : 0;
    var totalVat = grandTotal + vatAmt;
    var remain = totalVat - _dhtCreate.depositAmount;
    document.getElementById('_co_total').value = grandTotal.toLocaleString('vi-VN') + 'đ';
    document.getElementById('_co_totalVat').value = totalVat.toLocaleString('vi-VN') + 'đ';
    document.getElementById('_co_remain').value = remain.toLocaleString('vi-VN') + 'đ';
}

// === Submit Order ===
async function _dhtSubmitCreateV2() {
    var cat = document.getElementById('_co_cat')?.value;
    var phone = document.getElementById('_co_phone')?.value?.trim();
    var name = document.getElementById('_co_name')?.value?.trim();
    var addr = document.getElementById('_co_addr')?.value?.trim();
    var prov = document.getElementById('_co_prov')?.value;
    var src = document.getElementById('_co_src')?.value;
    var shipDate = document.getElementById('_co_shipDate')?.value;
    var carrier = document.getElementById('_co_carrier')?.value;
    if (!cat) { showToast('Chọn Lĩnh Vực', 'error'); return; }
    var custId = document.getElementById('_co_custId')?.value;
    if (!custId) { showToast('Vui lòng chọn khách hàng từ danh sách SĐT', 'error'); return; }
    if (!phone) { showToast('Chọn Số Điện Thoại', 'error'); return; }
    if (!name) { showToast('Chưa có Tên Khách Hàng', 'error'); return; }
    if (!addr) { showToast('Nhập Địa Chỉ', 'error'); return; }
    if (!prov || _dhtProvinces.indexOf(prov) === -1) { showToast('Tỉnh/Thành Phố không hợp lệ — vui lòng chọn từ danh sách', 'error'); return; }
    if (!src) { showToast('Chưa có Nguồn (chọn KH để tự điền)', 'error'); return; }
    if (!shipDate) { showToast('Chọn Ngày Gửi Dự Kiến', 'error'); return; }
    if (!carrier) { showToast('Chọn Nhà Vận Chuyển', 'error'); return; }
    // Validate proof image for CHUẨN priority
    var pri = document.getElementById('_co_pri')?.value || 'CHUẨN';
    if (pri === 'CHUẨN' && !_dhtProofBase64) {
        showToast('📸 Vui lòng dán ảnh chứng minh Tiêu Chuẩn CHUẨN (Ctrl+V)', 'error');
        document.getElementById('_co_proofZone')?.focus();
        return;
    }

    // Collect phiếu items from rich cards
    var totalAmt = 0;
    var items = [];
    var cards = document.querySelectorAll('._co_phieu_card');
    if (cards.length === 0) { showToast('Thêm ít nhất 1 phiếu đơn hàng', 'error'); return; }
    for (var ci = 0; ci < cards.length; ci++) {
        var card = cards[ci];
        var sale = card.querySelector('._pi_sale')?.value;
        var prod = card.querySelector('._pi_product')?.value;
        var mat = card.querySelector('._pi_material')?.value;
        var matText = card.querySelector('._pi_material')?.selectedOptions[0]?.textContent || '';
        var color = card.querySelector('._pi_color')?.value;
        var colorText = card.querySelector('._pi_color')?.selectedOptions[0]?.textContent || '';
        var pat = card.querySelector('._pi_pattern')?.value;
        var acctNote = card.querySelector('._pi_acctNote')?.value;
        // Validate mandatory fields
        var pn = ci + 1;
        if (!sale) { showToast('Phiếu #'+pn+': Chọn Bán/Quà', 'error'); return; }
        if (!prod) { showToast('Phiếu #'+pn+': Chọn Sản Phẩm', 'error'); return; }
        if (!mat) { showToast('Phiếu #'+pn+': Chọn Chất Liệu', 'error'); return; }
        if (!color) { showToast('Phiếu #'+pn+': Chọn Màu', 'error'); return; }
        if (!pat) { showToast('Phiếu #'+pn+': Chọn Mẫu Áo', 'error'); return; }
        if (!acctNote) { showToast('Phiếu #'+pn+': Chọn Nhắc nhở KT/HT', 'error'); return; }
        // Collect multi-select
        var sewArr = Array.from(card.querySelector('._pi_sewing')?.selectedOptions || []).map(function(o){return o.value;});
        var extArr = Array.from(card.querySelector('._pi_extraMat')?.selectedOptions || []).map(function(o){return o.value;});
        // Collect qty/price pairs
        var qtys = card.querySelectorAll('._pi_qty');
        var prices = card.querySelectorAll('._pi_price');
        var qtyPairs = [];
        var itemSub = 0;
        for (var qi = 0; qi < qtys.length; qi++) {
            var qv = Number(qtys[qi].value) || 0;
            var pv = Number(prices[qi].value) || 0;
            qtyPairs.push({ qty: qv, price: pv, subtotal: qv * pv });
            itemSub += qv * pv;
        }
        if (qtyPairs[0]?.qty === 0) { showToast('Phiếu #'+pn+': SL1 phải > 0', 'error'); return; }
        var extraProd = card.querySelector('._pi_extraProd')?.value || '';
        var extraPrice = Number(card.querySelector('._pi_extraPrice')?.value) || 0;
        itemSub += extraPrice;
        totalAmt += itemSub;
        items.push({
            sale_type: sale, product_name: prod,
            material_id: Number(mat), material_name: matText,
            color_id: Number(color), color_name: colorText,
            pattern_name: pat, sewing_techniques: sewArr,
            accounting_notes: acctNote, extra_materials: extArr,
            quantities: qtyPairs,
            extra_product: extraProd, extra_price: extraPrice,
            item_total: itemSub,
            quantity: qtyPairs.reduce(function(s,x){return s+x.qty;},0),
            unit_price: qtyPairs[0]?.price || 0
        });
    }
    var hasVat = document.getElementById('_co_vat')?.value === '1';
    var vatAmt = hasVat ? Math.round(totalAmt * 0.08) : 0;
    var desVal = document.getElementById('_co_designer')?.value;
    var desType = desVal === 'old_design' ? 'old_design' : 'staff';
    var desId = desVal === 'old_design' ? null : (desVal || null);

    var data = await apiCall('/api/dht/orders', 'POST', {
        order_code: document.getElementById('_co_code')?.value,
        order_date: vnDateStr(),
        category_id: cat,
        customer_id: custId,
        customer_name: name,
        customer_phone: phone,
        source: src,
        province: prov,
        address: addr,
        cskh_user_id: _dhtCreate.myInfo?.id,
        total_quantity: items.reduce(function(s,x){ return s + x.quantity; }, 0),
        total_amount: totalAmt,
        discount_amount: 0,
        has_vat: hasVat,
        vat_amount: vatAmt,
        deposit_payment_id: _dhtCreate.depositId,
        designer_user_id: desId,
        designer_type: desType,
        carrier_id: carrier,
        expected_ship_date: shipDate,
        shipping_priority: pri,
        standard_proof_image: pri === 'CHUẨN' ? _dhtProofBase64 : null,
        zalo_oa_sent: document.getElementById('_co_zalo')?.value === '1',
        department_id: _dhtCreate.myInfo?.department_id,
        items: items
    });

    if (data.success) {
        // Link deposit permanently
        if (_dhtCreate.depositId) {
            await apiCall('/api/dht/lock-deposit/' + _dhtCreate.depositId, 'PUT');
        }
        showToast('✅ Đã tạo đơn hàng thành công!');
        _dhtCreate = { step: 1, depositId: null, depositAmount: 0, depositCode: '', myInfo: null };
        closeModal();
        await _dhtLoadTree();
        await _dhtLoadOrders();
        _dhtShowNextCode();
    } else {
        showToast(data.error || 'Lỗi tạo đơn', 'error');
    }
}

// === Province Autocomplete ===
function _dhtFilterProvince() {
    var input = document.getElementById('_co_prov');
    var list = document.getElementById('_co_provList');
    if (!input || !list) return;
    var q = (input.value || '').toLowerCase().trim();
    var matches = _dhtProvinces.filter(function(p) {
        return p.toLowerCase().indexOf(q) >= 0;
    });
    if (matches.length === 0 || (matches.length === 1 && matches[0] === input.value)) {
        list.style.display = 'none'; return;
    }
    list.innerHTML = matches.map(function(p) {
        var isSelected = p === input.value;
        return '<div style="padding:8px 12px;cursor:pointer;border-bottom:1px solid #f1f5f9;font-size:12px;'
            + (isSelected ? 'background:#fef3c7;font-weight:700;' : '')
            + '" onmouseover="this.style.background=\'#fef3c7\'" onmouseout="this.style.background=\'' + (isSelected ? '#fef3c7' : '') + '\'"'
            + ' onclick="_dhtPickProvince(\'' + p.replace(/'/g, "\\'") + '\')">'
            + p + '</div>';
    }).join('');
    list.style.display = 'block';
}

function _dhtPickProvince(val) {
    var input = document.getElementById('_co_prov');
    if (input) input.value = val;
    var list = document.getElementById('_co_provList');
    if (list) list.style.display = 'none';
}

// Close province dropdown when clicking outside
document.addEventListener('click', function(e) {
    var list = document.getElementById('_co_provList');
    var input = document.getElementById('_co_prov');
    if (list && input && !input.contains(e.target) && !list.contains(e.target)) {
        list.style.display = 'none';
    }
});
