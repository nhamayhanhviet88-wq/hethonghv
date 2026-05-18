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
    var [infoRes, codeRes, designRes, carrierRes, sourceRes] = await Promise.all([
        apiCall('/api/dht/my-info'),
        apiCall('/api/dht/next-order-code'),
        apiCall('/api/dht/designers'),
        apiCall('/api/dht/carriers'),
        apiCall('/api/dht/sources')
    ]);
    _dhtCreate.myInfo = infoRes.user || {};
    var mi = _dhtCreate.myInfo;
    var catOpts = _dht.categories.map(function(c){ return '<option value="'+c.id+'">'+c.name+'</option>'; }).join('');
    var provOpts = _dhtProvinces.map(function(p){ return '<option value="'+p+'">'+p+'</option>'; }).join('');
    var designers = designRes.designers || [];
    var desOpts = '<option value="">-- Chọn --</option><option value="old_design">🎨 Thiết Kế Cũ</option>'
        + designers.map(function(d){ return '<option value="'+d.id+'">'+d.full_name+'</option>'; }).join('');
    var carriers = carrierRes.carriers || [];
    var carOpts = carriers.map(function(c){ return '<option value="'+c.id+'">'+c.name+'</option>'; }).join('');
    var sources = sourceRes.sources || [];
    var deptSources = sources.filter(function(s){ return !mi.department_id || s.department_id == mi.department_id; });
    var srcOpts = deptSources.map(function(s){ return '<option value="'+s.name+'">'+s.name+'</option>'; }).join('');
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
        // Row 3: Mã đơn + SĐT
        +'<div class="form-group"><label>Mã Đơn</label><input class="form-control" value="'+(codeRes.code||'')+'" disabled id="_co_code" style="'+_dis+'"></div>'
        +'<div class="form-group"><label>Số Điện Thoại <span style="color:red">*</span></label>'
        +'<input id="_co_phone" class="form-control" placeholder="Nhập SĐT để tìm..." oninput="_dhtSearchPhone()">'
        +'<div id="_co_phoneList" style="display:none;position:absolute;z-index:100;background:#fff;border:1px solid #e2e8f0;border-radius:6px;max-height:150px;overflow-y:auto;width:calc(100% - 24px);box-shadow:0 4px 12px rgba(0,0,0,0.1)"></div></div>'
        // Row 4: Tên KH + Địa chỉ
        +'<div class="form-group"><label>Tên Khách Hàng <span style="color:red">*</span></label><input id="_co_name" class="form-control"></div>'
        +'<div class="form-group"><label>Địa Chỉ <span style="color:red">*</span></label><input id="_co_addr" class="form-control"></div>'
        // Row 5: Tỉnh + Nguồn
        +'<div class="form-group"><label>Tỉnh, Thành Phố <span style="color:red">*</span></label><select id="_co_prov" class="form-control"><option value="">-- Chọn --</option>'+provOpts+'</select></div>'
        +'<div class="form-group"><label>Nguồn <span style="color:red">*</span></label><select id="_co_src" class="form-control"><option value="">-- Chọn --</option>'+srcOpts+'</select></div>'
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
        +'<div class="form-group"><label>Ngày Gửi Hàng <span style="color:red">*</span></label><input type="date" id="_co_shipDate" class="form-control"></div>'
        +'<div class="form-group"><label>Tiêu Chuẩn Gửi <span style="color:red">*</span></label><select id="_co_pri" class="form-control"><option>CHUẨN</option><option>GỬI</option><option>GẤP</option></select></div>'
        +'</div>'
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

// === Phone Search ===
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
        if (custs.length === 0) { list.style.display = 'none'; return; }
        list.innerHTML = custs.map(function(c) {
            return '<div style="padding:8px 12px;cursor:pointer;border-bottom:1px solid #f1f5f9;font-size:12px" onmouseover="this.style.background=\'#fef3c7\'" onmouseout="this.style.background=\'\'" onclick="_dhtPickCustomer(this)" data-phone="'+c.phone+'" data-name="'+(c.customer_name||'')+'" data-addr="'+(c.address||'')+'" data-prov="'+(c.province||'')+'" data-src="'+(c.source||'')+'">'
                +'<b>'+c.phone+'</b> — '+(c.customer_name||'N/A')+'</div>';
        }).join('');
        list.style.display = 'block';
    }, 300);
}

function _dhtPickCustomer(el) {
    document.getElementById('_co_phone').value = el.dataset.phone;
    document.getElementById('_co_name').value = el.dataset.name;
    document.getElementById('_co_name').disabled = !!el.dataset.name;
    document.getElementById('_co_addr').value = el.dataset.addr;
    if (el.dataset.prov) {
        var sel = document.getElementById('_co_prov');
        for (var i = 0; i < sel.options.length; i++) {
            if (sel.options[i].value === el.dataset.prov) { sel.selectedIndex = i; break; }
        }
    }
    if (el.dataset.src) {
        var srcSel = document.getElementById('_co_src');
        for (var j = 0; j < srcSel.options.length; j++) {
            if (srcSel.options[j].value === el.dataset.src) { srcSel.selectedIndex = j; break; }
        }
    }
    document.getElementById('_co_phoneList').style.display = 'none';
}

// === Order Items ===
var _dhtItemCount = 0;
function _dhtAddItem() {
    _dhtItemCount++;
    var idx = _dhtItemCount;
    var div = document.createElement('div');
    div.id = '_co_item_' + idx;
    div.style.cssText = 'display:grid;grid-template-columns:2fr 80px 120px 120px 40px;gap:6px;margin-bottom:6px;align-items:center';
    div.innerHTML = '<input class="form-control _co_iname" placeholder="Tên sản phẩm/phiếu" style="font-size:12px">'
        +'<input type="number" class="form-control _co_iqty" value="1" min="1" style="font-size:12px" oninput="_dhtCalcTotal()">'
        +'<input type="number" class="form-control _co_iprice" value="0" style="font-size:12px" oninput="_dhtCalcTotal()">'
        +'<input class="form-control _co_isub" value="0" disabled style="font-size:12px;font-weight:700;color:#059669">'
        +'<button onclick="this.parentElement.remove();_dhtCalcTotal()" style="background:#fee2e2;color:#dc2626;border:none;border-radius:4px;cursor:pointer;font-size:12px;height:28px">✕</button>';
    document.getElementById('_co_items')?.appendChild(div);
}

function _dhtCalcTotal() {
    var total = 0;
    var qtyEls = document.querySelectorAll('._co_iqty');
    var priceEls = document.querySelectorAll('._co_iprice');
    var subEls = document.querySelectorAll('._co_isub');
    for (var i = 0; i < qtyEls.length; i++) {
        var sub = (Number(qtyEls[i].value) || 0) * (Number(priceEls[i].value) || 0);
        if (subEls[i]) subEls[i].value = sub.toLocaleString('vi-VN');
        total += sub;
    }
    var hasVat = document.getElementById('_co_vat')?.value === '1';
    var vatAmt = hasVat ? Math.round(total * 0.08) : 0;
    var totalVat = total + vatAmt;
    var remain = totalVat - _dhtCreate.depositAmount;
    document.getElementById('_co_total').value = total.toLocaleString('vi-VN') + 'đ';
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
    if (!phone) { showToast('Nhập Số Điện Thoại', 'error'); return; }
    if (!name) { showToast('Nhập Tên Khách Hàng', 'error'); return; }
    if (!addr) { showToast('Nhập Địa Chỉ', 'error'); return; }
    if (!prov) { showToast('Chọn Tỉnh/Thành Phố', 'error'); return; }
    if (!src) { showToast('Chọn Nguồn', 'error'); return; }
    if (!shipDate) { showToast('Chọn Ngày Gửi Dự Kiến', 'error'); return; }
    if (!carrier) { showToast('Chọn Nhà Vận Chuyển', 'error'); return; }

    // Calc totals
    var totalAmt = 0;
    var items = [];
    var qtyEls = document.querySelectorAll('._co_iqty');
    var priceEls = document.querySelectorAll('._co_iprice');
    var nameEls = document.querySelectorAll('._co_iname');
    for (var i = 0; i < qtyEls.length; i++) {
        var q = Number(qtyEls[i].value) || 0;
        var p = Number(priceEls[i].value) || 0;
        items.push({ item_name: nameEls[i]?.value || '', quantity: q, unit_price: p, subtotal: q * p });
        totalAmt += q * p;
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
        shipping_priority: document.getElementById('_co_pri')?.value || 'CHUẨN',
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
