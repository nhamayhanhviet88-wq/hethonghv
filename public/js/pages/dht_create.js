// ========== DHT CREATE ORDER — 2-STEP FLOW ==========
var _dhtCreate = { step: 1, depositId: null, depositAmount: 0, depositCode: '', myInfo: null, surcharges: [], editMode: false, editOrderId: null, editData: null, reminders: [] };

var _dhtProvinces = ['An Giang','Bà Rịa - Vũng Tàu','Bắc Giang','Bắc Kạn','Bạc Liêu','Bắc Ninh','Bến Tre','Bình Định','Bình Dương','Bình Phước','Bình Thuận','Cà Mau','Cần Thơ','Cao Bằng','Đà Nẵng','Đắk Lắk','Đắk Nông','Điện Biên','Đồng Nai','Đồng Tháp','Gia Lai','Hà Giang','Hà Nam','Hà Nội','Hà Tĩnh','Hải Dương','Hải Phòng','Hậu Giang','Hòa Bình','Hồ Chí Minh','Hưng Yên','Khánh Hòa','Kiên Giang','Kon Tum','Lai Châu','Lâm Đồng','Lạng Sơn','Lào Cai','Long An','Nam Định','Nghệ An','Ninh Bình','Ninh Thuận','Phú Thọ','Phú Yên','Quảng Bình','Quảng Nam','Quảng Ngãi','Quảng Ninh','Quảng Trị','Sóc Trăng','Sơn La','Tây Ninh','Thái Bình','Thái Nguyên','Thanh Hóa','Thừa Thiên Huế','Tiền Giang','TP. Hồ Chí Minh','Trà Vinh','Tuyên Quang','Vĩnh Long','Vĩnh Phúc','Yên Bái'];

// === V4: Skip Step 1 — deposits are now selected in CRM ===
async function _dhtShowCreate() {
    _dhtCreate = { step: 1, depositId: null, depositAmount: 0, depositCode: '', myInfo: null, surcharges: [], reminders: [] };
    await _dhtGoStep2();
}

function _dhtSelectDeposit(el) { /* V4: no longer used */ }
function _dhtFilterDeposits() { /* V4: no longer used */ }

async function _dhtCancelCreate() {
    _dhtCreate = { step: 1, depositId: null, depositAmount: 0, depositCode: '', myInfo: null, surcharges: [], reminders: [] };
    window._dhtEditRestricted = false;
    _dhtFreeMode = false;
    _dhtRepairData = null;
    closeModal();
}

// ========== ★ DEDICATED PET/TEM FREE ORDER FORM ==========
async function _dhtShowCreateFree() {
    _dhtCreate = { step: 1, depositId: null, depositAmount: 0, depositCode: '', myInfo: null, surcharges: [], reminders: [] };
    _dhtFreeMode = true;

    var [infoRes, designRes, carrierRes, holidayRes, phieuRes, petSrcRes, temSrcRes, depRes] = await Promise.all([
        apiCall('/api/dht/my-info'),
        apiCall('/api/dht/designers'),
        apiCall('/api/dht/carriers'),
        apiCall('/api/holidays'),
        apiCall('/api/dht/phieu-options'),
        apiCall('/api/dht/pet-sources'),
        apiCall('/api/dht/tem-sources'),
        apiCall('/api/dht/available-deposits')
    ]);

    _dhtCreate.phieuOpts = phieuRes || {};
    _dhtCreate.holidays = {};
    (holidayRes.holidays || []).forEach(function(h) {
        var d = h.holiday_date;
        if (typeof d === 'string') d = d.split('T')[0];
        _dhtCreate.holidays[d] = h.holiday_name;
    });
    _dhtCreate.myInfo = infoRes.user || {};
    var mi = _dhtCreate.myInfo;

    // Only PET & TEM categories
    var freeCats = (_dht.categories || []).filter(function(c) { return c.name === 'PET' || c.name === 'TEM'; });
    var catOpts = freeCats.map(function(c){ return '<option value="'+c.id+'">'+c.name+'</option>'; }).join('');

    var designers = designRes.designers || [];
    var desOpts = '<option value="">-- Chọn --</option><option value="old_design">🎨 Thiết Kế Cũ</option>'
        + designers.map(function(d){ return '<option value="'+d.id+'">'+d.full_name+'</option>'; }).join('');
    var carriers = carrierRes.carriers || [];
    var carOpts = carriers.map(function(c){ return '<option value="'+c.id+'">'+c.name+'</option>'; }).join('');

    // Build PET/TEM source options
    var petSrcOpts = (petSrcRes.items || []).map(function(s) { return '<option value="'+s.name+'">'+s.name+'</option>'; }).join('');
    var temSrcOpts = (temSrcRes.items || []).map(function(s) { return '<option value="'+s.name+'">'+s.name+'</option>'; }).join('');

    // Build deposit options
    var depOpts = (depRes.deposits || []).map(function(d) {
        var amt = Number(d.amount || 0).toLocaleString('vi-VN');
        var dt = d.payment_date ? d.payment_date.split('T')[0] : '';
        return '<option value="'+d.id+'" data-amount="'+d.amount+'">'+d.payment_code+' — '+amt+'đ'+(d.customer_name?' — '+d.customer_name:'')+(dt?' ('+dt+')':'')+'</option>';
    }).join('');

    var _dis = 'background:#f1f5f9;color:#64748b;cursor:not-allowed';
    var _teamName = mi.parent_department_name ? (mi.department_name || 'Không có') : (mi.team_name || 'Không có');

    var body = '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:0">'
        +'<div class="form-group"><label>Tên Nhân Viên</label><input class="form-control" value="'+(mi.full_name||'')+'" disabled style="'+_dis+'"></div>'
        +'<div class="form-group"><label>Phòng Ban</label><input class="form-control" value="'+(mi.phong_ban||mi.department_name||'')+'" disabled style="'+_dis+'"></div>'
        +'<div class="form-group"><label>Team</label><input class="form-control" value="'+_teamName+'" disabled style="'+_dis+'"></div>'
        +'</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
        // Ngày + Lĩnh vực (chỉ PET/TEM)
        +'<div class="form-group"><label>Ngày Lên Đơn</label><input class="form-control" value="'+vnDateStr()+'" disabled style="'+_dis+'"></div>'
        +'<div class="form-group"><label>Lĩnh Vực <span style="color:red">*</span></label><select id="_co_cat" class="form-control" onchange="_dhtOnFreeCatSwitch()"><option value="">-- Chọn --</option>'+catOpts+'</select></div>'
        // Mã đơn: tự sinh
        +'<div style="grid-column:span 2"><div class="form-group"><label>Mã Đơn <span style="font-size:10px;color:#059669;font-weight:700">✅ Tự động khi xác nhận</span></label>'
        +'<input id="_co_codeFreeLabel" class="form-control" disabled value="🔄 Chọn lĩnh vực trước..." style="'+_dis+';font-weight:800;font-size:14px;color:#059669;border:2px solid #059669;background:#f0fdf4"></div></div>'
        +'</div>'
        // ★ GATE: All fields below only show after selecting Lĩnh Vực
        +'<div id="_co_freeFormFields" style="display:none">'
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
        // ★ STEP 1: Tên KH trước (có autocomplete)
        +'<div class="form-group" style="position:relative;grid-column:span 2"><label style="font-weight:800;color:#166534">① Tên Khách Hàng <span style="color:red">*</span> ✏️ <span style="font-size:10px;font-weight:600;color:#64748b">— Gõ tên để tìm KH cũ hoặc nhập mới</span></label>'
        +'<input id="_co_name" class="form-control" placeholder="🔍 Gõ tên khách hàng..." autocomplete="off" oninput="_dhtNameAutocomplete()" onfocus="_dhtNameAutocomplete()" style="font-size:14px;border:2px solid #059669">'
        +'<div id="_co_nameList" style="display:none;position:absolute;z-index:100;background:#fff;border:1px solid #86efac;border-radius:8px;max-height:200px;overflow-y:auto;width:100%;box-shadow:0 6px 20px rgba(0,0,0,0.12);margin-top:2px"></div></div>'
        // ★ STEP 2: SĐT (disabled cho đến khi nhập tên, cũng có autocomplete)
        +'<div class="form-group" style="position:relative"><label style="font-weight:800;color:#1e40af">② SĐT Khách Hàng <span style="color:red">*</span> ✏️</label>'
        +'<input id="_co_phone" class="form-control" placeholder="Nhập tên KH trước..." disabled autocomplete="off" oninput="_dhtPhoneAutocomplete();_dhtCheckPhoneChange()" style="background:#f1f5f9;cursor:not-allowed">'
        +'<div id="_co_phoneList" style="display:none;position:absolute;z-index:100;background:#fff;border:1px solid #60a5fa;border-radius:8px;max-height:180px;overflow-y:auto;width:100%;box-shadow:0 6px 20px rgba(0,0,0,0.12);margin-top:2px"></div>'
        +'<div id="_co_phoneAction" style="display:none;margin-top:6px;background:#fffbeb;border:2px solid #f59e0b;border-radius:8px;padding:10px 12px">'
        +'<div style="font-size:11px;font-weight:800;color:#92400e;margin-bottom:8px">⚠️ SĐT đã thay đổi! Chọn hành động: <span style="color:red">*</span></div>'
        +'<div style="display:flex;gap:8px">'
        +'<label style="flex:1;cursor:pointer;padding:8px 10px;border:2px solid #e2e8f0;border-radius:8px;text-align:center;font-size:11px;font-weight:700;transition:all .2s" id="_co_phoneAction_update" onclick="_dhtSetPhoneAction(\'update\')">🔄 Đổi SĐT cho KH cũ</label>'
        +'<label style="flex:1;cursor:pointer;padding:8px 10px;border:2px solid #e2e8f0;border-radius:8px;text-align:center;font-size:11px;font-weight:700;transition:all .2s" id="_co_phoneAction_new" onclick="_dhtSetPhoneAction(\'create_new\')">➕ Tạo KH mới</label>'
        +'</div></div></div>'
        // ★ STEP 3: Địa chỉ + Tỉnh (luôn sửa được)
        +'<div class="form-group"><label>③ Địa Chỉ <span style="color:red">*</span> ✏️</label><input id="_co_addr" class="form-control" placeholder="Địa chỉ giao hàng"></div>'
        +'<div class="form-group" style="position:relative"><label>③ Tỉnh, Thành Phố <span style="color:red">*</span> ✏️</label>'
        +'<input id="_co_prov" class="form-control" placeholder="Gõ để tìm tỉnh/TP..." autocomplete="off" oninput="_dhtFilterProvince()" onfocus="_dhtFilterProvince()">'
        +'<div id="_co_provList" style="display:none;position:absolute;z-index:100;background:#fff;border:1px solid #e2e8f0;border-radius:6px;max-height:180px;overflow-y:auto;width:calc(100% - 24px);box-shadow:0 4px 12px rgba(0,0,0,0.1);margin-top:2px"></div></div>'
        // Nguồn PET/TEM (dropdown)
        +'<div class="form-group"><label>Nguồn <span style="color:red">*</span></label><select id="_co_srcFreeSelect" class="form-control"><option value="">-- Chọn nguồn --</option></select></div>'
        // Thiết kế
        +'<div class="form-group"><label>Thiết Kế <span style="color:red">*</span></label><select id="_co_designer" class="form-control">'+desOpts+'</select></div>'
        +'</div>'
        // Phiếu đơn hàng
        +'<div style="margin:12px 0;border-top:1px solid #e2e8f0;padding-top:12px">'
        +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">'
        +'<span style="font-weight:800;font-size:13px;color:var(--navy)">📋 Phiếu Đơn Hàng</span>'
        +'<button onclick="_dhtAddItemFree()" style="background:#059669;color:#fff;border:none;padding:4px 14px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer">➕ Thêm Phiếu</button></div>'
        +'<div id="_co_items"></div></div>'
        // 💰 Chọn Mã Cọc (tùy chọn) — ngay sau phiếu
        +'<div style="margin:10px 0;background:linear-gradient(135deg,#f0fdf4,#ecfdf5);border:1px solid #86efac;border-radius:10px;padding:12px">'
        +'<label style="font-weight:800;font-size:12px;color:#166534;margin-bottom:6px;display:block">💰 Chọn Mã Cọc (tùy chọn) <span style="font-size:10px;color:#64748b;font-weight:600">— từ Sổ Ghi Nhận Tiền</span></label>'
        +'<div style="position:relative"><input id="_co_depSearch" class="form-control" placeholder="🔍 Gõ mã tiền, số tiền, nội dung CK..." autocomplete="off" oninput="_dhtSearchDeposit()" onfocus="_dhtSearchDeposit()" style="font-size:12px;border:2px solid #059669">'
        +'<div id="_co_depSearchList" style="display:none;position:absolute;z-index:100;background:#fff;border:1px solid #86efac;border-radius:8px;max-height:220px;overflow-y:auto;width:100%;box-shadow:0 6px 20px rgba(0,0,0,0.12);margin-top:2px"></div></div>'
        +'<div id="_co_depSelected" style="display:none;margin-top:6px;background:#fff;border:1px solid #86efac;border-radius:6px;padding:8px 10px;font-size:12px;color:#166534;font-weight:600"></div>'
        +'</div>'
        // Phụ Phí
        +'<div style="margin:10px 0;border:1px dashed #e2e8f0;border-radius:8px;padding:10px 12px;background:#fffbeb">'
        +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">'
        +'<span style="font-weight:800;font-size:12px;color:#92400e">Thêm Phụ Phí</span>'
        +'<button type="button" onclick="_dhtAddSurcharge()" style="background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;border:none;padding:3px 12px;border-radius:5px;font-size:10px;font-weight:700;cursor:pointer">➕ Thêm Phụ Phí</button></div>'
        +'<div id="_co_surcharges"></div></div>'
        // Tổng kết
        +'<div style="background:#f8fafc;border-radius:8px;padding:12px;border:1px solid #e2e8f0">'
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:8px">'
        +'<div class="form-group"><label>Tổng Tiền Hàng</label><input id="_co_total" class="form-control" value="0" disabled style="'+_dis+';font-weight:700"></div>'
        +'<div class="form-group"><label>Tiền Phụ Phí Thêm</label><input id="_co_surTotal" class="form-control" value="0đ" disabled style="'+_dis+';font-weight:700;color:#d97706"></div></div>'
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:8px">'
        +'<div class="form-group"><label style="font-weight:700;color:#6366f1">Số Tiền VAT thêm ✏️</label><input type="number" id="_co_additionalVat" class="form-control" value="" placeholder="0" min="0" oninput="_dhtCalcTotal()" style="font-weight:700;border:2px solid #6366f1"></div>'
        +'<div class="form-group"><label>Tổng VAT</label><input id="_co_totalVatAmt" class="form-control" value="0" disabled style="'+_dis+';font-weight:700;color:#b8860b"></div>'
        +'</div>'
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:8px">'
        +'<div class="form-group"><label>Tổng Sau VAT</label><input id="_co_totalVat" class="form-control" value="0" disabled style="'+_dis+';font-weight:800;color:#059669"></div>'
        +'<div class="form-group"><label>Đã Cọc</label><input id="_co_deposit" class="form-control" value="0đ" disabled style="'+_dis+';font-weight:700;color:#059669"></div>'
        +'</div>'
        +'<div style="display:grid;grid-template-columns:1fr;gap:10px">'
        +'<div class="form-group"><label>Còn Lại</label><input id="_co_remain" class="form-control" value="0" disabled style="'+_dis+';font-weight:800;color:#dc2626"></div>'
        +'</div></div>'
        // Vận chuyển
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px">'
        +'<div class="form-group"><label>Ngày Gửi Hàng <span style="color:red">*</span></label><input type="date" id="_co_shipDate" class="form-control" min="'+vnDateStr()+'" onchange="_dhtValidateShipDate()"></div>'
        +'<div class="form-group"><label>Tiêu Chuẩn Gửi <span style="color:red">*</span></label><select id="_co_pri" class="form-control" onchange="_dhtOnPriorityChange()"><option>CHUẨN</option><option>GỬI</option><option selected>GẤP</option></select></div></div>'
        // === Paste zone for CHUẨN proof (hidden by default since GẤP is default) ===
        +'<div id="_co_proofWrap" style="margin-top:8px;display:none">'
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:8px">'
        +'<div class="form-group"><label style="font-weight:700;font-size:12px;color:#1e293b">⏰ Yêu Cầu Chuẩn Giờ Hàng Ra (24h) <span style="color:red">*</span></label>'
        +'<div style="display:flex;gap:6px;align-items:center"><select id="_co_deliveryHour" class="form-control" style="font-size:12px;flex:1"><option value="">Giờ</option>'+_dhtHourOpts()+'</select><span style="font-weight:800">:</span><select id="_co_deliveryMin" class="form-control" style="font-size:12px;flex:1"><option value="">Phút</option>'+_dhtMinOpts()+'</select></div></div>'
        +'<div></div></div>'
        +'<label style="font-weight:700;font-size:12px;color:#1e293b">📸 Ảnh chứng minh Tiêu Chuẩn CHUẨN <span style="color:red">*</span></label>'
        +'<div id="_co_proofZone" tabindex="0" style="border:2px dashed #cbd5e1;border-radius:10px;padding:20px;text-align:center;cursor:pointer;margin-top:4px;background:#f8fafc;transition:all .2s;min-height:80px;display:flex;align-items:center;justify-content:center;flex-direction:column" onpaste="_dhtPasteProof(event)" onclick="this.focus()" onfocus="this.style.borderColor=\'#b8860b\';this.style.background=\'#fffbeb\'" onblur="this.style.borderColor=\'#cbd5e1\';this.style.background=\'#f8fafc\'">'
        +'<div id="_co_proofPlaceholder" style="color:#94a3b8;font-size:12px"><span style="font-size:24px">📋</span><br>Click vào đây rồi <b>Ctrl+V</b> dán hình ảnh</div>'
        +'<img id="_co_proofImg" style="display:none;max-width:100%;max-height:200px;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.1)">'
        +'</div></div>'
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:6px">'
        +'<div class="form-group"><label>Nhà Vận Chuyển <span style="color:red">*</span></label><select id="_co_carrier" class="form-control" onchange="_dhtOnCarrierChange()"><option value="">-- Chọn --</option>'+carOpts+'</select></div>'
        +'<div class="form-group"><label>Gửi Zalo OA</label><select id="_co_zalo" class="form-control"><option value="1">✅ Gửi Zalo OA</option><option value="0">Không gửi</option></select></div></div>'
        +'<div id="_co_carrierExtra" style="display:none;margin-top:8px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:12px"></div>'
        // Sale note
        +'<div class="form-group" style="margin-top:10px"><label style="font-weight:700;color:#1e293b">📝 Nội Dung Sale Dặn Kế Toán Gửi Hàng <span style="color:red">*</span></label>'
        +'<textarea id="_co_saleNote" class="form-control" rows="2" placeholder="Nhập nội dung dặn kế toán gửi hàng..." style="font-size:12px;resize:vertical;border:2px solid #f59e0b"></textarea></div>'
        +'<div id="_co_depositInfo" style="background:#fffbeb;border-radius:6px;padding:8px 12px;margin-top:8px;font-size:12px;color:#b8860b;font-weight:600">💰 Không cọc</div>'
        +'</div>'; // close _co_freeFormFields

    var footer = '<button class="btn btn-secondary" onclick="_dhtCancelCreate()">← Hủy</button>'
        +'<button class="btn" onclick="_dhtSubmitCreateV2()" style="background:linear-gradient(135deg,#059669,#10b981);color:#fff;border:none;padding:8px 24px;border-radius:8px;font-weight:800">🐾 Lưu Đơn PET/TEM</button>';

    openModal('🐾 Tạo Đơn PET / TEM', body, footer);

    _dhtCreate.phieuItems = [];
    _dhtCreate.surcharges = [];
    _dhtCreate.reminders = [];
    _dhtCreate._allDeposits = depRes.deposits || depRes || [];
    console.log('[PET/TEM] depRes:', depRes, '_allDeposits count:', _dhtCreate._allDeposits.length);
    _dhtCreate.depositId = null;
    _dhtCreate.depositAmount = 0;
    _dhtCreate.depositCode = '';
    window._ppNNTags = [];
    _ppRenderNNTags();

    // Update free code label based on first selected cat
    _dhtOnFreeCatSwitch();
}

// Switch source dropdown when PET/TEM category changes in free form
async function _dhtOnFreeCatSwitch() {
    var catSel = document.getElementById('_co_cat');
    var catName = catSel ? (catSel.options[catSel.selectedIndex]?.text || '') : '';
    var freeLabel = document.getElementById('_co_codeFreeLabel');
    var formFields = document.getElementById('_co_freeFormFields');

    // Smart validation: if switching to PET but sheets containing 'Tờ' exist
    if (catName === 'PET' && _dhtCreate.phieuItems && _dhtCreate.phieuItems.length > 0) {
        var hasTo = _dhtCreate.phieuItems.some(function(item) {
            return item && item.product_name === 'Tờ';
        });
        if (hasTo) {
            showToast('⛔ Không thể chuyển sang PET vì đang có Phiếu chọn sản phẩm dạng "Tờ". Vui lòng xóa hoặc sửa các phiếu đó trước!', 'error');
            var temOption = Array.from(catSel.options).find(function(opt) { return opt.text === 'TEM'; });
            if (temOption) {
                catSel.value = temOption.value;
                catName = 'TEM';
            }
        }
    }

    if (!catName || catName === '-- Chọn --') {
        // Chưa chọn lĩnh vực → ẩn toàn bộ form
        if (freeLabel) freeLabel.value = '🔄 Chọn lĩnh vực trước...';
        if (formFields) formFields.style.display = 'none';
        return;
    }

    // Đã chọn → hiện form
    if (formFields) formFields.style.display = '';
    if (freeLabel) {
        var prefix = catName === 'TEM' ? 'GCTEM' : 'GCPET';
        freeLabel.value = '🔄 ' + prefix + '???? — Mã tự động khi bấm Lưu Đơn';
    }

    // Reload sources for the selected cat
    try {
        var srcApi = catName === 'TEM' ? '/api/dht/tem-sources' : '/api/dht/pet-sources';
        var srcRes = await apiCall(srcApi);
        var srcSelect = document.getElementById('_co_srcFreeSelect');
        if (srcSelect) {
            srcSelect.innerHTML = '<option value="">-- Chọn nguồn ' + catName + ' --</option>'
                + (srcRes.items || []).map(function(s) { return '<option value="' + s.name + '">' + s.name + '</option>'; }).join('');
        }
    } catch(e) {}
}

// ★ STEP 1: Name autocomplete — gõ tên, gợi ý KH cũ
var _dhtNameTimer = null;
function _dhtNameAutocomplete() {
    var q = (document.getElementById('_co_name')?.value || '').trim();
    var listEl = document.getElementById('_co_nameList');
    if (!listEl) return;

    // Unlock SĐT khi đã nhập tên (≥1 ký tự)
    var phoneEl = document.getElementById('_co_phone');
    if (phoneEl) {
        if (q.length >= 1) {
            phoneEl.disabled = false;
            phoneEl.style.background = '#fff';
            phoneEl.style.cursor = 'text';
            phoneEl.placeholder = 'Nhập SĐT khách hàng';
        } else {
            phoneEl.disabled = true;
            phoneEl.style.background = '#f1f5f9';
            phoneEl.style.cursor = 'not-allowed';
            phoneEl.placeholder = 'Nhập tên KH trước...';
        }
    }

    // Helper: get current category name
    var _catSel = document.getElementById('_co_cat');
    var _curCat = _catSel ? (_catSel.options[_catSel.selectedIndex]?.text || '') : '';
    if (_curCat === '-- Chọn --') _curCat = '';
    var catParam = _curCat ? '&cat=' + encodeURIComponent(_curCat) : '';

    // Helper: build category badges
    function _buildCatBadges(cats) {
        if (!cats || !cats.length) return '';
        var badges = '';
        if (cats.includes('PET')) badges += '<span style="background:#059669;color:#fff;padding:1px 6px;border-radius:4px;font-size:9px;font-weight:800;margin-left:4px">🐾 PET</span>';
        if (cats.includes('TEM')) badges += '<span style="background:#7c3aed;color:#fff;padding:1px 6px;border-radius:4px;font-size:9px;font-weight:800;margin-left:4px">🏷️ TEM</span>';
        return badges;
    }

    if (q.length < 1) {
        // Focus với ô trống → hiện tất cả KH gần đây
        clearTimeout(_dhtNameTimer);
        _dhtNameTimer = setTimeout(async function() {
            try {
                var res = await apiCall('/api/dht/free-customers/search?q=' + catParam);
                var custs = res.customers || [];
                if (custs.length === 0) {
                    listEl.innerHTML = '<div style="padding:10px 14px;color:#64748b;font-size:12px">Chưa có khách hàng — nhập tên mới</div>';
                    listEl.style.display = 'block';
                    return;
                }
                var html = custs.map(function(c) {
                    return '<div onclick="_dhtSelectFreeCust('+c.id+',\''+_escHtml(c.name)+'\',\''+_escHtml(c.phone||'')+'\',\''+_escHtml(c.address||'')+'\',\''+_escHtml(c.province||'')+'\')" style="padding:8px 14px;cursor:pointer;border-bottom:1px solid #f1f5f9;transition:background .15s" onmouseover="this.style.background=\'#f0fdf4\'" onmouseout="this.style.background=\'#fff\'">'
                        + '<div style="font-weight:700;font-size:13px;color:#1e293b">' + (c.name || '—') + _buildCatBadges(c.categories) + '</div>'
                        + '<div style="font-size:11px;color:#64748b">📱 ' + (c.phone || 'Không SĐT') + '  •  📍 ' + (c.province || '') + '</div>'
                        + '</div>';
                }).join('');
                listEl.innerHTML = html;
                listEl.style.display = 'block';
            } catch(e) { listEl.style.display = 'none'; }
        }, 150);
        return;
    }

    clearTimeout(_dhtNameTimer);
    _dhtNameTimer = setTimeout(async function() {
        try {
            var res = await apiCall('/api/dht/free-customers/search?q=' + encodeURIComponent(q) + catParam);
            var custs = res.customers || [];
            if (custs.length === 0) {
                listEl.innerHTML = '<div style="padding:10px 14px;color:#64748b;font-size:12px">KH mới — tiếp tục nhập SĐT bên dưới ②</div>';
                listEl.style.display = 'block';
                return;
            }
            var html = custs.map(function(c) {
                return '<div onclick="_dhtSelectFreeCust('+c.id+',\''+_escHtml(c.name)+'\',\''+_escHtml(c.phone||'')+'\',\''+_escHtml(c.address||'')+'\',\''+_escHtml(c.province||'')+'\')" style="padding:8px 14px;cursor:pointer;border-bottom:1px solid #f1f5f9;transition:background .15s" onmouseover="this.style.background=\'#f0fdf4\'" onmouseout="this.style.background=\'#fff\'">'
                    + '<div style="font-weight:700;font-size:13px;color:#1e293b">' + (c.name || '—') + _buildCatBadges(c.categories) + '</div>'
                    + '<div style="font-size:11px;color:#64748b">📱 ' + (c.phone || 'Không SĐT') + '  •  📍 ' + (c.province || '') + '</div>'
                    + '</div>';
            }).join('');
            listEl.innerHTML = html;
            listEl.style.display = 'block';
        } catch(e) {
            listEl.style.display = 'none';
        }
    }, 300);
}

function _escHtml(s) { return (s||'').replace(/'/g, "\\'").replace(/"/g, '&quot;'); }

// ★ Select customer — điền tất cả, vẫn sửa được
var _dhtSelectedCustId = null;
var _dhtSelectedOrigPhone = null;
var _dhtPhoneAction = null; // 'update' or 'create_new'

function _dhtSelectFreeCust(id, name, phone, addr, prov) {
    // Store selected customer ID + original phone
    _dhtSelectedCustId = id;
    _dhtSelectedOrigPhone = phone;
    _dhtPhoneAction = null;

    var phoneEl = document.getElementById('_co_phone');
    var nameEl = document.getElementById('_co_name');
    var addrEl = document.getElementById('_co_addr');
    var provEl = document.getElementById('_co_prov');
    if (nameEl) nameEl.value = name;
    if (phoneEl) { phoneEl.value = phone; phoneEl.disabled = false; phoneEl.style.background = '#fff'; phoneEl.style.cursor = 'text'; phoneEl.placeholder = 'Nhập SĐT khách hàng'; }
    if (addrEl) addrEl.value = addr;
    if (provEl) provEl.value = prov;

    // Hide toggle + dropdowns
    var actionEl = document.getElementById('_co_phoneAction');
    if (actionEl) actionEl.style.display = 'none';
    var nameListEl = document.getElementById('_co_nameList');
    if (nameListEl) nameListEl.style.display = 'none';
    var phoneListEl = document.getElementById('_co_phoneList');
    if (phoneListEl) phoneListEl.style.display = 'none';
}

// Detect phone change after selecting a customer
function _dhtCheckPhoneChange() {
    var actionEl = document.getElementById('_co_phoneAction');
    if (!actionEl) return;
    var phoneEl = document.getElementById('_co_phone');
    var curPhone = (phoneEl?.value || '').trim();

    if (_dhtSelectedCustId && _dhtSelectedOrigPhone && curPhone !== _dhtSelectedOrigPhone) {
        // Phone changed → show toggle
        actionEl.style.display = 'block';
        _dhtPhoneAction = null; // Reset choice
        _dhtSetPhoneAction(null); // Reset UI
    } else {
        // Same phone or no selection → hide
        actionEl.style.display = 'none';
        _dhtPhoneAction = null;
    }
}

function _dhtSetPhoneAction(action) {
    _dhtPhoneAction = action;
    var updateEl = document.getElementById('_co_phoneAction_update');
    var newEl = document.getElementById('_co_phoneAction_new');
    if (updateEl) {
        updateEl.style.background = action === 'update' ? '#059669' : '#fff';
        updateEl.style.color = action === 'update' ? '#fff' : '#1e293b';
        updateEl.style.borderColor = action === 'update' ? '#059669' : '#e2e8f0';
    }
    if (newEl) {
        newEl.style.background = action === 'create_new' ? '#7c3aed' : '#fff';
        newEl.style.color = action === 'create_new' ? '#fff' : '#1e293b';
        newEl.style.borderColor = action === 'create_new' ? '#7c3aed' : '#e2e8f0';
    }
}

// ★ STEP 2: Phone autocomplete — gõ SĐT cũng gợi ý KH cũ
var _dhtPhoneTimer = null;
function _dhtPhoneAutocomplete() {
    var q = (document.getElementById('_co_phone')?.value || '').trim();
    var listEl = document.getElementById('_co_phoneList');
    if (!listEl) return;
    if (q.length < 3) { listEl.style.display = 'none'; return; }

    clearTimeout(_dhtPhoneTimer);
    _dhtPhoneTimer = setTimeout(async function() {
        try {
            var res = await apiCall('/api/dht/free-customers/search?q=' + encodeURIComponent(q));
            var custs = res.customers || [];
            if (custs.length === 0) { listEl.style.display = 'none'; return; }
            var html = custs.map(function(c) {
                return '<div onclick="_dhtSelectFreeCust('+c.id+',\''+_escHtml(c.name)+'\',\''+_escHtml(c.phone||'')+'\',\''+_escHtml(c.address||'')+'\',\''+_escHtml(c.province||'')+'\')" style="padding:8px 12px;cursor:pointer;border-bottom:1px solid #f1f5f9;transition:background .15s" onmouseover="this.style.background=\'#eff6ff\'" onmouseout="this.style.background=\'#fff\'">'
                    + '<div style="font-weight:700;font-size:12px;color:#1e293b">📱 ' + (c.phone || '—') + ' — <span style="color:#059669">' + (c.name || '') + '</span></div>'
                    + (c.province ? '<div style="font-size:10px;color:#94a3b8">📍 ' + c.province + '</div>' : '')
                    + '</div>';
            }).join('');
            listEl.innerHTML = html;
            listEl.style.display = 'block';
        } catch(e) {
            listEl.style.display = 'none';
        }
    }, 300);
}

// ★ Deposit search for PET/TEM — live fetch like CRM
var _dhtDepSearchTimer = null;
function _dhtSearchDeposit() {
    var q = (document.getElementById('_co_depSearch')?.value || '').trim().toLowerCase();
    var listEl = document.getElementById('_co_depSearchList');
    if (!listEl) return;

    clearTimeout(_dhtDepSearchTimer);
    _dhtDepSearchTimer = setTimeout(async function() {
        try {
            var res = await apiCall('/api/dht/available-deposits');
            var deps = res.deposits || [];

            var filtered;
            if (q.length < 1) {
                filtered = deps.slice(0, 20);
            } else {
                filtered = deps.filter(function(d) {
                    var searchStr = ((d.payment_code || '') + ' ' + (d.amount || '') + ' ' + (d.description || '') + ' ' + (d.customer_name || '')).toLowerCase();
                    return searchStr.indexOf(q) >= 0;
                }).slice(0, 15);
            }

            if (filtered.length === 0) {
                listEl.innerHTML = '<div style="padding:10px 14px;color:#64748b;font-size:12px">Không tìm thấy mã tiền phù hợp</div>';
                listEl.style.display = 'block';
                return;
            }

            var html = filtered.map(function(d) {
                var amt = Number(d.amount || 0).toLocaleString('vi-VN');
                var method = d.payment_method === 'CK' ? 'CK' : 'TM';
                var methodColor = method === 'CK' ? '#2563eb' : '#059669';
                return '<div onclick="_dhtSelectDeposit('+d.id+',\''+_escHtml(d.payment_code)+'\','+d.amount+')" style="padding:8px 12px;cursor:pointer;border-bottom:1px solid #f1f5f9;transition:background .15s" onmouseover="this.style.background=\'#f0fdf4\'" onmouseout="this.style.background=\'#fff\'">'
                    + '<div style="font-weight:700;font-size:12px;color:#1e293b"><span style="color:'+methodColor+'">' + d.payment_code + '</span> — <span style="color:#dc2626">' + amt + 'đ</span> — <span style="color:'+methodColor+'">' + method + '</span></div>'
                    + '<div style="font-size:10px;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + (d.description || d.customer_name || '') + '</div>'
                    + '</div>';
            }).join('');
            listEl.innerHTML = html;
            listEl.style.display = 'block';
        } catch(e) {
            console.error('[DepSearch]', e);
            listEl.innerHTML = '<div style="padding:10px 14px;color:#dc2626;font-size:12px">Lỗi tải mã tiền: ' + (e.message||'') + '</div>';
            listEl.style.display = 'block';
        }
    }, 200);
}

function _dhtSelectDeposit(id, code, amount) {
    _dhtCreate.depositId = id;
    _dhtCreate.depositAmount = amount;
    _dhtCreate.depositCode = code;

    // Show selected badge
    var selEl = document.getElementById('_co_depSelected');
    if (selEl) {
        selEl.innerHTML = '✅ <strong>' + code + '</strong> — ' + Number(amount).toLocaleString('vi-VN') + 'đ <span onclick="_dhtClearDeposit()" style="cursor:pointer;color:#dc2626;margin-left:8px;font-size:11px">✕ Bỏ cọc</span>';
        selEl.style.display = 'block';
    }
    // Update deposit info
    var infoEl = document.getElementById('_co_depositInfo');
    if (infoEl) infoEl.innerHTML = '💰 Đã cọc: <strong>' + code + '</strong> — ' + Number(amount).toLocaleString('vi-VN') + 'đ';

    // Hide search
    var listEl = document.getElementById('_co_depSearchList');
    if (listEl) listEl.style.display = 'none';
    var searchEl = document.getElementById('_co_depSearch');
    if (searchEl) searchEl.value = '';

    _dhtCalcTotal();
}

function _dhtClearDeposit() {
    _dhtCreate.depositId = null;
    _dhtCreate.depositAmount = 0;
    _dhtCreate.depositCode = '';
    var selEl = document.getElementById('_co_depSelected');
    if (selEl) { selEl.style.display = 'none'; selEl.innerHTML = ''; }
    var infoEl = document.getElementById('_co_depositInfo');
    if (infoEl) infoEl.innerHTML = '💰 Không cọc';
    _dhtCalcTotal();
}

// Close all dropdowns when clicking outside
document.addEventListener('click', function(e) {
    ['_co_nameList', '_co_phoneList', '_co_depSearchList'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el && !el.contains(e.target)) {
            var inputMap = {'_co_nameList':'_co_name', '_co_phoneList':'_co_phone', '_co_depSearchList':'_co_depSearch'};
            var inp = document.getElementById(inputMap[id]);
            if (inp && !inp.contains(e.target)) el.style.display = 'none';
        }
    });
});


// === STEP 2: Fill Order Info ===
async function _dhtGoStep2() {
    _dhtFreeMode = false;
    // Fetch data
    var [infoRes, codesRes, designRes, carrierRes, holidayRes, phieuRes, nnRes] = await Promise.all([
        apiCall('/api/dht/my-info'),
        apiCall('/api/dht/available-order-codes'),
        apiCall('/api/dht/designers'),
        apiCall('/api/dht/carriers'),
        apiCall('/api/holidays'),
        apiCall('/api/dht/phieu-options'),
        apiCall('/api/nhacnho/active').catch(function(){ return { reminders: [] }; })
    ]);
    window._ppNNAllList = (nnRes.reminders||[]).map(function(r){return{content:r.content,departments:r.departments||'',category:r.category||''};});
    _dhtCreate.phieuOpts = phieuRes || {};
    // Build holidays map: { 'YYYY-MM-DD': 'Tên lễ' }
    _dhtCreate.holidays = {};
    (holidayRes.holidays || []).forEach(function(h) {
        var d = h.holiday_date;
        if (typeof d === 'string') d = d.split('T')[0];
        _dhtCreate.holidays[d] = h.holiday_name;
    });
    _dhtCreate.myInfo = infoRes.user || {};
    _dhtCreate.availableCodes = codesRes.codes || [];
    if (!_dhtCreate.editMode) _dhtCreate.orderCode = '';
    var mi = _dhtCreate.myInfo;
    var catOpts = _dht.categories.filter(function(c){ return c.name !== 'PET' && c.name !== 'TEM'; }).map(function(c){ return '<option value="'+c.id+'">'+c.name+'</option>'; }).join('');
    var designers = designRes.designers || [];
    var desOpts = '<option value="">-- Chọn --</option><option value="old_design">🎨 Thiết Kế Cũ</option>'
        + designers.map(function(d){ return '<option value="'+d.id+'">'+d.full_name+'</option>'; }).join('');
    var carriers = carrierRes.carriers || [];
    var carOpts = carriers.map(function(c){ return '<option value="'+c.id+'">'+c.name+'</option>'; }).join('');
    var depositDisplay = _dhtCreate.depositId
        ? _dhtCreate.depositCode + ' — ' + Number(_dhtCreate.depositAmount).toLocaleString('vi-VN') + 'đ'
        : 'Không có cọc';

    var _dis = 'background:#f1f5f9;color:#64748b;cursor:not-allowed';
    var _teamName = mi.parent_department_name ? (mi.department_name || 'Không có') : (mi.team_name || 'Không có');
    var body = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
        // Row 1: NV + Phòng Ban + Team (3 cột)
        +'</div><div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:0">'
        +'<div class="form-group"><label>Tên Nhân Viên</label><input class="form-control" value="'+(mi.full_name||'')+'" disabled style="'+_dis+'"></div>'
        +'<div class="form-group"><label>Phòng Ban</label><input class="form-control" value="'+(mi.phong_ban||mi.department_name||'')+'" disabled style="'+_dis+'"></div>'
        +'<div class="form-group"><label>Team</label><input class="form-control" value="'+_teamName+'" disabled style="'+_dis+'"></div>'
        +'</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
        // Row 2: Ngày + Lĩnh vực
        +'<div class="form-group"><label>Ngày Lên Đơn</label><input class="form-control" value="'+vnDateStr()+'" disabled style="'+_dis+'"></div>'
        +'<div class="form-group"><label>Lĩnh Vực <span style="color:red">*</span></label><select id="_co_cat" class="form-control" onchange="_dhtOnCatChange()"><option value="">-- Chọn --</option>'+catOpts+'</select></div>'
        // Row 3: Mã Đơn — Normal (CRM) + Free (auto-generate)
        +'<div id="_co_codeNormal" class="form-group" style="position:relative;grid-column:span 2"><label>Mã Đơn <span style="color:red">*</span> <span style="font-size:10px;color:#b8860b;font-weight:600">(Chọn mã đã tạo ở CRM)</span></label>'
        +'<input id="_co_code" class="form-control" placeholder="🔍 Gõ mã đơn hoặc tên KH để tìm..." autocomplete="off" oninput="_dhtSearchOrderCode()" onfocus="_dhtSearchOrderCode()" style="font-size:14px;font-weight:700;border:2px solid #daa520">'
        +'<input type="hidden" id="_co_custId">'
        +'<div id="_co_codeList" style="display:none;position:absolute;z-index:100;background:#fff;border:1px solid #e2e8f0;border-radius:8px;max-height:250px;overflow-y:auto;width:calc(100% - 24px);box-shadow:0 6px 20px rgba(0,0,0,0.12);margin-top:2px"></div></div>'
        // Free mode: auto-generate code placeholder
        +'<div id="_co_codeFree" style="display:none;grid-column:span 2"><div class="form-group"><label>Mã Đơn <span style="font-size:10px;color:#059669;font-weight:700">✅ Tự động khi xác nhận</span></label>'
        +'<input id="_co_codeFreeLabel" class="form-control" disabled value="🔄 Mã sẽ tự động tạo khi bấm Lưu Đơn" style="'+_dis+';font-weight:800;font-size:14px;color:#059669;border:2px solid #059669;background:#f0fdf4"></div></div>'
        // Row 4: SĐT + Tên KH (toggleable readonly/editable)
        +'<div class="form-group"><label id="_co_phoneLabel">SĐT Khách Hàng 🔒</label><input id="_co_phone" class="form-control" disabled placeholder="← Chọn mã đơn" style="'+_dis+'"></div>'
        +'<div class="form-group"><label id="_co_nameLabel">Tên Khách Hàng 🔒</label><input id="_co_name" class="form-control" disabled placeholder="← Chọn mã đơn" style="'+_dis+'"></div>'
        // Row 5: Địa chỉ + Tỉnh
        +'<div class="form-group"><label>Địa Chỉ <span style="color:red">*</span> ✏️</label><input id="_co_addr" class="form-control" placeholder="Địa chỉ giao hàng"></div>'
        +'<div class="form-group" style="position:relative"><label>Tỉnh, Thành Phố <span style="color:red">*</span> ✏️</label>'
        +'<input id="_co_prov" class="form-control" placeholder="Gõ để tìm tỉnh/TP..." autocomplete="off" oninput="_dhtFilterProvince()" onfocus="_dhtFilterProvince()">'
        +'<div id="_co_provList" style="display:none;position:absolute;z-index:100;background:#fff;border:1px solid #e2e8f0;border-radius:6px;max-height:180px;overflow-y:auto;width:calc(100% - 24px);box-shadow:0 4px 12px rgba(0,0,0,0.1);margin-top:2px"></div></div>'
        // Row 6: Nguồn (normal=readonly, free=dropdown)
        +'<div id="_co_srcNormal" class="form-group"><label>Nguồn 🔒</label><input id="_co_src" class="form-control" disabled placeholder="← Tự điền từ mã đơn" style="'+_dis+'"></div>'
        +'<div id="_co_srcFree" class="form-group" style="display:none"><label>Nguồn <span style="color:red">*</span></label><select id="_co_srcFreeSelect" class="form-control"><option value="">-- Chọn nguồn --</option></select></div>'
        // Row 6: Thiết kế (bắt buộc)
        +'<div class="form-group"><label>Thiết Kế <span style="color:red">*</span></label><select id="_co_designer" class="form-control">'+desOpts+'</select></div>'
        +'</div>'
        // Phiếu đơn hàng
        +'<div style="margin:12px 0;border-top:1px solid #e2e8f0;padding-top:12px">'
        +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">'
        +'<span style="font-weight:800;font-size:13px;color:var(--navy)">📋 Phiếu Đơn Hàng</span>'
        +'<button onclick="_dhtAddItem()" style="background:#059669;color:#fff;border:none;padding:4px 14px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer">➕ Thêm Phiếu</button></div>'
        +'<div id="_co_items"></div></div>'
        // === Phụ Phí ===
        +'<div style="margin:10px 0;border:1px dashed #e2e8f0;border-radius:8px;padding:10px 12px;background:#fffbeb">'
        +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">'
        +'<span style="font-weight:800;font-size:12px;color:#92400e">Thêm Phụ Phí</span>'
        +'<button type="button" onclick="_dhtAddSurcharge()" style="background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;border:none;padding:3px 12px;border-radius:5px;font-size:10px;font-weight:700;cursor:pointer">➕ Thêm Phụ Phí</button></div>'
        +'<div id="_co_surcharges"></div></div>'
        // === Tổng kết: 4 hàng ===
        +'<div style="background:#f8fafc;border-radius:8px;padding:12px;border:1px solid #e2e8f0">'
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:8px">'
        +'<div class="form-group"><label>Tổng Tiền Hàng</label><input id="_co_total" class="form-control" value="0" disabled style="'+_dis+';font-weight:700"></div>'
        +'<div class="form-group"><label>Tiền Phụ Phí Thêm</label><input id="_co_surTotal" class="form-control" value="0đ" disabled style="'+_dis+';font-weight:700;color:#d97706"></div>'
        +'</div>'
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:8px">'
        +'<div class="form-group"><label style="font-weight:700;color:#6366f1">Số Tiền VAT thêm ✏️</label><input type="number" id="_co_additionalVat" class="form-control" value="" placeholder="0" min="0" oninput="_dhtCalcTotal()" style="font-weight:700;border:2px solid #6366f1"></div>'
        +'<div class="form-group"><label>Tổng VAT</label><input id="_co_totalVatAmt" class="form-control" value="0" disabled style="'+_dis+';font-weight:700;color:#b8860b"></div>'
        +'</div>'
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:8px">'
        +'<div class="form-group"><label>Tổng Sau VAT</label><input id="_co_totalVat" class="form-control" value="0" disabled style="'+_dis+';font-weight:800;color:#059669"></div>'
        +'<div class="form-group"><label>Đã Cọc</label><input id="_co_deposit" class="form-control" value="0đ" disabled style="'+_dis+';font-weight:700;color:#059669"></div>'
        +'</div>'
        +'<div style="display:grid;grid-template-columns:1fr;gap:10px">'
        +'<div class="form-group"><label>Còn Lại</label><input id="_co_remain" class="form-control" value="0" disabled style="'+_dis+';font-weight:800;color:#dc2626"></div>'
        +'</div></div>'
        // === Vận chuyển: 2 hàng x 2 cột ===
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px">'
        +'<div class="form-group"><label>Ngày Gửi Hàng <span style="color:red">*</span></label><input type="date" id="_co_shipDate" class="form-control" min="'+vnDateStr()+'" onchange="_dhtValidateShipDate()"></div>'
        +'<div class="form-group"><label>Tiêu Chuẩn Gửi <span style="color:red">*</span></label><select id="_co_pri" class="form-control" onchange="_dhtOnPriorityChange()"><option>CHUẨN</option><option>GỬI</option><option selected>GẤP</option></select></div>'
        +'</div>'
        // === Paste zone for CHUẨN proof (hidden by default since GẤP is default) ===
        +'<div id="_co_proofWrap" style="margin-top:8px;display:none">'
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:8px">'
        +'<div class="form-group"><label style="font-weight:700;font-size:12px;color:#1e293b">⏰ Yêu Cầu Chuẩn Giờ Hàng Ra (24h) <span style="color:red">*</span></label>'
        +'<div style="display:flex;gap:6px;align-items:center"><select id="_co_deliveryHour" class="form-control" style="font-size:12px;flex:1"><option value="">Giờ</option>'+_dhtHourOpts()+'</select><span style="font-weight:800">:</span><select id="_co_deliveryMin" class="form-control" style="font-size:12px;flex:1"><option value="">Phút</option>'+_dhtMinOpts()+'</select></div></div>'
        +'<div></div></div>'
        +'<label style="font-weight:700;font-size:12px;color:#1e293b">📸 Ảnh chứng minh Tiêu Chuẩn CHUẨN <span style="color:red">*</span></label>'
        +'<div id="_co_proofZone" tabindex="0" style="border:2px dashed #cbd5e1;border-radius:10px;padding:20px;text-align:center;cursor:pointer;margin-top:4px;background:#f8fafc;transition:all .2s;min-height:80px;display:flex;align-items:center;justify-content:center;flex-direction:column" onpaste="_dhtPasteProof(event)" onclick="this.focus()" onfocus="this.style.borderColor=\'#b8860b\';this.style.background=\'#fffbeb\'" onblur="this.style.borderColor=\'#cbd5e1\';this.style.background=\'#f8fafc\'">'
        +'<div id="_co_proofPlaceholder" style="color:#94a3b8;font-size:12px"><span style="font-size:24px">📋</span><br>Click vào đây rồi <b>Ctrl+V</b> dán hình ảnh</div>'
        +'<img id="_co_proofImg" style="display:none;max-width:100%;max-height:200px;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.1)">'
        +'</div></div>'
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:6px">'
        +'<div class="form-group"><label>Nhà Vận Chuyển <span style="color:red">*</span></label><select id="_co_carrier" class="form-control" onchange="_dhtOnCarrierChange()"><option value="">-- Chọn --</option>'+carOpts+'</select></div>'
        +'<div class="form-group"><label>Gửi Zalo OA</label><select id="_co_zalo" class="form-control"><option value="1">✅ Gửi Zalo OA</option><option value="0">Không gửi</option></select></div>'
        +'</div>'
        +'<div id="_co_carrierExtra" style="display:none;margin-top:8px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:12px"></div>'
        // Sale note for accounting
        +'<div id="_co_saleNoteWrap" class="form-group" style="margin-top:10px"><label style="font-weight:700;color:#1e293b">📝 Nội Dung Sale Dặn Kế Toán Gửi Hàng <span style="color:red">*</span></label>'
        +'<textarea id="_co_saleNote" class="form-control" rows="3" placeholder="Nhập nội dung dặn dò cho kế toán trước khi gửi hàng..." style="font-size:12px;resize:vertical"></textarea></div>'
        // ★ Free order deposit picker (hidden by default)
        +'<div id="_co_freeDepositWrap" style="display:none;margin-top:10px;background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:12px">'
        +'<label style="font-weight:800;font-size:12px;color:#166534">💰 Chọn Mã Cọc (tùy chọn)</label>'
        +'<select id="_co_freeDeposit" class="form-control" onchange="_dhtOnFreeDepositChange()" style="margin-top:6px;font-size:12px"><option value="">Không cọc</option></select>'
        +'</div>'
        // Deposit info
        +'<div id="_co_depositInfo" style="background:#fffbeb;border-radius:6px;padding:8px 12px;margin-top:8px;font-size:12px;color:#b8860b;font-weight:600">💰 Mã Cọc: '+depositDisplay+'</div>';

    var isEdit = _dhtCreate.editMode;
    var footer = '<button class="btn btn-secondary" onclick="_dhtCancelCreate()">← Hủy</button>'
        + (isEdit
            ? '<button class="btn" onclick="_dhtSubmitEditV2()" style="background:linear-gradient(135deg,#059669,#10b981);color:#fff;border:none;padding:8px 24px;border-radius:8px;font-weight:800">💾 Cập Nhật Đơn</button>'
            : '<button class="btn" onclick="_dhtSubmitCreateV2()" style="background:linear-gradient(135deg,#b8860b,#daa520);color:#fff;border:none;padding:8px 24px;border-radius:8px;font-weight:800">💾 Lưu Đơn Hàng</button>');

    openModal(isEdit ? '✏️ Sửa Đơn ' + _dhtCreate.orderCode : '➕ Tạo Đơn Hàng', body, footer);

    if (!isEdit) {
        _dhtCreate.phieuItems = [];
        _dhtCreate.surcharges = [];
        _dhtCreate.reminders = [];
    }
    // Init NN tags from order-level reminders
    window._ppNNTags = (_dhtCreate.reminders || []).slice();
    _ppRenderNNTags();

    // ★ Edit mode: pre-fill all fields from editData
    if (isEdit && _dhtCreate.editData) {
        var ed = _dhtCreate.editData;
        var o = ed.order;
        // Lock order code
        var codeInp = document.getElementById('_co_code');
        if (codeInp) { codeInp.value = o.order_code; codeInp.disabled = true; codeInp.style.background = '#f0fdf4'; codeInp.style.fontWeight = '900'; codeInp.style.color = '#b8860b'; }
        document.getElementById('_co_custId').value = o.customer_id || '';
        document.getElementById('_co_phone').value = o.customer_phone || '';
        document.getElementById('_co_name').value = o.customer_name || '';
        document.getElementById('_co_addr').value = o.address || '';
        document.getElementById('_co_prov').value = o.province || '';
        document.getElementById('_co_src').value = o.source || '';
        // Category
        var catSel = document.getElementById('_co_cat');
        if (catSel && o.category_id) catSel.value = o.category_id;
        // Designer
        var desSel = document.getElementById('_co_designer');
        if (desSel) {
            if (o.designer_type === 'old_design' || o.designer_type === 'old') desSel.value = 'old_design';
            else if (o.designer_user_id) desSel.value = o.designer_user_id;
        }
        // Shipping
        var priSel = document.getElementById('_co_pri');
        if (priSel && o.shipping_priority) priSel.value = o.shipping_priority;
        _dhtOnPriorityChange();
        // Pre-fill delivery time for CHUẨN
        if (o.standard_delivery_time) {
            var dtParts = o.standard_delivery_time.split(':');
            var dtH = document.getElementById('_co_deliveryHour');
            var dtM = document.getElementById('_co_deliveryMin');
            if (dtH && dtParts[0] !== undefined) dtH.value = dtParts[0];
            if (dtM && dtParts[1] !== undefined) dtM.value = dtParts[1];
        }
        // Proof image
        if (o.standard_proof_image) {
            _dhtProofBase64 = o.standard_proof_image;
            var proofImg = document.getElementById('_co_proofImg');
            var proofPh = document.getElementById('_co_proofPlaceholder');
            if (proofImg) { proofImg.src = o.standard_proof_image; proofImg.style.display = 'block'; }
            if (proofPh) proofPh.style.display = 'none';
        }
        // Ship date
        var shipInp = document.getElementById('_co_shipDate');
        if (shipInp && o.expected_ship_date) shipInp.value = o.expected_ship_date.split('T')[0];
        // Carrier
        var carSel = document.getElementById('_co_carrier');
        if (carSel && o.carrier_id) carSel.value = o.carrier_id;
        // Carrier Extra (Nhà Xe / Người Nhận Hộ)
        _dhtOnCarrierChange();
        if (o.carrier_extra) {
            var ce = typeof o.carrier_extra === 'string' ? JSON.parse(o.carrier_extra) : o.carrier_extra;
            if (ce.type === 'nha_xe') {
                var bn = document.getElementById('_co_busName'); if(bn) bn.value = ce.bus_name || '';
                var bp = document.getElementById('_co_busPhone'); if(bp) bp.value = ce.bus_phone || '';
                var bl = document.getElementById('_co_busLocation'); if(bl) bl.value = ce.bus_location || '';
                var bd = document.getElementById('_co_busDestination'); if(bd) bd.value = ce.bus_destination || '';
                var btParts = (ce.bus_departure_time || '').split(':');
                var btH = document.getElementById('_co_busHour'); if(btH && btParts[0]) btH.value = btParts[0];
                var btM = document.getElementById('_co_busMin'); if(btM && btParts[1]) btM.value = btParts[1];
            } else if (ce.type === 'nguoi_nhan_ho') {
                var pn = document.getElementById('_co_proxyName'); if(pn) pn.value = ce.proxy_name || '';
                var pa = document.getElementById('_co_proxyAddr'); if(pa) pa.value = ce.proxy_address || '';
                var pp = document.getElementById('_co_proxyPhone'); if(pp) pp.value = ce.proxy_phone || '';
            }
        }
        // Zalo
        var zaloSel = document.getElementById('_co_zalo');
        if (zaloSel) zaloSel.value = o.zalo_oa_sent ? '1' : '0';
        // Sale note
        var noteEl = document.getElementById('_co_saleNote');
        if (noteEl && o.sale_note_for_accountant) noteEl.value = o.sale_note_for_accountant;
        // Render existing phieus and surcharges
        _dhtRenderPhieuRows();
        _dhtRenderSurcharges();
        if (document.getElementById('_co_additionalVat')) {
            var val = Number(o.additional_vat_amount) || 0;
            document.getElementById('_co_additionalVat').value = val > 0 ? val : '';
        }
        _dhtCalcTotal();

        // ★ EDIT RESTRICTIONS: Non-GĐ users cannot modify critical fields
        if (typeof currentUser !== 'undefined' && currentUser && currentUser.role !== 'giam_doc') {
            // 1. Lock Lĩnh Vực (category) — read-only
            var catEl = document.getElementById('_co_cat');
            if (catEl) { catEl.disabled = true; catEl.style.background = '#f1f5f9'; catEl.style.color = '#64748b'; catEl.style.cursor = 'not-allowed'; catEl.title = '🔒 Chỉ GĐ mới đổi được Lĩnh Vực'; }

            // 2. Lock Ngày Gửi Hàng
            var shipEl = document.getElementById('_co_shipDate');
            if (shipEl) { shipEl.disabled = true; shipEl.style.background = '#f1f5f9'; shipEl.style.color = '#64748b'; shipEl.style.cursor = 'not-allowed'; shipEl.title = '🔒 Chỉ GĐ mới đổi được Ngày Gửi'; }

            // 3. Lock Tiêu Chuẩn Gửi
            var priEl = document.getElementById('_co_pri');
            if (priEl) { priEl.disabled = true; priEl.style.background = '#f1f5f9'; priEl.style.color = '#64748b'; priEl.style.cursor = 'not-allowed'; priEl.title = '🔒 Chỉ GĐ mới đổi được Tiêu Chuẩn Gửi'; }

            // 4. Lock Yêu Cầu Chuẩn Giờ Hàng Ra
            var dhEl = document.getElementById('_co_deliveryHour');
            var dmEl = document.getElementById('_co_deliveryMin');
            if (dhEl) { dhEl.disabled = true; dhEl.style.background = '#f1f5f9'; dhEl.style.cursor = 'not-allowed'; dhEl.title = '🔒 Chỉ GĐ mới đổi được'; }
            if (dmEl) { dmEl.disabled = true; dmEl.style.background = '#f1f5f9'; dmEl.style.cursor = 'not-allowed'; dmEl.title = '🔒 Chỉ GĐ mới đổi được'; }

            // 5. Store restriction flag globally for render functions
            window._dhtEditRestricted = true;

            // 6. Re-render phiếu rows and surcharges with delete buttons hidden
            _dhtRenderPhieuRows();
            _dhtRenderSurcharges();
            _ppRenderNNTags();
        } else {
            window._dhtEditRestricted = false;
        }
    }
}

// === ★ PET/TEM Free Order Mode Switch ===
var _dhtFreeMode = false;
var _dhtFreeCatNames = {}; // { catId: catName } — filled from categories

async function _dhtOnCatChange() {
    var catSel = document.getElementById('_co_cat');
    var catId = catSel ? catSel.value : '';
    var catName = catSel ? (catSel.options[catSel.selectedIndex]?.text || '') : '';
    var isFree = (catName === 'PET' || catName === 'TEM');
    var wasFree = _dhtFreeMode;
    _dhtFreeMode = isFree;
    _dhtCreate.freeCatName = catName;

    // Toggle visibility: normal vs free
    var codeNormal = document.getElementById('_co_codeNormal');
    var codeFree = document.getElementById('_co_codeFree');
    var srcNormal = document.getElementById('_co_srcNormal');
    var srcFree = document.getElementById('_co_srcFree');
    var freeDepWrap = document.getElementById('_co_freeDepositWrap');
    var phoneEl = document.getElementById('_co_phone');
    var nameEl = document.getElementById('_co_name');
    var phoneLbl = document.getElementById('_co_phoneLabel');
    var nameLbl = document.getElementById('_co_nameLabel');

    if (isFree) {
        // Switch to FREE mode
        if (codeNormal) codeNormal.style.display = 'none';
        if (codeFree) codeFree.style.display = 'block';
        if (srcNormal) srcNormal.style.display = 'none';
        if (srcFree) srcFree.style.display = 'block';
        if (freeDepWrap) freeDepWrap.style.display = 'block';

        // Unlock phone + name for manual entry
        if (phoneEl) { phoneEl.disabled = false; phoneEl.placeholder = 'Nhập SĐT khách hàng'; phoneEl.style.background = '#fff'; phoneEl.style.color = '#1e293b'; phoneEl.style.cursor = 'text'; phoneEl.value = ''; }
        if (nameEl) { nameEl.disabled = false; nameEl.placeholder = 'Nhập tên khách hàng'; nameEl.style.background = '#fff'; nameEl.style.color = '#1e293b'; nameEl.style.cursor = 'text'; nameEl.value = ''; }
        if (phoneLbl) phoneLbl.innerHTML = 'SĐT Khách Hàng <span style="color:red">*</span> ✏️';
        if (nameLbl) nameLbl.innerHTML = 'Tên Khách Hàng <span style="color:red">*</span> ✏️';

        // Update free code label
        var freeLabel = document.getElementById('_co_codeFreeLabel');
        if (freeLabel) {
            var prefix = catName === 'PET' ? 'GCPET' : 'GCTEM';
            freeLabel.value = '🔄 ' + prefix + '???? — Mã tự động khi bấm Lưu Đơn';
        }

        // Load PET/TEM sources
        try {
            var srcApi = catName === 'PET' ? '/api/dht/pet-sources' : '/api/dht/tem-sources';
            var srcRes = await apiCall(srcApi);
            var srcSelect = document.getElementById('_co_srcFreeSelect');
            if (srcSelect) {
                srcSelect.innerHTML = '<option value="">-- Chọn nguồn ' + catName + ' --</option>'
                    + (srcRes.items || []).map(function(s) {
                        return '<option value="' + s.name + '">' + s.name + '</option>';
                    }).join('');
            }
        } catch(e) { console.error('Load sources:', e); }

        // Load available deposits
        try {
            var depRes = await apiCall('/api/dht/available-deposits');
            var depSelect = document.getElementById('_co_freeDeposit');
            if (depSelect) {
                depSelect.innerHTML = '<option value="">Không cọc</option>'
                    + (depRes.deposits || []).map(function(d) {
                        var amt = Number(d.amount || 0).toLocaleString('vi-VN');
                        var dt = d.payment_date ? d.payment_date.split('T')[0] : '';
                        return '<option value="' + d.id + '" data-amount="' + d.amount + '">'
                            + d.payment_code + ' — ' + amt + 'đ'
                            + (d.customer_name ? ' — ' + d.customer_name : '')
                            + (dt ? ' (' + dt + ')' : '')
                            + '</option>';
                    }).join('');
            }
        } catch(e) { console.error('Load deposits:', e); }

        // Reset deposit for free mode
        _dhtCreate.depositId = null;
        _dhtCreate.depositAmount = 0;
        var depEl = document.getElementById('_co_deposit');
        if (depEl) depEl.value = '0đ';
        _dhtCalcTotal();
    } else {
        // Switch back to NORMAL mode
        if (codeNormal) codeNormal.style.display = 'block';
        if (codeFree) codeFree.style.display = 'none';
        if (srcNormal) srcNormal.style.display = 'block';
        if (srcFree) srcFree.style.display = 'none';
        if (freeDepWrap) freeDepWrap.style.display = 'none';

        // Lock phone + name back
        var _dis2 = 'background:#f1f5f9;color:#64748b;cursor:not-allowed';
        if (phoneEl) { phoneEl.disabled = true; phoneEl.placeholder = '← Chọn mã đơn'; phoneEl.style.cssText = _dis2; if (wasFree) phoneEl.value = ''; }
        if (nameEl) { nameEl.disabled = true; nameEl.placeholder = '← Chọn mã đơn'; nameEl.style.cssText = _dis2; if (wasFree) nameEl.value = ''; }
        if (phoneLbl) phoneLbl.innerHTML = 'SĐT Khách Hàng 🔒';
        if (nameLbl) nameLbl.innerHTML = 'Tên Khách Hàng 🔒';
    }
}

function _dhtOnFreeDepositChange() {
    var sel = document.getElementById('_co_freeDeposit');
    if (!sel) return;
    var opt = sel.options[sel.selectedIndex];
    if (sel.value) {
        _dhtCreate.depositId = Number(sel.value);
        _dhtCreate.depositAmount = Number(opt.getAttribute('data-amount') || 0);
    } else {
        _dhtCreate.depositId = null;
        _dhtCreate.depositAmount = 0;
    }
    var depEl = document.getElementById('_co_deposit');
    if (depEl) depEl.value = _dhtCreate.depositAmount.toLocaleString('vi-VN') + 'đ';
    var depInfo = document.getElementById('_co_depositInfo');
    if (depInfo) {
        if (_dhtCreate.depositAmount > 0) {
            depInfo.innerHTML = '💰 Mã Cọc: ' + (opt ? opt.text.split(' — ')[0] : '') + ' — ' + _dhtCreate.depositAmount.toLocaleString('vi-VN') + 'đ';
            depInfo.style.color = '#059669';
        } else {
            depInfo.innerHTML = '💰 Không cọc';
            depInfo.style.color = '#b8860b';
        }
    }
    _dhtCalcTotal();
}

// === Order Code Search (dropdown from CRM available codes) ===
var _dhtCodeTimer;
function _dhtSearchOrderCode() {
    clearTimeout(_dhtCodeTimer);
    _dhtCodeTimer = setTimeout(function() {
        var q = (document.getElementById('_co_code')?.value || '').toLowerCase();
        var list = document.getElementById('_co_codeList');
        if (!list) return;
        var codes = _dhtCreate.availableCodes || [];
        var filtered = codes.filter(function(c) {
            var text = (c.order_code + ' ' + c.customer_name + ' ' + c.phone).toLowerCase();
            return !q || text.indexOf(q) >= 0;
        });
        if (filtered.length === 0) {
            list.innerHTML = '<div style="padding:12px;text-align:center;font-size:11px;color:#9ca3af">Không có mã đơn chờ.<br><span style="color:#dc2626;font-weight:600">Vui lòng Chốt Đơn ở CRM trước.</span></div>';
        } else {
            list.innerHTML = filtered.map(function(c) {
                return '<div style="padding:10px 12px;cursor:pointer;border-bottom:1px solid #f1f5f9;font-size:12px"'
                    +' onmouseover="this.style.background=\'#fef3c7\'" onmouseout="this.style.background=\'\'"'
                    +' onclick="_dhtPickOrderCode('+c.id+')"'
                    +'><b style="color:#b8860b">'+c.order_code+'</b>'
                    +' — '+(c.customer_name||'N/A')+''
                    +' — <span style="color:#059669">'+c.phone+'</span>'
                    +(c.source_name ? ' <span style="font-size:10px;color:#6b7280">('+c.source_name+')</span>' : '')+'</div>';
            }).join('');
        }
        list.style.display = 'block';
    }, 200);
}

async function _dhtPickOrderCode(codeId) {
    var codes = _dhtCreate.availableCodes || [];
    var c = codes.find(function(x) { return x.id === codeId; });
    if (!c) return;
    // Set order code
    _dhtCreate.orderCode = c.order_code;
    var codeInput = document.getElementById('_co_code');
    codeInput.value = c.order_code;
    codeInput.style.background = '#f0fdf4';
    codeInput.style.fontWeight = '900';
    codeInput.style.fontSize = '16px';
    codeInput.style.color = '#b8860b';
    // Set customer ID (hidden)
    document.getElementById('_co_custId').value = c.customer_id;
    // Phone (readonly)
    document.getElementById('_co_phone').value = c.phone || '';
    // Customer name (readonly)
    document.getElementById('_co_name').value = c.customer_name || '';
    // Source (readonly)
    document.getElementById('_co_src').value = c.source_name || '';
    // Address (editable, pre-fill)
    document.getElementById('_co_addr').value = c.address || '';
    // Province (editable, pre-fill)
    if (c.province) {
        document.getElementById('_co_prov').value = c.province;
    }
    // Close dropdown
    document.getElementById('_co_codeList').style.display = 'none';

    // ★ V4.1: Fetch deposit amount linked to this order code
    try {
        var depRes = await apiCall('/api/dht/deposit-by-order/' + encodeURIComponent(c.order_code));
        _dhtCreate.depositAmount = Number(depRes.total_deposit || 0);
    } catch(e) { _dhtCreate.depositAmount = 0; }
    var depEl = document.getElementById('_co_deposit');
    if (depEl) depEl.value = _dhtCreate.depositAmount.toLocaleString('vi-VN') + 'đ';
    // Update deposit info label
    var depInfo = document.getElementById('_co_depositInfo');
    if (depInfo) {
        if (_dhtCreate.depositAmount > 0) {
            depInfo.innerHTML = '💰 Mã Cọc: ' + c.order_code + ' — ' + _dhtCreate.depositAmount.toLocaleString('vi-VN') + 'đ';
            depInfo.style.color = '#059669';
        } else {
            depInfo.innerHTML = '💰 Mã Cọc: ' + c.order_code + ' — Không có cọc';
            depInfo.style.color = '#b8860b';
        }
    }
    _dhtCalcTotal();
}

// Close order code dropdown when clicking outside
document.addEventListener('click', function(e) {
    var list = document.getElementById('_co_codeList');
    var input = document.getElementById('_co_code');
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

// === 24h Hour & Minute Options Helpers ===
function _dhtHourOpts() {
    var h = '';
    for (var i = 0; i < 24; i++) {
        var v = (i < 10 ? '0' : '') + i;
        h += '<option value="' + v + '">' + v + '</option>';
    }
    return h;
}
function _dhtMinOpts() {
    var h = '';
    for (var m = 0; m < 60; m += 5) {
        var v = (m < 10 ? '0' : '') + m;
        h += '<option value="' + v + '">' + v + '</option>';
    }
    return h;
}

// === Priority Change: show/hide proof image + delivery time ===
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

// === Carrier Change: show/hide extra fields ===
function _dhtOnCarrierChange() {
    var sel = document.getElementById('_co_carrier');
    var wrap = document.getElementById('_co_carrierExtra');
    if (!sel || !wrap) return;
    var selectedText = sel.options[sel.selectedIndex]?.text || '';
    if (selectedText.indexOf('Nhà Xe') >= 0) {
        wrap.style.display = 'block';
        wrap.innerHTML = '<div style="font-weight:800;font-size:12px;color:#0369a1;margin-bottom:8px">🚌 Thông tin Nhà Xe <span style="color:red">*</span></div>'
            + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">'
            + '<div><label style="font-size:11px;font-weight:700">Tên Nhà Xe <span style="color:red">*</span></label><input id="_co_busName" class="form-control" placeholder="VD: Phương Trang" style="font-size:12px"></div>'
            + '<div><label style="font-size:11px;font-weight:700">SĐT Nhà Xe <span style="font-size:9px;color:#6b7280">(10 số)</span> <span style="color:red">*</span></label><input id="_co_busPhone" class="form-control" type="tel" maxlength="10" placeholder="VD: 0901234567" style="font-size:12px" oninput="this.value=this.value.replace(/\\D/g,\'\').slice(0,10);this.style.borderColor=this.value.length===10?\'#10b981\':this.value.length>0?\'#f59e0b\':\'\'"></div>'
            + '</div>'
            + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">'
            + '<div><label style="font-size:11px;font-weight:700">Địa Điểm Xe Đỗ <span style="color:red">*</span></label><input id="_co_busLocation" class="form-control" placeholder="Nhập địa điểm xe đỗ" style="font-size:12px"></div>'
            + '<div><label style="font-size:11px;font-weight:700">Xe Đi Về Đâu <span style="color:red">*</span></label><input id="_co_busDestination" class="form-control" placeholder="Nhập nơi xe đi về" style="font-size:12px"></div>'
            + '</div>'
            + '<div style="display:grid;grid-template-columns:1fr;gap:8px">'
            + '<div><label style="font-size:11px;font-weight:700">Mấy Giờ Xe Chạy (24h) <span style="color:red">*</span></label><div style="display:flex;gap:4px;align-items:center"><select id="_co_busHour" class="form-control" style="font-size:12px;flex:1"><option value="">Giờ</option>'+_dhtHourOpts()+'</select><span style="font-weight:800">:</span><select id="_co_busMin" class="form-control" style="font-size:12px;flex:1"><option value="">Phút</option>'+_dhtMinOpts()+'</select></div></div>'
            + '</div>';
    } else if (selectedText.indexOf('Nhận Hàng Hộ') >= 0 || selectedText.indexOf('Nhận Hộ') >= 0) {
        wrap.style.display = 'block';
        wrap.innerHTML = '<div style="font-weight:800;font-size:12px;color:#0369a1;margin-bottom:8px">🤝 Thông tin Người Nhận Hộ <span style="color:red">*</span></div>'
            + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">'
            + '<div><label style="font-size:11px;font-weight:700">Tên Người Nhận Hộ <span style="color:red">*</span></label><input id="_co_proxyName" class="form-control" placeholder="Họ tên người nhận" style="font-size:12px"></div>'
            + '<div><label style="font-size:11px;font-weight:700">Địa Chỉ <span style="color:red">*</span></label><input id="_co_proxyAddr" class="form-control" placeholder="Địa chỉ nhận hàng" style="font-size:12px"></div>'
            + '<div><label style="font-size:11px;font-weight:700">SĐT Người Nhận Hộ <span style="font-size:9px;color:#6b7280">(10 số)</span> <span style="color:red">*</span></label><input id="_co_proxyPhone" class="form-control" type="tel" maxlength="10" placeholder="VD: 0901234567" style="font-size:12px" oninput="this.value=this.value.replace(/\\D/g,\'\').slice(0,10);this.style.borderColor=this.value.length===10?\'#10b981\':this.value.length>0?\'#f59e0b\':\'\'"></div>'
            + '</div>';
    } else {
        wrap.style.display = 'none';
        wrap.innerHTML = '';
    }
}

// Collect carrier extra data (returns object, null, or false if validation fails)
function _dhtGetCarrierExtra() {
    var sel = document.getElementById('_co_carrier');
    if (!sel) return null;
    var selectedText = sel.options[sel.selectedIndex]?.text || '';
    if (selectedText.indexOf('Nhà Xe') >= 0) {
        var busName = document.getElementById('_co_busName')?.value?.trim();
        var busPhone = document.getElementById('_co_busPhone')?.value?.trim();
        var busH = document.getElementById('_co_busHour')?.value;
        var busM = document.getElementById('_co_busMin')?.value;
        if (!busName) { showToast('Nhập Tên Nhà Xe', 'error'); return false; }
        if (!busPhone) { showToast('Nhập SĐT Nhà Xe', 'error'); return false; }
        var phoneDigits = busPhone.replace(/\D/g, '');
        if (phoneDigits.length !== 10) { showToast('SĐT Nhà Xe phải đúng 10 số (hiện tại: ' + phoneDigits.length + ' số)', 'error'); document.getElementById('_co_busPhone')?.focus(); return false; }
        var busLocation = document.getElementById('_co_busLocation')?.value?.trim();
        var busDestination = document.getElementById('_co_busDestination')?.value?.trim();
        if (!busLocation) { showToast('Nhập Địa Điểm Xe Đỗ', 'error'); document.getElementById('_co_busLocation')?.focus(); return false; }
        if (!busDestination) { showToast('Nhập Xe Đi Về Đâu', 'error'); document.getElementById('_co_busDestination')?.focus(); return false; }
        if (!busH || busH === '') { showToast('Chọn Giờ Xe Chạy', 'error'); return false; }
        if (busM === undefined || busM === null || busM === '') { showToast('Chọn Phút Xe Chạy', 'error'); return false; }
        var busTime = busH + ':' + busM;
        return { type: 'nha_xe', bus_name: busName, bus_phone: phoneDigits, bus_location: busLocation, bus_destination: busDestination, bus_departure_time: busTime };
    } else if (selectedText.indexOf('Nhận Hàng Hộ') >= 0 || selectedText.indexOf('Nhận Hộ') >= 0) {
        var proxyName = document.getElementById('_co_proxyName')?.value?.trim();
        var proxyAddr = document.getElementById('_co_proxyAddr')?.value?.trim();
        var proxyPhone = document.getElementById('_co_proxyPhone')?.value?.trim();
        if (!proxyName) { showToast('Nhập Tên Người Nhận Hộ', 'error'); document.getElementById('_co_proxyName')?.focus(); return false; }
        if (!proxyAddr) { showToast('Nhập Địa Chỉ Người Nhận Hộ', 'error'); document.getElementById('_co_proxyAddr')?.focus(); return false; }
        if (!proxyPhone) { showToast('Nhập SĐT Người Nhận Hộ', 'error'); document.getElementById('_co_proxyPhone')?.focus(); return false; }
        var proxyDigits = proxyPhone.replace(/\D/g, '');
        if (proxyDigits.length !== 10) { showToast('SĐT Người Nhận Hộ phải đúng 10 số (hiện tại: ' + proxyDigits.length + ' số)', 'error'); document.getElementById('_co_proxyPhone')?.focus(); return false; }
        return { type: 'nguoi_nhan_ho', proxy_name: proxyName, proxy_address: proxyAddr, proxy_phone: proxyDigits };
    }
    return null;
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

// === Order Items (Popup Phiếu) ===
var _dhtItemCount = 0;
if (!_dhtCreate.phieuItems) _dhtCreate.phieuItems = [];

// Searchable dropdown helper: input + filtered list, no free text
function _ppSearchField(id, label, items, curVal) {
    var h = '<div style="position:relative"><label style="font-size:11px;font-weight:700">'+label+'</label>'
        +'<input id="'+id+'" class="form-control _ppSF" autocomplete="off" style="font-size:12px;cursor:pointer" placeholder="Gõ để tìm..." value="'+(curVal||'')+'" onfocus="_ppShowList(\''+id+'\')" oninput="_ppFilterList(\''+id+'\')">'
        +'<input type="hidden" id="'+id+'_val" value="'+(curVal||'')+'">'
        +'<div id="'+id+'_list" style="display:none;position:absolute;z-index:200;background:#fff;border:1px solid #e2e8f0;border-radius:6px;max-height:150px;overflow-y:auto;width:100%;box-shadow:0 4px 12px rgba(0,0,0,0.12);margin-top:2px">';
    items.forEach(function(it) {
        var txt = it.text||it.name||it, val = it.value!==undefined?it.value:txt;
        h += '<div class="_ppOpt" data-val="'+val+'" data-txt="'+txt+'" style="padding:6px 10px;cursor:pointer;font-size:12px;border-bottom:1px solid #f8fafc" onmouseover="this.style.background=\'#fef3c7\'" onmouseout="this.style.background=\'\'" onclick="_ppPickOpt(\''+id+'\',this)">'+txt+'</div>';
    });
    return h + '</div></div>';
}
function _ppShowList(id){var l=document.getElementById(id+'_list');if(l){l.style.display='block';_ppFilterList(id);}}
function _ppFilterList(id){var inp=document.getElementById(id);if(!inp)return;var q=inp.value.toLowerCase();document.querySelectorAll('#'+id+'_list ._ppOpt').forEach(function(el){el.style.display=el.dataset.txt.toLowerCase().indexOf(q)>=0?'':'none';});}
function _ppPickOpt(id,el){document.getElementById(id).value=el.dataset.txt;document.getElementById(id+'_val').value=el.dataset.val;document.getElementById(id+'_list').style.display='none';if(id==='_pp_sale')_dhtSaleChange();if(id==='_pp_product')_dhtProductChange();if(id==='_pp_material')_dhtMatChange();if(id==='_pp_pattern')_dhtPatternChange();}
document.addEventListener('click',function(e){if(!e.target.classList.contains('_ppSF')&&!e.target.closest('[id$="_list"]')){document.querySelectorAll('[id$="_list"]').forEach(function(l){if(l.id.startsWith('_pp'))l.style.display='none';});}});

// ========== ★ PET/TEM SIMPLIFIED PHIẾU ==========
function _dhtAddItemFree(editIdx) {
    var idx = (editIdx !== undefined) ? editIdx : _dhtCreate.phieuItems.length;
    var existing = _dhtCreate.phieuItems[idx] || {};
    var ov = document.createElement('div');
    ov.id = '_phieuPopup';
    ov.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center';

    // Get current category name from select box
    var catSel = document.getElementById('_co_cat');
    var catName = catSel ? (catSel.options[catSel.selectedIndex]?.text || '') : '';
    if (catName !== 'PET' && catName !== 'TEM') {
        catName = 'PET/TEM';
    }

    // Qty/price rows
    var qps = existing.quantities || [{qty: '', price: ''}];
    var qpHTML = '';
    for (var qi = 0; qi < qps.length; qi++) {
        var n = qi + 1;
        var rm = qi > 0 ? '<div style="display:flex;align-items:flex-end"><button type="button" onclick="this.closest(\'._ppQR\').remove();_ppCalcFree()" style="background:#fee2e2;color:#dc2626;border:none;border-radius:4px;padding:5px 8px;font-size:11px;cursor:pointer">✕</button></div>' : '<div></div>';
        qpHTML += '<div class="_ppQR" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:4px">'
            + '<div><label style="font-size:10px;font-weight:700">SL' + n + ' *</label><input type="number" class="_pp_qty" value="' + (qps[qi].qty || '') + '" min="0" style="width:100%;padding:4px 8px;border:1px solid #e2e8f0;border-radius:4px;font-size:12px" oninput="_ppCalcFree()"></div>'
            + '<div><label style="font-size:10px;font-weight:700">Giá ' + n + ' *</label><input type="number" class="_pp_price" value="' + (qps[qi].price || '') + '" min="0" style="width:100%;padding:4px 8px;border:1px solid #e2e8f0;border-radius:4px;font-size:12px" oninput="_ppCalcFree()"></div>'
            + rm + '</div>';
    }

    var vatSel = '<option value="0"' + (existing.vat_percent === 8 ? '' : ' selected') + '>0%</option><option value="8"' + (existing.vat_percent === 8 ? ' selected' : '') + '>8%</option>';
    
    // Hide 'Tờ' option if in PET mode
    var prodSel = '<option value="">-- Chọn --</option>';
    if (catName !== 'PET') {
        prodSel += '<option value="Tờ"' + (existing.product_name === 'Tờ' ? ' selected' : '') + '>Tờ</option>';
    }
    prodSel += '<option value="Mét"' + (existing.product_name === 'Mét' ? ' selected' : '') + '>Mét</option>'
        + '<option value="Thiết Kế"' + (existing.product_name === 'Thiết Kế' ? ' selected' : '') + '>Thiết Kế</option>';

    var title = '🐾 Phiếu ' + catName + ' #' + (idx + 1);

    ov.innerHTML = '<div style="background:#fff;border-radius:12px;padding:20px;width:420px;max-height:80vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,0.2)">'
        + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><span style="font-weight:800;font-size:14px;color:var(--navy)">' + title + '</span><button type="button" onclick="document.getElementById(\'_phieuPopup\').remove()" style="background:none;border:none;font-size:18px;cursor:pointer;color:#94a3b8">✕</button></div>'
        + '<div style="display:grid;grid-template-columns:1fr;gap:10px;margin-bottom:12px">'
        + '<div class="form-group"><label style="font-weight:700;font-size:12px">Sản Phẩm <span style="color:red">*</span></label><select id="_ppf_product" class="form-control" style="font-size:13px">' + prodSel + '</select></div>'
        + '</div>'
        + '<div style="border-top:1px solid #e2e8f0;padding-top:10px">'
        + '<div id="_ppf_qtyRows">' + qpHTML + '</div>'
        + '<button type="button" onclick="_ppAddQtyFree()" style="background:#059669;color:#fff;border:none;padding:4px 14px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;margin:4px 0">+ Thêm SL/Giá</button>'
        + '</div>'
        + '<div style="display:flex;align-items:center;gap:10px;margin-top:10px">'
        + '<div><label style="font-size:10px;font-weight:700">VAT</label><select id="_ppf_vat" class="form-control" onchange="_ppCalcFree()" style="width:80px;font-size:12px">' + vatSel + '</select></div>'
        + '<div style="flex:1;text-align:right;font-size:14px;font-weight:800;color:#dc2626" id="_ppf_total">Tổng: 0đ</div>'
        + '</div>'
        + '<div style="text-align:right;margin-top:12px"><button type="button" onclick="_dhtSavePhieuFree(' + idx + ')" style="background:linear-gradient(135deg,#059669,#10b981);color:#fff;border:none;padding:8px 24px;border-radius:8px;font-weight:800;cursor:pointer;font-size:13px">💾 Lưu Phiếu</button></div>'
        + '</div>';

    document.body.appendChild(ov);
    _ppCalcFree();
}

function _ppAddQtyFree() {
    var rows = document.getElementById('_ppf_qtyRows'); if (!rows) return;
    var count = rows.querySelectorAll('._ppQR').length + 1;
    var row = document.createElement('div');
    row.className = '_ppQR';
    row.style.cssText = 'display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:4px';
    row.innerHTML = '<div><label style="font-size:10px;font-weight:700">SL' + count + ' *</label><input type="number" class="_pp_qty" value="" min="0" style="width:100%;padding:4px 8px;border:1px solid #e2e8f0;border-radius:4px;font-size:12px" oninput="_ppCalcFree()"></div>'
        + '<div><label style="font-size:10px;font-weight:700">Giá ' + count + ' *</label><input type="number" class="_pp_price" value="" min="0" style="width:100%;padding:4px 8px;border:1px solid #e2e8f0;border-radius:4px;font-size:12px" oninput="_ppCalcFree()"></div>'
        + '<div style="display:flex;align-items:flex-end"><button type="button" onclick="this.closest(\'._ppQR\').remove();_ppCalcFree()" style="background:#fee2e2;color:#dc2626;border:none;border-radius:4px;padding:5px 8px;font-size:11px;cursor:pointer">✕</button></div>';
    rows.appendChild(row);
}

function _ppCalcFree() {
    var qs = document.querySelectorAll('#_ppf_qtyRows ._pp_qty');
    var ps = document.querySelectorAll('#_ppf_qtyRows ._pp_price');
    var raw = 0;
    for (var i = 0; i < qs.length; i++) { raw += (Number(qs[i].value) || 0) * (Number(ps[i].value) || 0); }
    var vp = Number(document.getElementById('_ppf_vat')?.value) || 0;
    var va = Math.round(raw * vp / 100);
    var el = document.getElementById('_ppf_total');
    if (el) el.textContent = 'Tổng: ' + (raw + va).toLocaleString('vi-VN') + 'đ';
}

function _dhtSavePhieuFree(idx) {
    var existing = _dhtCreate.phieuItems[idx] || {};
    var prod = document.getElementById('_ppf_product')?.value;
    var vp = Number(document.getElementById('_ppf_vat')?.value) || 0;
    if (!prod) { showToast('Chọn Sản Phẩm', 'error'); return; }

    var qs = document.querySelectorAll('#_ppf_qtyRows ._pp_qty');
    var ps = document.querySelectorAll('#_ppf_qtyRows ._pp_price');
    var qtyPairs = [], raw = 0;
    for (var i = 0; i < qs.length; i++) {
        var qv = Number(qs[i].value) || 0, pv = Number(ps[i].value) || 0;
        qtyPairs.push({qty: qv, price: pv, subtotal: qv * pv});
        raw += qv * pv;
    }
    if (!qtyPairs.length || qtyPairs[0].qty === 0) { showToast('SL1 phải > 0', 'error'); return; }

    var va = Math.round(raw * vp / 100);
    _dhtCreate.phieuItems[idx] = {
        id: existing.id || null,
        sale_type: 'Bán',
        product_name: prod,
        material_id: null, material_name: prod, color_id: null, color_name: '',
        pattern_name: '', material_pairs: [],
        sewing_techniques: [], reminders: [], accounting_notes: '', extra_materials: [],
        quantities: qtyPairs, vat_percent: vp, vat_amount: va,
        raw_total: raw, item_total: raw + va,
        quantity: qtyPairs.reduce(function(s, x) { return s + x.qty; }, 0),
        unit_price: qtyPairs[0]?.price || 0
    };
    document.getElementById('_phieuPopup')?.remove();
    _dhtRenderPhieuRows(); _dhtCalcTotal();
    var catSel = document.getElementById('_co_cat');
    var catName = catSel ? (catSel.options[catSel.selectedIndex]?.text || '') : '';
    if (catName !== 'PET' && catName !== 'TEM') {
        catName = 'PET/TEM';
    }
    showToast('✅ Đã lưu Phiếu ' + catName + ' #' + (idx + 1));
}

async function _dhtAddItem(editIdx) {
    var idx = (editIdx !== undefined) ? editIdx : _dhtCreate.phieuItems.length;
    var existing = _dhtCreate.phieuItems[idx] || {};
    var isOldItem = (editIdx !== undefined) && _dhtCreate.editMode && (editIdx < (_dhtCreate.originalPhieuCount || 0));
    var isRestricted = isOldItem && window._dhtEditRestricted;
    var po = _dhtCreate.phieuOpts || {};
    var ov = document.createElement('div');
    ov.id = '_phieuPopup';
    ov.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center';
    var saleItems=(po.sale_types||[]).map(function(o){return{text:o.name,value:o.id};});
    var prodItems=[];// products loaded dynamically after sale_type selection
    var matItems=[];// materials loaded dynamically after product selection
    // Load patterns from TSAM (approved samples) instead of legacy dht_settings_options
    var _tsamPatRes; try { _tsamPatRes = await apiCall('/api/tsam/dropdown'); } catch(e) { _tsamPatRes = {}; }
    var patItems=(_tsamPatRes.patterns||[]).map(function(o){return{text:o.name,value:o.name};});
    // Fallback: also include legacy patterns if any
    (po.patterns||[]).forEach(function(o){ if(!patItems.some(function(p){return p.value===o.name;})) patItems.push({text:o.name,value:o.name}); });
    // Nhắc nhở: now order-level, not per-item
    var sewOpts=''; // Legacy removed — BGM picker used instead
    window._ppSewItems = (existing.sewing_techniques || []).slice();
    var extOpts=(po.extra_materials||[]).map(function(o){var s=(existing.extra_materials||[]).indexOf(o.name)>=0?' selected':'';return '<option value="'+o.name+'"'+s+'>'+o.name+'</option>';}).join('');
    var noOpt='<option value="" disabled selected>-- Chờ setup --</option>';
    var qps=existing.quantities||[{qty:'',price:''}], qpHTML='';
    for(var qi=0;qi<qps.length;qi++){var n=qi+1;var rm=qi>0?'<div style="display:flex;align-items:flex-end"><button type="button" onclick="this.closest(\'._ppQR\').remove();_ppCalc()" style="background:#fee2e2;color:#dc2626;border:none;border-radius:4px;padding:5px 8px;font-size:11px;cursor:pointer">✕</button></div>':'<div></div>';qpHTML+='<div class="_ppQR" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:4px"><div><label style="font-size:10px;font-weight:700">SL'+n+' *</label><input type="number" class="_pp_qty" value="'+(qps[qi].qty||'')+'" min="0" style="width:100%;padding:4px 8px;border:1px solid #e2e8f0;border-radius:4px;font-size:12px" oninput="_ppCalc()"></div><div><label style="font-size:10px;font-weight:700">Giá '+n+' *</label><input type="number" class="_pp_price" value="'+(qps[qi].price||'')+'" min="0" style="width:100%;padding:4px 8px;border:1px solid #e2e8f0;border-radius:4px;font-size:12px" oninput="_ppCalc()"></div>'+rm+'</div>';}
    var vatSel='<option value="0"'+(existing.vat_percent===8?'':' selected')+'>0%</option><option value="8"'+(existing.vat_percent===8?' selected':'')+'>8%</option>';
    var orderCode=_dhtCreate.orderCode||'???';
    var sfSale=_ppSearchField('_pp_sale','Bán/Quà *',saleItems,existing.sale_type||'');
    var sfProd=_ppSearchField('_pp_product','Sản Phẩm *',prodItems,existing.product_name||'');
    // Cascade: disable product until Bán/Quà is selected
    setTimeout(function(){
        var pInp=document.getElementById('_pp_product');if(pInp&&!existing.product_name){pInp.disabled=true;pInp.placeholder='← Chọn Bán/Quà trước';pInp.style.background='#f1f5f9';pInp.style.cursor='not-allowed';}
    },50);
    var sfPat=_ppSearchField('_pp_pattern','Thông Số Mẫu Áo *',patItems,existing.pattern_name||'');
    // Store patterns globally for mix_color_count lookup
    window._ppTsamPatterns = _tsamPatRes.patterns || [];
    // Nhắc nhở: moved to order-level form
    var popupTitle = isRestricted ? '🔒 ' + orderCode + ' - Phiếu ' + (idx+1) : '📋 ' + orderCode + ' - Phiếu ' + (idx+1);
    var saveBtn = '<div style="text-align:right"><button type="button" onclick="_dhtSavePhieu('+idx+')" style="background:linear-gradient(135deg,#059669,#10b981);color:#fff;border:none;padding:8px 24px;border-radius:8px;font-weight:800;cursor:pointer;font-size:13px">💾 Lưu Phiếu</button></div>';
    ov.innerHTML='<div style="background:#fff;border-radius:12px;padding:20px;width:500px;max-height:85vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,0.2)">'
        +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><span style="font-weight:800;font-size:14px;color:'+(isRestricted?'#64748b':'var(--navy)')+'">'+popupTitle+'</span><button type="button" onclick="document.getElementById(\'_phieuPopup\').remove()" style="background:none;border:none;font-size:18px;cursor:pointer;color:#94a3b8">✕</button></div>'
        +'<div id="_pp_processBar" style="display:none;background:linear-gradient(135deg,#eff6ff,#dbeafe);border:1px solid #93c5fd;border-radius:8px;padding:8px 12px;margin-bottom:10px"><div style="font-size:10px;font-weight:800;color:#1d4ed8;margin-bottom:4px">⚙️ QUY TRÌNH SẢN XUẤT</div><div id="_pp_processSteps" style="display:flex;flex-wrap:wrap;gap:4px"></div></div>'
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">'+sfSale+sfProd+'</div>'
        +'<div style="display:grid;grid-template-columns:1fr;gap:8px;margin-bottom:8px">'+sfPat+'</div>'
        +'<div id="_pp_specImage" style="display:none;margin-bottom:8px"></div>'
        +'<div id="_pp_mixInfo" style="display:none;background:linear-gradient(135deg,#faf5ff,#ede9fe);border:1px solid #c4b5fd;border-radius:8px;padding:6px 12px;margin-bottom:8px;font-size:11px;font-weight:700;color:#7c3aed"></div>'
        +'<div id="_pp_matColorPairs" style="margin-bottom:8px"></div>'
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px"><div><label style="font-size:11px;font-weight:700">✂️ Chi Tiết May Thêm</label><div id="_ppSewTags" style="display:flex;flex-wrap:wrap;gap:3px;min-height:24px;padding:4px;border:1px solid #e2e8f0;border-radius:4px;background:#f8fafc;margin-bottom:4px"></div>'+(isRestricted ? '' : '<button type="button" onclick="_ppOpenBgmPicker()" style="background:#6366f1;color:#fff;border:none;padding:3px 10px;border-radius:4px;font-size:10px;font-weight:700;cursor:pointer">➕ Chọn</button>')+'</div><div><label style="font-size:11px;font-weight:700">Vật Liệu Kèm</label><select id="_pp_extraMat" class="form-control" style="font-size:12px" multiple'+(isRestricted?' disabled':'')+'>'+( extOpts||noOpt)+'</select></div></div>'
        +'<div style="border-top:1px solid #f1f5f9;padding-top:8px;margin-bottom:8px"><div id="_pp_qtyRows">'+qpHTML+'</div>'+(isRestricted ? '' : '<button type="button" onclick="_dhtAddQtyRowPP()" style="background:#059669;color:#fff;border:none;border-radius:4px;padding:5px 12px;font-size:11px;cursor:pointer;font-weight:700;margin-top:4px">+ Thêm SL/Giá</button>')+'</div>'
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;align-items:end"><div><label style="font-size:11px;font-weight:700">VAT</label><select id="_pp_vat" class="form-control" style="font-size:12px;width:120px" onchange="_ppCalc()">'+vatSel+'</select></div><div style="text-align:right;font-weight:800;font-size:15px;color:#b8860b">Tổng: <span id="_pp_totalDisplay">0</span>đ</div></div>'
        +saveBtn+'</div>';
    document.body.appendChild(ov);
    // Restore existing material pairs if editing
    if (existing.pattern_name) {
        setTimeout(function(){ _dhtPatternChange(existing); }, 100);
    }
    setTimeout(_ppCalc,100);
    // ★ READ-ONLY MODE: Set flag BEFORE rendering sew tags
    window._dhtPhieuRestricted = isRestricted;
    _ppRenderSewTags();
    if (isRestricted) {
        // Run multiple passes to catch async-rendered elements (colors load via API)
        var _lockPopup = function() {
            var popup = document.getElementById('_phieuPopup');
            if (!popup) return;
            popup.querySelectorAll('input, select, textarea').forEach(function(el) {
                if (el.id === '_pp_vat') return;
                el.disabled = true;
                el.style.background = '#f1f5f9';
                el.style.cursor = 'not-allowed';
            });
        };
        setTimeout(_lockPopup, 150);
        setTimeout(_lockPopup, 500);
        setTimeout(_lockPopup, 1000);
    } else {
        window._dhtPhieuRestricted = false;
    }
}

// Live calc inside popup
function _ppCalc() {
    var qs=document.querySelectorAll('#_pp_qtyRows ._pp_qty'), ps=document.querySelectorAll('#_pp_qtyRows ._pp_price');
    var raw=0;
    for(var i=0;i<qs.length;i++) raw+=(Number(qs[i].value)||0)*(Number(ps[i].value)||0);
    var vp=Number(document.getElementById('_pp_vat')?.value)||0;
    var total=raw+Math.round(raw*vp/100);
    var el=document.getElementById('_pp_totalDisplay');
    if(el) el.textContent=total.toLocaleString('vi-VN');
}

// Cascade: sale type → filter products
function _dhtSaleChange() {
    var saleId=document.getElementById('_pp_sale_val')?.value;
    var pInp=document.getElementById('_pp_product');
    var pList=document.getElementById('_pp_product_list');
    var pVal=document.getElementById('_pp_product_val');
    if(!pInp||!pList)return;
    // Reset product
    pInp.value='';if(pVal)pVal.value='';
    if(!saleId){pInp.disabled=true;pInp.placeholder='← Chọn Bán/Quà trước';pInp.style.background='#f1f5f9';pInp.style.cursor='not-allowed';pList.innerHTML='';return;}
    // Enable and populate with filtered products
    pInp.disabled=false;pInp.placeholder='Gõ để tìm...';pInp.style.background='';pInp.style.cursor='pointer';
    var allProducts=(_dhtCreate.phieuOpts||{}).products||[];
    var filtered=allProducts.filter(function(p){return String(p.sale_type_id)===String(saleId);});
    pList.innerHTML=filtered.map(function(p){
        return '<div class="_ppOpt" data-val="'+p.name+'" data-txt="'+p.name+'" style="padding:6px 10px;cursor:pointer;font-size:12px;border-bottom:1px solid #f8fafc" onmouseover="this.style.background=\'#fef3c7\'" onmouseout="this.style.background=\'\'" onclick="_ppPickOpt(\'_pp_product\',this)">'+p.name+'</div>';
    }).join('');
}

// Cascade: product → show process steps + store assigned materials globally
async function _dhtProductChange() {
    var prodName=document.getElementById('_pp_product')?.value;
    var bar=document.getElementById('_pp_processBar');
    var stepsEl=document.getElementById('_pp_processSteps');
    // Clear material pairs when product changes
    var pairsEl=document.getElementById('_pp_matColorPairs');
    if(pairsEl)pairsEl.innerHTML='';
    var mixInfo=document.getElementById('_pp_mixInfo');
    if(mixInfo)mixInfo.style.display='none';
    window._ppAssignedMats=[];
    if(!prodName){
        if(bar)bar.style.display='none';
        return;
    }
    // Find product ID
    var allProds=(_dhtCreate.phieuOpts||{}).products||[];
    var prod=allProds.find(function(p){return p.name===prodName;});
    if(!prod){if(bar)bar.style.display='none';return;}
    // Fetch process steps + assigned materials in parallel
    try{
        var [procRes, matRes]=await Promise.all([
            apiCall('/api/dht/product-process/'+prod.id),
            apiCall('/api/dht/product-materials/'+prod.id)
        ]);
        // Show process steps
        var steps=procRes.steps||[];
        if(bar&&stepsEl){
            if(steps.length>0){
                var colors=['#3b82f6','#059669','#f59e0b','#ef4444','#8b5cf6','#ec4899','#0891b2','#64748b'];
                stepsEl.innerHTML=steps.map(function(s,i){
                    var bg=colors[i%colors.length];
                    var clickAttr = s.page_link ? 'onclick="window.open(\''+s.page_link+'\',\'_blank\')" style="display:inline-flex;align-items:center;gap:3px;background:'+bg+';color:#fff;padding:3px 8px;border-radius:4px;font-size:10px;font-weight:700;cursor:pointer;transition:all 0.15s" onmouseover="this.style.transform=\'scale(1.05)\';this.style.boxShadow=\'0 2px 6px rgba(0,0,0,0.2)\'" onmouseout="this.style.transform=\'none\';this.style.boxShadow=\'none\'" title="Click để mở '+s.name+'"'
                        : 'style="display:inline-flex;align-items:center;gap:3px;background:'+bg+';color:#fff;padding:3px 8px;border-radius:4px;font-size:10px;font-weight:700"';
                    return '<span '+clickAttr+'>'
                        +'<span style="background:rgba(255,255,255,0.3);padding:1px 3px;border-radius:2px;font-size:8px;font-weight:800">'+(s.short_name||'')+'</span> '
                        +s.name+'</span>';
                }).join('');
                bar.style.display='block';
            } else { bar.style.display='none'; }
        }
        // Store assigned materials globally for pair rendering
        window._ppAssignedMats=matRes.materials||[];
        // Re-render pairs if pattern already selected
        var patName=document.getElementById('_pp_pattern')?.value;
        if(patName) _dhtPatternChange();
    }catch(e){if(bar)bar.style.display='none';}
}

// Legacy _dhtMatChange — now handled per pair
function _dhtMatChange() {}

// ========== PATTERN CHANGE → Dynamic Material/Color Pairs ==========
function _dhtPatternChange(existing) {
    var patName = document.getElementById('_pp_pattern')?.value;
    var pairsEl = document.getElementById('_pp_matColorPairs');
    var mixInfo = document.getElementById('_pp_mixInfo');
    if (!pairsEl) return;
    if (!patName) { pairsEl.innerHTML=''; if(mixInfo)mixInfo.style.display='none'; var imgEl=document.getElementById('_pp_specImage');if(imgEl)imgEl.style.display='none'; return; }
    var pats = window._ppTsamPatterns || [];
    var pat = pats.find(function(p){ return p.name === patName; });
    // Show spec_image preview
    var imgEl = document.getElementById('_pp_specImage');
    if (imgEl) {
        if (pat && pat.spec_image) {
            imgEl.innerHTML = '<div style="background:linear-gradient(135deg,#f0f9ff,#e0f2fe);border:1px solid #7dd3fc;border-radius:10px;padding:10px;text-align:center">'
                + '<div style="font-size:11px;font-weight:800;color:#0284c7;margin-bottom:6px">📷 Hình Ảnh Thông Số</div>'
                + '<img src="' + pat.spec_image + '" style="max-width:100%;max-height:250px;border-radius:8px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.1)" onclick="window.open(\'' + pat.spec_image + '\',\'_blank\')" title="Click để xem lớn">'
                + '</div>';
            imgEl.style.display = 'block';
        } else {
            imgEl.style.display = 'none';
        }
    }
    var mixCount = (pat && pat.mix_color_count) ? Number(pat.mix_color_count) : 1;
    if (mixInfo) {
        mixInfo.innerHTML = mixCount > 1
            ? '🎨 Mẫu <b>' + mixCount + ' Phối</b> → Cần chọn <b>' + mixCount + ' chất liệu</b> và <b>' + mixCount + ' màu</b>'
            : '🎨 Mẫu <b>Đơn</b> → 1 chất liệu, 1 màu';
        mixInfo.style.display = 'block';
    }
    var assignedMats = window._ppAssignedMats || [];
    var existPairs = (existing && existing.material_pairs) ? existing.material_pairs : [];
    if (existPairs.length === 0 && existing && existing.material_id) {
        existPairs = [{ material_id: existing.material_id, material_name: existing.material_name, color_id: existing.color_id, color_name: existing.color_name }];
    }
    var h = '';
    for (var i = 0; i < mixCount; i++) {
        var ep = existPairs[i] || {};
        var pairLabel = mixCount > 1 ? ('Phối ' + (i+1)) : '';
        var borderColor = ['#7c3aed','#2563eb','#059669','#f59e0b','#ef4444'][i % 5];
        h += '<div style="' + (mixCount > 1 ? 'border-left:3px solid '+borderColor+';padding-left:10px;margin-bottom:8px' : '') + '">';
        if (pairLabel) h += '<div style="font-size:10px;font-weight:800;color:'+borderColor+';margin-bottom:4px">'+pairLabel+'</div>';
        h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">';
        // Material searchable input
        var matListHtml = assignedMats.map(function(m){
            return '<div class="_ppPairOpt" data-val="'+m.material_id+'" data-txt="'+m.material_name+'" style="padding:6px 10px;cursor:pointer;font-size:12px;border-bottom:1px solid #f8fafc" onmouseover="this.style.background=\'#fef3c7\'" onmouseout="this.style.background=\'\'" onclick="_ppPickPairMat('+i+',this)">'+m.material_name+'</div>';
        }).join('');
        h += '<div style="position:relative"><label style="font-size:11px;font-weight:700">Chất Liệu '+(i+1)+' *</label>'
            + '<input id="_ppMat'+i+'" class="_ppSF" autocomplete="off" style="width:100%;padding:6px 8px;border:1px solid #e2e8f0;border-radius:6px;font-size:12px;cursor:pointer" placeholder="Gõ để tìm..." value="'+(ep.material_name||'')+'" onfocus="_ppShowPairList(\'_ppMatList'+i+'\')" oninput="_ppFilterPairList(\'_ppMat'+i+'\',\'_ppMatList'+i+'\')">'
            + '<input type="hidden" id="_ppMatVal'+i+'" value="'+(ep.material_id||'')+'">'
            + '<div id="_ppMatList'+i+'" style="display:none;position:absolute;z-index:300;background:#fff;border:1px solid #e2e8f0;border-radius:6px;max-height:150px;overflow-y:auto;width:100%;box-shadow:0 4px 12px rgba(0,0,0,0.12);margin-top:2px">'
            + matListHtml + '</div></div>';
        // Color searchable input (populated after material selection)
        h += '<div style="position:relative"><label style="font-size:11px;font-weight:700">Màu '+(i+1)+' *</label>'
            + '<input id="_ppColor'+i+'" class="_ppSF" autocomplete="off" style="width:100%;padding:6px 8px;border:1px solid #e2e8f0;border-radius:6px;font-size:12px;cursor:pointer;background:#f1f5f9" placeholder="← Chọn Chất Liệu" value="'+(ep.color_name||'')+'" disabled onfocus="_ppShowPairList(\'_ppColorList'+i+'\')" oninput="_ppFilterPairList(\'_ppColor'+i+'\',\'_ppColorList'+i+'\')">'
            + '<input type="hidden" id="_ppColorVal'+i+'" value="'+(ep.color_id||'')+'">'
            + '<div id="_ppColorList'+i+'" style="display:none;position:absolute;z-index:300;background:#fff;border:1px solid #e2e8f0;border-radius:6px;max-height:150px;overflow-y:auto;width:100%;box-shadow:0 4px 12px rgba(0,0,0,0.12);margin-top:2px"></div></div>';
        h += '</div></div>';
    }
    pairsEl.innerHTML = h;
    // Restore existing color selections
    for (var j = 0; j < mixCount; j++) {
        if (existPairs[j] && existPairs[j].material_id) {
            _ppPairMatLoad(j, existPairs[j].color_id);
        }
    }
}

// Helper: show pair dropdown list
function _ppShowPairList(listId) { var l=document.getElementById(listId); if(l) l.style.display='block'; }
// Helper: filter pair dropdown list
function _ppFilterPairList(inputId, listId) {
    var inp=document.getElementById(inputId); if(!inp) return;
    var q=inp.value.toLowerCase();
    document.querySelectorAll('#'+listId+' ._ppPairOpt').forEach(function(el){ el.style.display=el.dataset.txt.toLowerCase().indexOf(q)>=0?'':'none'; });
}
// Pick material for pair
function _ppPickPairMat(pairIdx, el) {
    document.getElementById('_ppMat'+pairIdx).value = el.dataset.txt;
    document.getElementById('_ppMatVal'+pairIdx).value = el.dataset.val;
    document.getElementById('_ppMatList'+pairIdx).style.display = 'none';
    // Reset color
    var cInp = document.getElementById('_ppColor'+pairIdx);
    var cVal = document.getElementById('_ppColorVal'+pairIdx);
    if(cInp){cInp.value='';cInp.disabled=false;cInp.style.background='';cInp.placeholder='Gõ để tìm màu...';}
    if(cVal)cVal.value='';
    _ppPairMatLoad(pairIdx);
}
// Pick color for pair
function _ppPickPairColor(pairIdx, el) {
    document.getElementById('_ppColor'+pairIdx).value = el.dataset.txt;
    document.getElementById('_ppColorVal'+pairIdx).value = el.dataset.val;
    document.getElementById('_ppColorList'+pairIdx).style.display = 'none';
}
// Load colors for a material pair
async function _ppPairMatLoad(pairIdx, preselectColorId) {
    var matId = document.getElementById('_ppMatVal'+pairIdx)?.value;
    var cInp = document.getElementById('_ppColor'+pairIdx);
    var cList = document.getElementById('_ppColorList'+pairIdx);
    if (!matId || !cList) return;
    cList.innerHTML = '<div style="padding:8px;color:#94a3b8;font-size:11px">Đang tải...</div>';
    var res = await apiCall('/api/dht/material-colors/' + matId);
    var colors = res.colors || [];
    cList.innerHTML = colors.map(function(c){
        return '<div class="_ppPairOpt" data-val="'+c.id+'" data-txt="'+c.name+'" style="padding:6px 10px;cursor:pointer;font-size:12px;border-bottom:1px solid #f8fafc" onmouseover="this.style.background=\'#fef3c7\'" onmouseout="this.style.background=\'\'" onclick="_ppPickPairColor('+pairIdx+',this)">'+c.name+'</div>';
    }).join('');
    if(cInp){cInp.disabled=false;cInp.style.background='';cInp.placeholder='Gõ để tìm màu...';}
    if(preselectColorId){
        var found=colors.find(function(c){return String(c.id)===String(preselectColorId);});
        if(found){
            document.getElementById('_ppColor'+pairIdx).value=found.name;
            document.getElementById('_ppColorVal'+pairIdx).value=found.id;
        }
    }
}
// Close pair dropdowns when clicking outside
document.addEventListener('click',function(e){
    if(!e.target.classList.contains('_ppSF')&&!e.target.closest('[id^="_ppMatList"]')&&!e.target.closest('[id^="_ppColorList"]')){
        document.querySelectorAll('[id^="_ppMatList"],[id^="_ppColorList"]').forEach(function(l){l.style.display='none';});
    }
});

function _dhtAddQtyRowPP() {
    var c = document.getElementById('_pp_qtyRows'); if (!c) return;
    var n = c.querySelectorAll('._ppQR').length + 1;
    var r = document.createElement('div'); r.className='_ppQR';
    r.style.cssText='display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:4px';
    r.innerHTML='<div><label style="font-size:10px;font-weight:700">SL'+n+'</label><input type="number" class="_pp_qty" value="" min="0" style="width:100%;padding:4px 8px;border:1px solid #e2e8f0;border-radius:4px;font-size:12px" oninput="_ppCalc()"></div><div><label style="font-size:10px;font-weight:700">Giá '+n+'</label><input type="number" class="_pp_price" value="" min="0" style="width:100%;padding:4px 8px;border:1px solid #e2e8f0;border-radius:4px;font-size:12px" oninput="_ppCalc()"></div><div style="display:flex;align-items:flex-end"><button type="button" onclick="this.closest(\'._ppQR\').remove();_ppCalc()" style="background:#fee2e2;color:#dc2626;border:none;border-radius:4px;padding:5px 8px;font-size:11px;cursor:pointer">✕</button></div>';
    c.appendChild(r);
}

async function _dhtLoadColorsPopup(preselect) {
    // Legacy — no longer used for main form, kept for compatibility
}

function _dhtSavePhieu(idx) {
    var existing = _dhtCreate.phieuItems[idx] || {};
    var po=_dhtCreate.phieuOpts||{};
    var sale=document.getElementById('_pp_sale')?.value;
    var prod=document.getElementById('_pp_product')?.value;
    var pat=document.getElementById('_pp_pattern')?.value;
    var vp=Number(document.getElementById('_pp_vat')?.value)||0;
    if(!sale){showToast('Chọn Bán/Quà','error');return;}
    if(!(po.sale_types||[]).some(function(o){return o.name===sale;})){showToast('Bán/Quà không hợp lệ — chọn từ danh sách','error');return;}
    if(!prod){showToast('Chọn Sản Phẩm','error');return;}
    if(!pat){showToast('Chọn Thông Số Mẫu Áo','error');return;}
    // Collect material/color pairs from searchable inputs
    var matInputs=document.querySelectorAll('[id^="_ppMatVal"]');
    var pairs=[];
    for(var pi=0;pi<matInputs.length;pi++){
        var mVal=matInputs[pi].value;
        var mName=document.getElementById('_ppMat'+pi)?.value||'';
        var cVal=document.getElementById('_ppColorVal'+pi)?.value||'';
        var cName=document.getElementById('_ppColor'+pi)?.value||'';
        if(!mVal||!mName){showToast('Chọn Chất Liệu '+(pi+1)+' từ danh sách','error');return;}
        if(!cVal||!cName){showToast('Chọn Màu '+(pi+1)+' từ danh sách','error');return;}
        pairs.push({material_id:Number(mVal),material_name:mName,color_id:Number(cVal),color_name:cName});
    }
    if(pairs.length===0){showToast('Chọn Chất Liệu và Màu','error');return;}
    var qs=document.querySelectorAll('#_pp_qtyRows ._pp_qty'), ps=document.querySelectorAll('#_pp_qtyRows ._pp_price');
    var qtyPairs=[], raw=0;
    for(var i=0;i<qs.length;i++){var qv=Number(qs[i].value)||0,pv=Number(ps[i].value)||0;qtyPairs.push({qty:qv,price:pv,subtotal:qv*pv});raw+=qv*pv;}
    if(!qtyPairs.length||qtyPairs[0].qty===0){showToast('SL1 phải > 0','error');return;}
    var va=Math.round(raw*vp/100);
    var sewArr = (window._ppSewItems || []).slice();
    var extArr=Array.from(document.getElementById('_pp_extraMat')?.selectedOptions||[]).map(function(o){return o.value;});
    // Nhắc nhở: order-level, get from _dhtCreate.reminders
    var nnArr=(_dhtCreate.reminders||[]).slice();
    var acctNotes=nnArr.join(' | ');
    // Backward compat: first pair = main material/color
    var mainPair=pairs[0];
    // Build display name for color (all pairs)
    var colorDisplay=pairs.map(function(p){return p.color_name;}).join('+');
    var matDisplay=pairs.map(function(p){return p.material_name;}).join('+');
    _dhtCreate.phieuItems[idx]={id:existing.id||null,sale_type:sale,product_name:prod,material_id:mainPair.material_id,material_name:matDisplay,color_id:mainPair.color_id,color_name:colorDisplay,pattern_name:pat,material_pairs:pairs,sewing_techniques:sewArr,reminders:nnArr,accounting_notes:acctNotes,extra_materials:extArr,quantities:qtyPairs,vat_percent:vp,vat_amount:va,raw_total:raw,item_total:raw+va,quantity:qtyPairs.reduce(function(s,x){return s+x.qty;},0),unit_price:qtyPairs[0]?.price||0};
    document.getElementById('_phieuPopup')?.remove();
    _dhtRenderPhieuRows(); _dhtCalcTotal();
    showToast('✅ Đã lưu Phiếu #'+(idx+1));
}

function _dhtRenderPhieuRows() {
    var c = document.getElementById('_co_items'); if (!c) return; c.innerHTML='';
    _dhtCreate.phieuItems.forEach(function(p,i){
        if(!p) return;
        var isFree = !p.material_pairs || p.material_pairs.length === 0;
        var d=document.createElement('div');
        d.style.cssText='display:grid;grid-template-columns:2fr 70px 100px 50px 100px 30px;gap:6px;margin-bottom:6px;align-items:center;padding:8px 10px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;cursor:pointer;font-size:12px;transition:all .15s';
        d.onmouseover=function(){this.style.background='#dbeafe';this.style.borderColor='#3b82f6';};
        d.onmouseout=function(){this.style.background='#f8fafc';this.style.borderColor='#e2e8f0';};
        d.onclick=function(e){if(e.target.tagName==='BUTTON')return; isFree ? _dhtAddItemFree(i) : _dhtAddItem(i);};
        var vl=p.vat_percent?'+'+p.vat_percent+'%':'';
        var delBtn = (window._dhtEditRestricted && _dhtCreate.editMode)
            ? ''
            : '<button onclick="event.stopPropagation();_dhtCreate.phieuItems.splice('+i+',1);_dhtRenderPhieuRows();_dhtCalcTotal()" style="background:#fee2e2;color:#dc2626;border:none;border-radius:4px;cursor:pointer;font-size:11px;height:24px">✕</button>';
        
        var catSel = document.getElementById('_co_cat');
        var catName = catSel ? (catSel.options[catSel.selectedIndex]?.text || '') : '';
        if (catName !== 'PET' && catName !== 'TEM') {
            catName = 'PET/TEM';
        }

        var label = isFree
            ? '🐾 Phiếu ' + catName + ' #'+(i+1)+' — '+p.product_name
            : '📋 #'+(i+1)+' '+p.product_name+' <span style="font-size:10px;color:#6b7280">('+p.material_name+'/'+p.color_name+')</span>';
        d.innerHTML='<div style="font-weight:700;color:var(--navy)">'+label+'</div>'
            +'<div style="text-align:center;font-weight:700">SL:'+p.quantity+'</div>'
            +'<div style="text-align:right">'+p.raw_total.toLocaleString('vi-VN')+'đ</div>'
            +'<div style="text-align:center;font-size:10px;color:#b8860b;font-weight:700">'+vl+'</div>'
            +'<div style="text-align:right;font-weight:800;color:#059669">'+p.item_total.toLocaleString('vi-VN')+'đ</div>'
            +delBtn;
        c.appendChild(d);
    });
}

function _dhtCalcTotal() {
    var gRaw=0,gVat=0;
    _dhtCreate.phieuItems.forEach(function(p){if(!p)return;gRaw+=p.raw_total||0;gVat+=p.vat_amount||0;});
    // Add surcharges to total
    var surTotal=0;
    (_dhtCreate.surcharges||[]).forEach(function(s){surTotal+=Number(s.amount)||0;});
    gRaw+=surTotal;
    var addVat = Number(document.getElementById('_co_additionalVat')?.value) || 0;
    var finalVat = gVat + addVat;
    var depAmt = _dhtCreate.depositAmount || 0;
    var gTotal=gRaw+finalVat, remain=gTotal-depAmt;
    var depEl = document.getElementById('_co_deposit');
    if (depEl) depEl.value = depAmt.toLocaleString('vi-VN') + 'đ';
    document.getElementById('_co_total').value=(gRaw-surTotal).toLocaleString('vi-VN')+'đ';
    var surEl=document.getElementById('_co_surTotal');
    if(surEl) surEl.value=surTotal.toLocaleString('vi-VN')+'đ';
    document.getElementById('_co_totalVatAmt').value=finalVat.toLocaleString('vi-VN')+'đ';
    document.getElementById('_co_totalVat').value=gTotal.toLocaleString('vi-VN')+'đ';
    var remainEl = document.getElementById('_co_remain');
    if (remainEl) {
        remainEl.value = remain.toLocaleString('vi-VN') + 'đ';
        if (remain < 0) {
            remainEl.style.color = '#dc2626';
            remainEl.style.fontWeight = '900';
            remainEl.style.background = '#fef2f2';
            remainEl.style.border = '2px solid #dc2626';
        } else {
            remainEl.style.color = '#dc2626';
            remainEl.style.fontWeight = '800';
            remainEl.style.background = '#f1f5f9';
            remainEl.style.border = '';
        }
    }
}

// === SURCHARGE FUNCTIONS ===
function _dhtAddSurcharge() {
    _dhtCreate.surcharges.push({ description: '', amount: 0 });
    _dhtRenderSurcharges();
}
function _dhtRemoveSurcharge(idx) {
    _dhtCreate.surcharges.splice(idx, 1);
    _dhtRenderSurcharges();
    _dhtCalcTotal();
}
function _dhtSurchargeChange() {
    var rows = document.querySelectorAll('._surRow');
    _dhtCreate.surcharges = [];
    rows.forEach(function(row) {
        var desc = row.querySelector('._surDesc')?.value || '';
        var amt = Number(row.querySelector('._surAmt')?.value) || 0;
        _dhtCreate.surcharges.push({ description: desc, amount: amt });
    });
    _dhtCalcTotal();
}
function _dhtRenderSurcharges() {
    var c = document.getElementById('_co_surcharges'); if (!c) return;
    if (_dhtCreate.surcharges.length === 0) {
        c.innerHTML = '<div style="font-size:11px;color:#94a3b8;text-align:center;padding:4px">Chưa có phụ phí</div>';
        return;
    }
    var h = '';
    _dhtCreate.surcharges.forEach(function(s, i) {
        var isOldSurcharge = (window._dhtEditRestricted && _dhtCreate.editMode && i < (_dhtCreate.originalSurchargeCount || 0));
        var delBtn = (window._dhtEditRestricted && _dhtCreate.editMode)
            ? ''
            : '<button type="button" onclick="_dhtRemoveSurcharge(' + i + ')" style="background:#fee2e2;color:#dc2626;border:none;border-radius:4px;cursor:pointer;font-size:11px;height:26px;width:26px;display:flex;align-items:center;justify-content:center">✕</button>';
        var gridCols = delBtn ? '1fr 120px 30px' : '1fr 120px';
        var lockedStyle = isOldSurcharge ? 'background:#f1f5f9;color:#64748b;cursor:not-allowed;' : '';
        h += '<div class="_surRow" style="display:grid;grid-template-columns:'+gridCols+';gap:6px;margin-bottom:4px;align-items:center">'
            + '<input class="_surDesc" type="text" value="' + (s.description || '').replace(/"/g, '&quot;') + '" placeholder="Nội dung phụ phí" oninput="_dhtSurchargeChange()" style="padding:5px 8px;border:1px solid #e2e8f0;border-radius:5px;font-size:11px;'+lockedStyle+'"' + (isOldSurcharge ? ' disabled title="🔒 Không thể sửa phụ phí cũ"' : '') + '>'
            + '<input class="_surAmt" type="number" value="' + (s.amount || 0) + '" min="0" placeholder="Số tiền" oninput="_dhtSurchargeChange()" style="padding:5px 8px;border:1px solid #e2e8f0;border-radius:5px;font-size:11px;text-align:right;'+lockedStyle+'"' + (isOldSurcharge ? ' disabled title="🔒 Không thể sửa phụ phí cũ"' : '') + '>'
            + delBtn
            + '</div>';
    });
    c.innerHTML = h;
}



// === Submit Order ===
async function _dhtSubmitCreateV2() {
    var cat = _dhtRepairData ? String(_dhtRepairData.catId) : (document.getElementById('_co_cat')?.value);
    var phone = document.getElementById('_co_phone')?.value?.trim();
    var name = document.getElementById('_co_name')?.value?.trim();
    var addr = document.getElementById('_co_addr')?.value?.trim();
    var prov = document.getElementById('_co_prov')?.value;
    var shipDate = document.getElementById('_co_shipDate')?.value;
    var carrier = document.getElementById('_co_carrier')?.value;
    if (!cat) { showToast('Chọn Lĩnh Vực', 'error'); return; }

    // ★ Determine free vs normal mode
    var catSel = document.getElementById('_co_cat');
    var catName = catSel ? (catSel.options[catSel.selectedIndex]?.text || '') : '';
    var isFree = _dhtFreeMode || (catName === 'PET' || catName === 'TEM') || !!_dhtRepairData;

    // ★ Source: different for free vs normal vs repair
    var src;
    if (_dhtRepairData) {
        // Repair: parent order's source (disabled selects may return empty)
        src = _dhtRepairData.order.source || document.getElementById('_co_srcFreeSelect')?.value || document.getElementById('_co_src')?.value;
    } else if (isFree) {
        src = document.getElementById('_co_srcFreeSelect')?.value;
        if (!src) { showToast('Chọn Nguồn ' + catName, 'error'); return; }
    } else {
        src = document.getElementById('_co_src')?.value;
    }

    var custId;
    if (isFree) {
        custId = null;
    } else {
        custId = document.getElementById('_co_custId')?.value;
        if (!_dhtCreate.orderCode) { showToast('Vui lòng chọn mã đơn từ CRM', 'error'); return; }
        if (!custId) { showToast('Vui lòng chọn mã đơn để tự điền khách hàng', 'error'); return; }
    }

    if (!phone) { showToast('Nhập Số Điện Thoại', 'error'); return; }
    if (!name) { showToast('Nhập Tên Khách Hàng', 'error'); return; }
    if (!addr) { showToast('Nhập Địa Chỉ', 'error'); return; }
    if (!prov || _dhtProvinces.indexOf(prov) === -1) { showToast('Tỉnh/Thành Phố không hợp lệ — vui lòng chọn từ danh sách', 'error'); return; }
    if (!isFree && !src) { showToast('Chưa có Nguồn (chọn KH để tự điền)', 'error'); return; }
    var desVal = _dhtRepairData ? 'old_design' : (document.getElementById('_co_designer')?.value);
    if (!desVal) { showToast('Chọn Thiết Kế', 'error'); return; }
    if (!shipDate) { showToast('Chọn Ngày Gửi Dự Kiến', 'error'); return; }
    if (!carrier) { showToast('Chọn Nhà Vận Chuyển', 'error'); return; }
    var saleNote = document.getElementById('_co_saleNote')?.value?.trim();
    if (!saleNote) { showToast('📝 Nhập Nội Dung Sale Dặn Kế Toán Gửi Hàng', 'error'); return; }
    var carrierExtra = _dhtGetCarrierExtra();
    if (carrierExtra === false) return;
    var pri = document.getElementById('_co_pri')?.value || 'CHUẨN';
    if (pri === 'CHUẨN') {
        var dH = document.getElementById('_co_deliveryHour')?.value;
        var dM = document.getElementById('_co_deliveryMin')?.value;
        if (!dH || dH === '') { showToast('⏰ Chọn Giờ Yêu Cầu Chuẩn Hàng Ra', 'error'); return; }
        if (dM === undefined || dM === null || dM === '') { showToast('⏰ Chọn Phút Yêu Cầu Chuẩn Hàng Ra', 'error'); return; }
        if (!_dhtProofBase64) {
            showToast('📸 Vui lòng dán ảnh chứng minh Tiêu Chuẩn CHUẨN (Ctrl+V)', 'error');
            document.getElementById('_co_proofZone')?.focus();
            return;
        }
    }

    var items = _dhtCreate.phieuItems || [];
    if (items.length === 0) { showToast('Thêm ít nhất 1 phiếu đơn hàng', 'error'); return; }
    
    // Final check for PET: no "Tờ" product allowed
    if (catName === 'PET') {
        var hasTo = items.some(function(item) {
            return item && item.product_name === 'Tờ';
        });
        if (hasTo) {
            showToast('⛔ Đơn hàng PET không được phép chứa sản phẩm dạng "Tờ". Vui lòng kiểm tra lại!', 'error');
            return;
        }
    }

    var additionalVat = Number(document.getElementById('_co_additionalVat')?.value) || 0;
    var _totalAmt = 0, _totalVat = 0;
    items.forEach(function(p) { _totalAmt += p.raw_total || 0; _totalVat += p.vat_amount || 0; });
    (_dhtCreate.surcharges||[]).forEach(function(s) { _totalAmt += Number(s.amount) || 0; });
    var _depAmt = _dhtCreate.depositAmount || 0;
    var _remain = (_totalAmt + _totalVat + additionalVat) - _depAmt;
    if (_remain < 0) { showToast('⛔ Số tiền Còn Lại không được âm! Tổng đơn (' + (_totalAmt + _totalVat + additionalVat).toLocaleString('vi-VN') + 'đ) nhỏ hơn tiền cọc (' + _depAmt.toLocaleString('vi-VN') + 'đ)', 'error'); return; }
    var totalAmt = 0, totalVatAmt = 0;
    items.forEach(function(p) { totalAmt += p.raw_total || 0; totalVatAmt += p.vat_amount || 0; });
    var hasVat = (totalVatAmt > 0 || additionalVat > 0);
    var vatAmt = totalVatAmt + additionalVat;
    var desVal2 = _dhtRepairData ? 'old_design' : (document.getElementById('_co_designer')?.value);
    var desType = desVal2 === 'old_design' ? 'old_design' : 'staff';
    var desId = desVal2 === 'old_design' ? null : (desVal2 || null);

    // Check if phone action toggle is needed
    var phoneActionEl = document.getElementById('_co_phoneAction');
    if (phoneActionEl && phoneActionEl.style.display !== 'none' && !_dhtPhoneAction) {
        showToast('⚠️ Chọn hành động: Đổi SĐT cho KH cũ hay Tạo KH mới', 'error');
        return;
    }

    var payload = {
        order_date: vnDateStr(),
        category_id: cat,
        customer_name: name,
        customer_phone: phone,
        source: src,
        province: prov,
        address: addr,
        cskh_user_id: _dhtCreate.myInfo?.id,
        total_quantity: items.reduce(function(s,x){ return s + x.quantity; }, 0),
        total_amount: totalAmt + vatAmt + (_dhtCreate.surcharges||[]).reduce(function(s,x){return s+(Number(x.amount)||0);},0),
        discount_amount: 0,
        surcharges: _dhtCreate.surcharges || [],
        has_vat: hasVat,
        vat_amount: vatAmt,
        additional_vat_amount: additionalVat,
        deposit_payment_id: _dhtCreate.depositId,
        deposit_amount: _dhtCreate.depositAmount || 0,
        designer_user_id: desId,
        designer_type: desType,
        carrier_id: carrier,
        carrier_extra: carrierExtra,
        expected_ship_date: shipDate,
        shipping_priority: pri,
        standard_delivery_time: pri === 'CHUẨN' ? ((document.getElementById('_co_deliveryHour')?.value || '00') + ':' + (document.getElementById('_co_deliveryMin')?.value || '00')) : null,
        standard_proof_image: pri === 'CHUẨN' ? _dhtProofBase64 : null,
        zalo_oa_sent: document.getElementById('_co_zalo')?.value === '1',
        sale_note_for_accountant: saleNote || null,
        free_customer_id: _dhtSelectedCustId || null,
        free_customer_action: _dhtPhoneAction || null,
        department_id: _dhtCreate.myInfo?.department_id,
        items: items
    };
    // ★ Normal: send order_code + customer_id
    if (!isFree) {
        payload.order_code = _dhtCreate.orderCode;
        payload.customer_id = custId;
    }
    // ★ Repair: send repair fields + order_code
    if (_dhtRepairData) {
        payload.is_repair = true;
        payload.parent_order_id = _dhtRepairData.parentId;
        payload.repair_source_code = _dhtRepairData.parentCode;
        payload.category_id = _dhtRepairData.catId;
        payload.order_code = _dhtCreate.orderCode;
    }

    var data = await apiCall('/api/dht/orders', 'POST', payload);

    if (data.success) {
        if (_dhtCreate.depositId) {
            await apiCall('/api/dht/lock-deposit/' + _dhtCreate.depositId, 'PUT');
        }
        var generatedCode = data.order?.order_code || '';
        showToast('✅ ' + (_dhtRepairData ? 'Đã tạo đơn sửa! Mã: ' + generatedCode : 'Đã tạo đơn thành công!' + (isFree ? ' Mã: ' + generatedCode : '')));
        _dhtCreate = { step: 1, depositId: null, depositAmount: 0, depositCode: '', myInfo: null, surcharges: [], reminders: [], editMode: false, editOrderId: null, editData: null };
        _dhtFreeMode = false;
        _dhtRepairData = null;
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
    // Auto-select if exact match typed
    if (matches.length === 1 && matches[0].toLowerCase() === q) {
        input.value = matches[0];
        input.style.borderColor = '#10b981';
        list.style.display = 'none'; return;
    }
    if (matches.length === 0) {
        list.innerHTML = '<div style="padding:10px 12px;text-align:center;font-size:11px;color:#dc2626;font-weight:600">❌ Không tìm thấy tỉnh/TP</div>';
        list.style.display = 'block';
        input.style.borderColor = '#ef4444';
        return;
    }
    input.style.borderColor = '#daa520';
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
    if (input) { input.value = val; input.style.borderColor = '#10b981'; }
    var list = document.getElementById('_co_provList');
    if (list) list.style.display = 'none';
}

// ★ Validate on blur: only allow values from _dhtProvinces list
function _dhtValidateProvince() {
    var input = document.getElementById('_co_prov');
    if (!input) return;
    var val = (input.value || '').trim();
    if (!val) { input.style.borderColor = ''; return; }
    // Case-insensitive match
    var found = _dhtProvinces.find(function(p) { return p.toLowerCase() === val.toLowerCase(); });
    if (found) {
        input.value = found; // normalize casing
        input.style.borderColor = '#10b981';
    } else {
        showToast('⚠️ "' + val + '" không hợp lệ — chọn tỉnh/TP từ danh sách', 'error');
        input.value = '';
        input.style.borderColor = '#ef4444';
        setTimeout(function() { input.focus(); }, 100);
    }
}

// Close province dropdown when clicking outside + validate
document.addEventListener('click', function(e) {
    var list = document.getElementById('_co_provList');
    var input = document.getElementById('_co_prov');
    if (list && input && !input.contains(e.target) && !list.contains(e.target)) {
        list.style.display = 'none';
        _dhtValidateProvince();
    }
});

// ========== NHẮC NHỞ TAG SYSTEM ==========
function _ppAddNN() {
    var list = window._ppNNAllList || [];
    if (list.length === 0) { showToast('Chưa có nhắc nhở nào được cài đặt', 'error'); return; }

    // Collect distinct departments
    var deptSet = {};
    list.forEach(function(item) {
        (item.departments || '').split(',').forEach(function(d) {
            d = d.trim(); if (d) deptSet[d] = true;
        });
    });
    var depts = Object.keys(deptSet).sort();
    if (depts.length === 0) { depts = ['CHUNG']; }

    // Step 1: Show department picker
    var picker = document.getElementById('_ppNNPicker');
    if (picker) picker.remove();
    picker = document.createElement('div');
    picker.id = '_ppNNPicker';
    picker.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.3);z-index:10000;display:flex;align-items:center;justify-content:center';

    var h = '<div style="background:#fff;border-radius:10px;padding:16px;width:360px;box-shadow:0 8px 32px rgba(0,0,0,0.2)">'
        + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><span style="font-weight:800;font-size:13px;color:#92400e">🔔 Bước 1: Chọn Bộ Phận</span>'
        + '<button onclick="document.getElementById(\'_ppNNPicker\').remove()" style="background:none;border:none;font-size:16px;cursor:pointer;color:#94a3b8">✕</button></div>'
        + '<div style="display:flex;flex-wrap:wrap;gap:6px">';
    depts.forEach(function(d) {
        h += '<button onclick="_ppNNStep2(\'' + d.replace(/'/g, "\\'") + '\')" style="background:linear-gradient(135deg,#1d4ed8,#2563eb);color:#fff;border:none;padding:8px 16px;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer">' + d + '</button>';
    });
    h += '</div></div>';
    picker.innerHTML = h;
    document.body.appendChild(picker);
}

function _ppNNStep2(dept) {
    var list = window._ppNNAllList || [];
    var tags = window._ppNNTags || [];
    // Filter by department + not already added
    var available = list.filter(function(item) {
        var label = dept + ': ' + item.content;
        if (tags.indexOf(label) >= 0) return false;
        if (!item.departments) return true;
        return item.departments.indexOf(dept) >= 0;
    });
    if (available.length === 0) {
        showToast('Không còn nhắc nhở nào cho ' + dept, 'error');
        document.getElementById('_ppNNPicker')?.remove();
        return;
    }

    var picker = document.getElementById('_ppNNPicker');
    var inner = picker.querySelector('div');
    var h = '<div style="background:#fff;border-radius:10px;padding:16px;width:400px;max-height:50vh;box-shadow:0 8px 32px rgba(0,0,0,0.2)">'
        + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">'
        + '<div><button onclick="_ppAddNN()" style="background:none;border:none;font-size:12px;cursor:pointer;color:#64748b;margin-right:6px">← Quay lại</button>'
        + '<span style="font-weight:800;font-size:13px;color:#1d4ed8">' + dept + '</span></div>'
        + '<button onclick="document.getElementById(\'_ppNNPicker\').remove()" style="background:none;border:none;font-size:16px;cursor:pointer;color:#94a3b8">✕</button></div>'
        + '<div style="max-height:300px;overflow-y:auto">';
    available.forEach(function(item) {
        var label = dept + ': ' + item.content;
        h += '<div onclick="_ppPickNNItem(\'' + label.replace(/'/g, "\\'") + '\')" style="padding:10px 12px;cursor:pointer;border-bottom:1px solid #f1f5f9;font-size:12px;font-weight:600" onmouseover="this.style.background=\'#fef3c7\'" onmouseout="this.style.background=\'\'">'
            + item.content + '</div>';
    });
    h += '</div></div>';
    picker.innerHTML = h;
}

function _ppPickNNItem(label) {
    window._ppNNTags = window._ppNNTags || [];
    window._ppNNTags.push(label);
    _dhtCreate.reminders = window._ppNNTags.slice();
    document.getElementById('_ppNNPicker')?.remove();
    _ppRenderNNTags();
    showToast('✅ Đã thêm nhắc nhở');
}

function _ppRemoveNNTag(idx) {
    (window._ppNNTags || []).splice(idx, 1);
    _dhtCreate.reminders = (window._ppNNTags || []).slice();
    _ppRenderNNTags();
}

function _ppRenderNNTags() {
    var tags = window._ppNNTags || [];
    var el = document.getElementById('_ppNNTags'); if (!el) return;
    if (tags.length === 0) { el.innerHTML = '<span style="font-size:10px;color:#9ca3af;font-style:italic">Chưa có nhắc nhở</span>'; return; }
    el.innerHTML = tags.map(function(t, i) {
        var delBtn = (window._dhtEditRestricted && _dhtCreate.editMode)
            ? ''
            : ' <button onclick=\"_ppRemoveNNTag(' + i + ')\" style=\"background:none;border:none;color:#92400e;cursor:pointer;font-size:12px;padding:0;line-height:1\">✕</button>';
        return '<span style=\"display:inline-flex;align-items:center;gap:4px;background:#fef3c7;color:#92400e;padding:3px 8px;border-radius:4px;font-size:10px;font-weight:700\">'
            + t + delBtn + '</span>';
    }).join('');
}

// ========== BGM PICKER FOR DHT PHIEU ==========
function _ppRenderSewTags() {
    var el = document.getElementById('_ppSewTags'); if (!el) return;
    var items = window._ppSewItems || [];
    if (items.length === 0) { el.innerHTML = '<span style="font-size:10px;color:#9ca3af;font-style:italic">Chưa chọn</span>'; return; }
    el.innerHTML = items.map(function(s, i) {
        var label = typeof s === 'string' ? s : (s.name + (s.qty > 1 ? ' x'+s.qty : ''));
        var removeBtn = window._dhtPhieuRestricted
            ? ''
            : ' <button type="button" onclick="_ppRemoveSew(' + i + ')" style="background:none;border:none;color:#fde68a;cursor:pointer;font-size:11px;padding:0">&times;</button>';
        return '<span style="display:inline-flex;align-items:center;gap:3px;background:#6366f1;color:#fff;padding:2px 6px;border-radius:3px;font-size:9px;font-weight:700">'
            + label + removeBtn + '</span>';
    }).join('');
}

function _ppRemoveSew(idx) {
    (window._ppSewItems || []).splice(idx, 1);
    _ppRenderSewTags();
}

async function _ppOpenBgmPicker() {
    var res = await apiCall('/api/bgm/dropdown');
    var allItems = res.items || [];
    var groups = {};
    allItems.forEach(function(item) {
        if (!groups[item.group_name]) groups[item.group_name] = [];
        groups[item.group_name].push(item);
    });
    var existing = window._ppSewItems || [];
    var existIds = existing.map(function(s) { return typeof s === 'object' ? s.id : null; });
    var h = '<div style="max-height:50vh;overflow-y:auto">';
    Object.keys(groups).sort().forEach(function(gName) {
        h += '<div style="margin-bottom:8px"><div style="font-weight:800;font-size:10px;color:#1d4ed8;padding:3px 6px;background:#dbeafe;border-radius:3px;margin-bottom:3px">' + gName + '</div>';
        groups[gName].forEach(function(item) {
            var checked = existIds.indexOf(item.id) >= 0;
            var existItem = checked ? existing.find(function(s){return s.id===item.id;}) : null;
            var qtyVal = existItem ? (existItem.qty || 1) : 1;
            var _canSeePrice = typeof currentUser !== 'undefined' && currentUser && ['giam_doc','quan_ly_cap_cao','quan_ly_xuong'].indexOf(currentUser.role) >= 0;
            var qtyInput = (item.add_type === 'multi' && _canSeePrice)
                ? '<input type="number" class="_ppBgmQty" data-id="' + item.id + '" value="' + qtyVal + '" min="1" style="width:40px;padding:1px 3px;border:1px solid #e2e8f0;border-radius:3px;font-size:10px;text-align:center">'
                : '';
            h += '<label style="display:flex;align-items:center;gap:4px;padding:3px 6px;font-size:10px;cursor:pointer" onmouseover="this.style.background=\'#f0fdf4\'" onmouseout="this.style.background=\'\'">'
                + '<input type="checkbox" class="_ppBgmCb" data-id="' + item.id + '" data-name="' + item.name + '" data-fp="' + item.factory_price + '" data-pp="' + item.processing_price + '" data-type="' + item.add_type + '"' + (checked ? ' checked' : '') + '>'
                + '<span style="flex:1;font-weight:600">' + item.name + '</span>' + qtyInput
                + (_canSeePrice ? '<span style="color:#059669;font-size:9px;font-weight:700">' + Number(item.factory_price).toLocaleString('vi-VN') + '</span>' : '')
                + '</label>';
        });
        h += '</div>';
    });
    h += '</div>';

    // Use a sub-overlay inside the phieuPopup
    var ov2 = document.createElement('div');
    ov2.id = '_ppBgmOv';
    ov2.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.4);z-index:10001;display:flex;align-items:center;justify-content:center';
    ov2.innerHTML = '<div style="background:#fff;border-radius:10px;padding:16px;width:420px;max-height:70vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,0.25)">'
        + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><span style="font-weight:800;font-size:13px;color:#6366f1">✂️ Chọn Chi Tiết May Thêm</span><button type="button" onclick="document.getElementById(\'_ppBgmOv\').remove()" style="background:none;border:none;font-size:16px;cursor:pointer">✕</button></div>'
        + h
        + '<div style="text-align:right;margin-top:8px"><button type="button" onclick="document.getElementById(\'_ppBgmOv\').remove()" style="background:#e2e8f0;border:none;padding:5px 14px;border-radius:4px;font-size:11px;cursor:pointer;margin-right:6px">Hủy</button>'
        + '<button type="button" onclick="_ppApplyBgm()" style="background:#6366f1;color:#fff;border:none;padding:5px 14px;border-radius:4px;font-size:11px;font-weight:700;cursor:pointer">✅ Xác Nhận</button></div></div>';
    document.body.appendChild(ov2);
}

function _ppApplyBgm() {
    var cbs = document.querySelectorAll('._ppBgmCb:checked');
    var items = [];
    cbs.forEach(function(cb) {
        var id = Number(cb.dataset.id);
        var qty = 1;
        if (cb.dataset.type === 'multi') {
            var qtyEl = document.querySelector('._ppBgmQty[data-id="' + id + '"]');
            qty = qtyEl ? Math.max(1, Number(qtyEl.value) || 1) : 1;
        }
        items.push({ id: id, name: cb.dataset.name, qty: qty, fp: Number(cb.dataset.fp), pp: Number(cb.dataset.pp) });
    });
    window._ppSewItems = items;
    document.getElementById('_ppBgmOv')?.remove();
    _ppRenderSewTags();
}

// ========== FULL EDIT ORDER (reuse create form) ==========
async function _dhtEditOrderFull(id) {
    try {
        showToast('⏳ Đang tải dữ liệu...');
        var data = await apiCall('/api/dht/orders/' + id + '/detail');
        if (!data.order) { showToast('Không tìm thấy đơn hàng', 'error'); return; }
        var o = data.order;
        var items = data.items || [];
        var surcharges = data.surcharges || [];

        // Convert DB items → phieuItems format
        var phieuItems = items.map(function(it) {
            var qtyArr = [];
            try { qtyArr = typeof it.quantities === 'string' ? JSON.parse(it.quantities) : (it.quantities || []); } catch(e) { qtyArr = []; }
            if (qtyArr.length === 0) qtyArr = [{ qty: it.quantity || 0, price: it.unit_price || 0 }];
            var matPairs = [];
            try { matPairs = typeof it.material_pairs === 'string' ? JSON.parse(it.material_pairs) : (it.material_pairs || []); } catch(e) { matPairs = []; }
            var sewTech = [];
            try { sewTech = typeof it.sewing_techniques === 'string' ? JSON.parse(it.sewing_techniques) : (it.sewing_techniques || []); } catch(e) { sewTech = []; }
            var extMats = [];
            try { extMats = typeof it.extra_materials === 'string' ? JSON.parse(it.extra_materials) : (it.extra_materials || []); } catch(e) { extMats = []; }
            var reminders = (it.accounting_notes || '').split(' | ').filter(function(x){ return x.trim(); });
            var rawTotal = Number(it.item_total || it.total) || 0;
            var vatPct = 0;
            // Detect VAT from raw vs total
            if (it.unit_price && it.quantity) {
                var base = qtyArr.reduce(function(s, x){ return s + (Number(x.qty)||0)*(Number(x.price)||0); }, 0);
                if (base > 0 && rawTotal > base) vatPct = Math.round((rawTotal - base) / base * 100);
            }
            var vatAmt = vatPct > 0 ? Math.round((rawTotal * vatPct) / (100 + vatPct)) : 0;
            var baseTotal = rawTotal - vatAmt;
            return {
                id: it.id,
                sale_type: it.sale_type || '',
                product_name: it.product_name || it.description || '',
                material_id: it.material_id || null,
                material_name: it.material_name || '',
                color_id: it.color_id || null,
                color_name: it.color_name || '',
                pattern_name: it.pattern_name || '',
                material_pairs: matPairs,
                sewing_techniques: sewTech,
                reminders: reminders,
                accounting_notes: it.accounting_notes || '',
                extra_materials: extMats,
                quantities: qtyArr,
                vat_percent: vatPct,
                vat_amount: vatAmt,
                raw_total: baseTotal,
                item_total: rawTotal,
                quantity: Number(it.quantity) || 0,
                unit_price: Number(it.unit_price) || 0
            };
        });

        // Convert surcharges
        var surchargeItems = surcharges.map(function(s) {
            return { description: s.name || s.description || '', amount: Number(s.amount) || 0 };
        });

        // Fetch deposit amount
        var depAmt = 0;
        try {
            var depRes = await apiCall('/api/dht/deposit-by-order/' + encodeURIComponent(o.order_code));
            depAmt = Number(depRes.total_deposit || 0);
        } catch(e) { depAmt = Number(o.deposit_amount || 0); }

        // Extract order-level reminders from first item (backward compat)
        var orderReminders = [];
        if (phieuItems.length > 0 && phieuItems[0].reminders && phieuItems[0].reminders.length > 0) {
            orderReminders = phieuItems[0].reminders.slice();
        }

        // Set up _dhtCreate for edit mode
        _dhtCreate = {
            step: 2,
            editMode: true,
            editOrderId: id,
            editData: data,
            depositId: o.deposit_payment_id || null,
            depositAmount: depAmt,
            depositCode: o.order_code,
            myInfo: null,
            surcharges: surchargeItems,
            orderCode: o.order_code,
            phieuItems: phieuItems,
            reminders: orderReminders,
            originalPhieuCount: phieuItems.length,
            originalSurchargeCount: surchargeItems.length
        };

        // ★ Detect PET/TEM orders → use free form instead of Đồng Phục form
        var catName = (o.category_name || '').toUpperCase().trim();
        var isPetTem = (catName === 'PET' || catName === 'TEM');

        if (isPetTem) {
            // Open the PET/TEM free form in edit mode
            await _dhtEditOrderFree(o);
        } else {
            // Open the normal Đồng Phục form
            await _dhtGoStep2();
        }
    } catch(e) {
        console.error('Edit order full error:', e);
        showToast('Lỗi tải dữ liệu: ' + (e.message || ''), 'error');
    }
}

// ========== ★ EDIT PET/TEM ORDER — Free Form Edit Mode ==========
async function _dhtEditOrderFree(o) {
    _dhtFreeMode = true;

    var [infoRes, designRes, carrierRes, holidayRes, phieuRes, petSrcRes, temSrcRes, depRes] = await Promise.all([
        apiCall('/api/dht/my-info'),
        apiCall('/api/dht/designers'),
        apiCall('/api/dht/carriers'),
        apiCall('/api/holidays'),
        apiCall('/api/dht/phieu-options'),
        apiCall('/api/dht/pet-sources'),
        apiCall('/api/dht/tem-sources'),
        apiCall('/api/dht/available-deposits')
    ]);

    _dhtCreate.phieuOpts = phieuRes || {};
    _dhtCreate.holidays = {};
    (holidayRes.holidays || []).forEach(function(h) {
        var d = h.holiday_date;
        if (typeof d === 'string') d = d.split('T')[0];
        _dhtCreate.holidays[d] = h.holiday_name;
    });
    _dhtCreate.myInfo = infoRes.user || {};
    var mi = _dhtCreate.myInfo;

    // Only PET & TEM categories
    var freeCats = (_dht.categories || []).filter(function(c) { return c.name === 'PET' || c.name === 'TEM'; });
    var catOpts = freeCats.map(function(c){ return '<option value="'+c.id+'">'+c.name+'</option>'; }).join('');

    var designers = designRes.designers || [];
    var desOpts = '<option value="">-- Chọn --</option><option value="old_design">🎨 Thiết Kế Cũ</option>'
        + designers.map(function(d){ return '<option value="'+d.id+'">'+d.full_name+'</option>'; }).join('');
    var carriers = carrierRes.carriers || [];
    var carOpts = carriers.map(function(c){ return '<option value="'+c.id+'">'+c.name+'</option>'; }).join('');

    var petSrcOpts = (petSrcRes.items || []).map(function(s) { return '<option value="'+s.name+'">'+s.name+'</option>'; }).join('');
    var temSrcOpts = (temSrcRes.items || []).map(function(s) { return '<option value="'+s.name+'">'+s.name+'</option>'; }).join('');

    var _dis = 'background:#f1f5f9;color:#64748b;cursor:not-allowed';
    var _teamName = mi.parent_department_name ? (mi.department_name || 'Không có') : (mi.team_name || 'Không có');

    // Reuse the same free form body from _dhtShowCreateFree
    var body = '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:0">'
        +'<div class="form-group"><label>Tên Nhân Viên</label><input class="form-control" value="'+(mi.full_name||'')+'" disabled style="'+_dis+'"></div>'
        +'<div class="form-group"><label>Phòng Ban</label><input class="form-control" value="'+(mi.phong_ban||mi.department_name||'')+'" disabled style="'+_dis+'"></div>'
        +'<div class="form-group"><label>Team</label><input class="form-control" value="'+_teamName+'" disabled style="'+_dis+'"></div>'
        +'</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
        +'<div class="form-group"><label>Ngày Lên Đơn</label><input class="form-control" value="'+vnDateStr()+'" disabled style="'+_dis+'"></div>'
        +'<div class="form-group"><label>Lĩnh Vực <span style="color:red">*</span></label><select id="_co_cat" class="form-control" onchange="_dhtOnFreeCatSwitch()"><option value="">-- Chọn --</option>'+catOpts+'</select></div>'
        +'<div style="grid-column:span 2"><div class="form-group"><label>Mã Đơn <span style="color:red">*</span></label>'
        +'<input id="_co_codeFreeLabel" class="form-control" disabled value="" style="'+_dis+';font-weight:800;font-size:14px;color:#b8860b;border:2px solid #b8860b;background:#fffbeb"></div></div>'
        +'</div>'
        +'<div id="_co_freeFormFields">'
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
        +'<div class="form-group" style="position:relative;grid-column:span 2"><label style="font-weight:800;color:#166534">① Tên Khách Hàng <span style="color:red">*</span> ✏️ <span style="font-size:10px;font-weight:600;color:#64748b">— Gõ tên để tìm KH cũ hoặc nhập mới</span></label>'
        +'<input id="_co_name" class="form-control" placeholder="🔍 Gõ tên khách hàng..." autocomplete="off" oninput="_dhtNameAutocomplete()" onfocus="_dhtNameAutocomplete()" style="font-size:14px;border:2px solid #059669">'
        +'<div id="_co_nameList" style="display:none;position:absolute;z-index:100;background:#fff;border:1px solid #86efac;border-radius:8px;max-height:200px;overflow-y:auto;width:100%;box-shadow:0 6px 20px rgba(0,0,0,0.12);margin-top:2px"></div></div>'
        +'<div class="form-group" style="position:relative"><label style="font-weight:800;color:#1e40af">② SĐT Khách Hàng <span style="color:red">*</span> ✏️</label>'
        +'<input id="_co_phone" class="form-control" placeholder="Nhập SĐT khách hàng" autocomplete="off" oninput="_dhtPhoneAutocomplete();_dhtCheckPhoneChange()" style="font-size:13px">'
        +'<div id="_co_phoneList" style="display:none;position:absolute;z-index:100;background:#fff;border:1px solid #60a5fa;border-radius:8px;max-height:180px;overflow-y:auto;width:100%;box-shadow:0 6px 20px rgba(0,0,0,0.12);margin-top:2px"></div>'
        +'<div id="_co_phoneAction" style="display:none;margin-top:6px;background:#fffbeb;border:2px solid #f59e0b;border-radius:8px;padding:10px 12px">'
        +'<div style="font-size:11px;font-weight:800;color:#92400e;margin-bottom:8px">⚠️ SĐT đã thay đổi! Chọn hành động: <span style="color:red">*</span></div>'
        +'<div style="display:flex;gap:8px">'
        +'<label style="flex:1;cursor:pointer;padding:8px 10px;border:2px solid #e2e8f0;border-radius:8px;text-align:center;font-size:11px;font-weight:700;transition:all .2s" id="_co_phoneAction_update" onclick="_dhtSetPhoneAction(\'update\')">🔄 Đổi SĐT cho KH cũ</label>'
        +'<label style="flex:1;cursor:pointer;padding:8px 10px;border:2px solid #e2e8f0;border-radius:8px;text-align:center;font-size:11px;font-weight:700;transition:all .2s" id="_co_phoneAction_new" onclick="_dhtSetPhoneAction(\'create_new\')">➕ Tạo KH mới</label>'
        +'</div></div></div>'
        +'<div class="form-group"><label>③ Địa Chỉ <span style="color:red">*</span> ✏️</label><input id="_co_addr" class="form-control" placeholder="Địa chỉ giao hàng"></div>'
        +'<div class="form-group" style="position:relative"><label>③ Tỉnh, Thành Phố <span style="color:red">*</span> ✏️</label>'
        +'<input id="_co_prov" class="form-control" placeholder="Gõ để tìm tỉnh/TP..." autocomplete="off" oninput="_dhtFilterProvince()" onfocus="_dhtFilterProvince()">'
        +'<div id="_co_provList" style="display:none;position:absolute;z-index:100;background:#fff;border:1px solid #e2e8f0;border-radius:6px;max-height:180px;overflow-y:auto;width:calc(100% - 24px);box-shadow:0 4px 12px rgba(0,0,0,0.1);margin-top:2px"></div></div>'
        +'<div class="form-group"><label>Nguồn <span style="color:red">*</span></label><select id="_co_srcFreeSelect" class="form-control"><option value="">-- Chọn nguồn --</option></select></div>'
        +'<div class="form-group"><label>Thiết Kế <span style="color:red">*</span></label><select id="_co_designer" class="form-control">'+desOpts+'</select></div>'
        +'</div>'
        +'<div style="margin:12px 0;border-top:1px solid #e2e8f0;padding-top:12px">'
        +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">'
        +'<span style="font-weight:800;font-size:13px;color:var(--navy)">📋 Phiếu Đơn Hàng</span>'
        +'<button onclick="_dhtAddItemFree()" style="background:#059669;color:#fff;border:none;padding:4px 14px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer">➕ Thêm Phiếu</button></div>'
        +'<div id="_co_items"></div></div>'
        +'<div style="margin:10px 0;background:linear-gradient(135deg,#f0fdf4,#ecfdf5);border:1px solid #86efac;border-radius:10px;padding:12px">'
        +'<label style="font-weight:800;font-size:12px;color:#166534;margin-bottom:6px;display:block">💰 Chọn Mã Cọc (tùy chọn) <span style="font-size:10px;color:#64748b;font-weight:600">— từ Sổ Ghi Nhận Tiền</span></label>'
        +'<div style="position:relative"><input id="_co_depSearch" class="form-control" placeholder="🔍 Gõ mã tiền, số tiền, nội dung CK..." autocomplete="off" oninput="_dhtSearchDeposit()" onfocus="_dhtSearchDeposit()" style="font-size:12px;border:2px solid #059669">'
        +'<div id="_co_depSearchList" style="display:none;position:absolute;z-index:100;background:#fff;border:1px solid #86efac;border-radius:8px;max-height:220px;overflow-y:auto;width:100%;box-shadow:0 6px 20px rgba(0,0,0,0.12);margin-top:2px"></div></div>'
        +'<div id="_co_depSelected" style="display:none;margin-top:6px;background:#fff;border:1px solid #86efac;border-radius:6px;padding:8px 10px;font-size:12px;color:#166534;font-weight:600"></div>'
        +'</div>'
        +'<div style="margin:10px 0;border:1px dashed #e2e8f0;border-radius:8px;padding:10px 12px;background:#fffbeb">'
        +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">'
        +'<span style="font-weight:800;font-size:12px;color:#92400e">Thêm Phụ Phí</span>'
        +'<button type="button" onclick="_dhtAddSurcharge()" style="background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;border:none;padding:3px 12px;border-radius:5px;font-size:10px;font-weight:700;cursor:pointer">➕ Thêm Phụ Phí</button></div>'
        +'<div id="_co_surcharges"></div></div>'
        +'<div style="background:#f8fafc;border-radius:8px;padding:12px;border:1px solid #e2e8f0">'
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:8px">'
        +'<div class="form-group"><label>Tổng Tiền Hàng</label><input id="_co_total" class="form-control" value="0" disabled style="'+_dis+';font-weight:700"></div>'
        +'<div class="form-group"><label>Tiền Phụ Phí Thêm</label><input id="_co_surTotal" class="form-control" value="0đ" disabled style="'+_dis+';font-weight:700;color:#d97706"></div></div>'
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:8px">'
        +'<div class="form-group"><label style="font-weight:700;color:#6366f1">Số Tiền VAT thêm ✏️</label><input type="number" id="_co_additionalVat" class="form-control" value="" placeholder="0" min="0" oninput="_dhtCalcTotal()" style="font-weight:700;border:2px solid #6366f1"></div>'
        +'<div class="form-group"><label>Tổng VAT</label><input id="_co_totalVatAmt" class="form-control" value="0" disabled style="'+_dis+';font-weight:700;color:#b8860b"></div>'
        +'</div>'
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:8px">'
        +'<div class="form-group"><label>Tổng Sau VAT</label><input id="_co_totalVat" class="form-control" value="0" disabled style="'+_dis+';font-weight:800;color:#059669"></div>'
        +'<div class="form-group"><label>Đã Cọc</label><input id="_co_deposit" class="form-control" value="0đ" disabled style="'+_dis+';font-weight:700;color:#059669"></div>'
        +'</div>'
        +'<div style="display:grid;grid-template-columns:1fr;gap:10px">'
        +'<div class="form-group"><label>Còn Lại</label><input id="_co_remain" class="form-control" value="0" disabled style="'+_dis+';font-weight:800;color:#dc2626"></div>'
        +'</div></div>'
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px">'
        +'<div class="form-group"><label>Ngày Gửi Hàng <span style="color:red">*</span></label><input type="date" id="_co_shipDate" class="form-control" min="'+vnDateStr()+'" onchange="_dhtValidateShipDate()"></div>'
        +'<div class="form-group"><label>Tiêu Chuẩn Gửi</label><select id="_co_pri" class="form-control"><option selected>GẤP</option><option>GỬI</option></select></div></div>'
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:6px">'
        +'<div class="form-group"><label>Nhà Vận Chuyển <span style="color:red">*</span></label><select id="_co_carrier" class="form-control" onchange="_dhtOnCarrierChange()"><option value="">-- Chọn --</option>'+carOpts+'</select></div>'
        +'<div class="form-group"><label>Gửi Zalo OA</label><select id="_co_zalo" class="form-control"><option value="1">✅ Gửi Zalo OA</option><option value="0">Không gửi</option></select></div></div>'
        +'<div id="_co_carrierExtra" style="display:none;margin-top:8px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:12px"></div>'
        +'<div class="form-group" style="margin-top:10px"><label style="font-weight:700;color:#1e293b">📝 Nội Dung Sale Dặn Kế Toán Gửi Hàng <span style="color:red">*</span></label>'
        +'<textarea id="_co_saleNote" class="form-control" rows="2" placeholder="Nhập nội dung dặn kế toán gửi hàng..." style="font-size:12px;resize:vertical;border:2px solid #f59e0b"></textarea></div>'
        +'<div id="_co_depositInfo" style="background:#fffbeb;border-radius:6px;padding:8px 12px;margin-top:8px;font-size:12px;color:#b8860b;font-weight:600">💰 Không cọc</div>'
        +'</div>';

    var footer = '<button class="btn btn-secondary" onclick="_dhtCancelCreate()">← Hủy</button>'
        +'<button class="btn" onclick="_dhtSubmitEditV2()" style="background:linear-gradient(135deg,#059669,#10b981);color:#fff;border:none;padding:8px 24px;border-radius:8px;font-weight:800">💾 Cập Nhật Đơn</button>';

    openModal('✏️ Sửa Đơn ' + _dhtCreate.orderCode, body, footer);

    _dhtCreate._allDeposits = depRes.deposits || depRes || [];

    // Init NN tags from order-level reminders
    window._ppNNTags = (_dhtCreate.reminders || []).slice();
    _ppRenderNNTags();

    // ★ Pre-fill all fields from edit data
    // Category
    var catSel = document.getElementById('_co_cat');
    if (catSel && o.category_id) catSel.value = o.category_id;

    // Trigger cat switch to load correct sources
    await _dhtOnFreeCatSwitch();

    // Code label
    var codeLbl = document.getElementById('_co_codeFreeLabel');
    if (codeLbl) {
        codeLbl.value = '📋 ' + o.order_code;
        codeLbl.style.color = '#b8860b';
        codeLbl.style.borderColor = '#b8860b';
        codeLbl.style.background = '#fffbeb';
    }

    // Show form fields immediately (already showing since we set display directly)
    var formFields = document.getElementById('_co_freeFormFields');
    if (formFields) formFields.style.display = '';

    // Customer info
    var nameEl = document.getElementById('_co_name');
    var phoneEl = document.getElementById('_co_phone');
    var addrEl = document.getElementById('_co_addr');
    var provEl = document.getElementById('_co_prov');
    if (nameEl) nameEl.value = o.customer_name || '';
    if (phoneEl) { phoneEl.value = o.customer_phone || ''; phoneEl.disabled = false; phoneEl.style.background = '#fff'; phoneEl.style.cursor = 'text'; phoneEl.placeholder = 'Nhập SĐT khách hàng'; }
    if (addrEl) addrEl.value = o.address || '';
    if (provEl) provEl.value = o.province || '';

    // Source — set after cat switch loaded sources
    var srcSelect = document.getElementById('_co_srcFreeSelect');
    if (srcSelect && o.source) {
        // Wait a tick for source dropdown to be populated by _dhtOnFreeCatSwitch
        setTimeout(function() {
            var srcSelect2 = document.getElementById('_co_srcFreeSelect');
            if (srcSelect2) {
                // Check if option exists, if not add it
                var srcFound = false;
                for (var j = 0; j < srcSelect2.options.length; j++) {
                    if (srcSelect2.options[j].value === o.source) { srcFound = true; break; }
                }
                if (!srcFound) {
                    var srcOpt = document.createElement('option');
                    srcOpt.value = o.source;
                    srcOpt.text = o.source;
                    srcSelect2.appendChild(srcOpt);
                }
                srcSelect2.value = o.source;
            }
        }, 300);
    }

    // Designer
    var desSel = document.getElementById('_co_designer');
    if (desSel) {
        if (o.designer_type === 'old_design' || o.designer_type === 'old') desSel.value = 'old_design';
        else if (o.designer_user_id) desSel.value = o.designer_user_id;
    }

    // Shipping priority
    var priSel = document.getElementById('_co_pri');
    if (priSel && o.shipping_priority) priSel.value = o.shipping_priority;

    // Ship date
    var shipInp = document.getElementById('_co_shipDate');
    if (shipInp && o.expected_ship_date) shipInp.value = o.expected_ship_date.split('T')[0];

    // Carrier
    var carSel = document.getElementById('_co_carrier');
    if (carSel && o.carrier_id) carSel.value = o.carrier_id;
    _dhtOnCarrierChange();
    if (o.carrier_extra) {
        var ce = typeof o.carrier_extra === 'string' ? JSON.parse(o.carrier_extra) : o.carrier_extra;
        if (ce.type === 'nha_xe') {
            var bn = document.getElementById('_co_busName'); if(bn) bn.value = ce.bus_name || '';
            var bp = document.getElementById('_co_busPhone'); if(bp) bp.value = ce.bus_phone || '';
            var bl = document.getElementById('_co_busLocation'); if(bl) bl.value = ce.bus_location || '';
            var bd = document.getElementById('_co_busDestination'); if(bd) bd.value = ce.bus_destination || '';
            var btParts = (ce.bus_departure_time || '').split(':');
            var btH = document.getElementById('_co_busHour'); if(btH && btParts[0]) btH.value = btParts[0];
            var btM = document.getElementById('_co_busMin'); if(btM && btParts[1]) btM.value = btParts[1];
        } else if (ce.type === 'nguoi_nhan_ho') {
            var pn = document.getElementById('_co_proxyName'); if(pn) pn.value = ce.proxy_name || '';
            var pa = document.getElementById('_co_proxyAddr'); if(pa) pa.value = ce.proxy_address || '';
            var pp2 = document.getElementById('_co_proxyPhone'); if(pp2) pp2.value = ce.proxy_phone || '';
        }
    }

    // Zalo
    var zaloSel = document.getElementById('_co_zalo');
    if (zaloSel) zaloSel.value = o.zalo_oa_sent ? '1' : '0';

    // Sale note
    var noteEl = document.getElementById('_co_saleNote');
    if (noteEl && o.sale_note_for_accountant) noteEl.value = o.sale_note_for_accountant;

    // Deposit info
    var depInfo = document.getElementById('_co_depositInfo');
    if (depInfo) {
        var depDisplay = _dhtCreate.depositId
            ? _dhtCreate.depositCode + ' — ' + Number(_dhtCreate.depositAmount).toLocaleString('vi-VN') + 'đ'
            : 'Không cọc';
        depInfo.innerHTML = '💰 Mã Cọc: ' + depDisplay;
    }

    // Render existing phieus and surcharges
    _dhtRenderPhieuRows();
    _dhtRenderSurcharges();
    if (document.getElementById('_co_additionalVat')) {
        var val = Number(o.additional_vat_amount) || 0;
        document.getElementById('_co_additionalVat').value = val > 0 ? val : '';
    }
    _dhtCalcTotal();

    // ★ EDIT RESTRICTIONS for non-GĐ users
    if (typeof currentUser !== 'undefined' && currentUser && currentUser.role !== 'giam_doc') {
        var catEl2 = document.getElementById('_co_cat');
        if (catEl2) { catEl2.disabled = true; catEl2.style.background = '#f1f5f9'; catEl2.style.color = '#64748b'; catEl2.style.cursor = 'not-allowed'; catEl2.title = '🔒 Chỉ GĐ mới đổi được Lĩnh Vực'; }

        var shipEl2 = document.getElementById('_co_shipDate');
        if (shipEl2) { shipEl2.disabled = true; shipEl2.style.background = '#f1f5f9'; shipEl2.style.color = '#64748b'; shipEl2.style.cursor = 'not-allowed'; shipEl2.title = '🔒 Chỉ GĐ mới đổi được Ngày Gửi'; }

        var priEl2 = document.getElementById('_co_pri');
        if (priEl2) { priEl2.disabled = true; priEl2.style.background = '#f1f5f9'; priEl2.style.color = '#64748b'; priEl2.style.cursor = 'not-allowed'; priEl2.title = '🔒 Chỉ GĐ mới đổi được Tiêu Chuẩn Gửi'; }

        window._dhtEditRestricted = true;
        _dhtRenderPhieuRows();
        _dhtRenderSurcharges();
        _ppRenderNNTags();
    } else {
        window._dhtEditRestricted = false;
    }
}

// === Submit Edit V2 (PUT with items) ===
async function _dhtSubmitEditV2() {
    var id = _dhtCreate.editOrderId;
    if (!id) { showToast('Lỗi: không có ID đơn', 'error'); return; }
    var cat = document.getElementById('_co_cat')?.value;
    var addr = document.getElementById('_co_addr')?.value?.trim();
    var prov = document.getElementById('_co_prov')?.value;
    var shipDate = document.getElementById('_co_shipDate')?.value;
    var carrier = document.getElementById('_co_carrier')?.value;
    if (!cat) { showToast('Chọn Lĩnh Vực', 'error'); return; }
    if (!addr) { showToast('Nhập Địa Chỉ', 'error'); return; }
    if (prov && _dhtProvinces.indexOf(prov) === -1) { showToast('Tỉnh/Thành Phố không hợp lệ', 'error'); return; }
    var desVal = document.getElementById('_co_designer')?.value;
    if (!desVal) { showToast('Chọn Thiết Kế', 'error'); return; }

    var items = _dhtCreate.phieuItems || [];
    var catSel = document.getElementById('_co_cat');
    var catName = catSel ? (catSel.options[catSel.selectedIndex]?.text || '') : '';
    if (catName === 'PET') {
        var hasTo = items.some(function(item) {
            return item && item.product_name === 'Tờ';
        });
        if (hasTo) {
            showToast('⛔ Đơn hàng PET không được phép chứa sản phẩm dạng "Tờ". Vui lòng kiểm tra lại!', 'error');
            return;
        }
    }
    var totalAmt = 0, totalVatAmt = 0;
    items.forEach(function(p) { if(!p)return; totalAmt += p.raw_total || 0; totalVatAmt += p.vat_amount || 0; });
    var surTotal = 0;
    (_dhtCreate.surcharges||[]).forEach(function(s) { surTotal += Number(s.amount) || 0; });
    var additionalVat = Number(document.getElementById('_co_additionalVat')?.value) || 0;

    // Validate that remaining amount is not negative
    var discountAmt = Number(_dhtCreate.editData?.order?.discount_amount) || 0;
    var depAmt = Number(_dhtCreate.depositAmount) || 0;
    var shipFee = Number(_dhtCreate.editData?.order?.shipping_fee) || 0;
    var shipPayer = _dhtCreate.editData?.order?.shipping_fee_payer || '';
    var shipMethod = _dhtCreate.editData?.order?.shipping_fee_method || '';
    var shipCK = 0;
    var remain = (totalAmt + totalVatAmt + additionalVat + surTotal) - discountAmt - depAmt;
    if (remain < 0) {
        showToast('⛔ Số tiền Còn Lại không được âm! Tổng đơn mới (' + (totalAmt + totalVatAmt + additionalVat + surTotal).toLocaleString('vi-VN') + 'đ) nhỏ hơn cọc (' + depAmt.toLocaleString('vi-VN') + 'đ) và chiết khấu (' + discountAmt.toLocaleString('vi-VN') + 'đ)', 'error');
        return;
    }

    var hasVat = (totalVatAmt > 0 || additionalVat > 0);
    var vatAmt = totalVatAmt + additionalVat;
    var pri = document.getElementById('_co_pri')?.value || 'CHUẨN';
    // Handle proof image for CHUẨN and validate time + image
    var proofImg = undefined;
    if (pri === 'CHUẨN') {
        var dH = document.getElementById('_co_deliveryHour')?.value;
        var dM = document.getElementById('_co_deliveryMin')?.value;
        if (!dH || dH === '') { showToast('⏰ Chọn Giờ Yêu Cầu Chuẩn Hàng Ra', 'error'); return; }
        if (dM === undefined || dM === null || dM === '') { showToast('⏰ Chọn Phút Yêu Cầu Chuẩn Hàng Ra', 'error'); return; }
        proofImg = _dhtProofBase64 || _dhtCreate.editData?.order?.standard_proof_image || null;
        if (!proofImg) {
            showToast('📸 Vui lòng dán ảnh chứng minh Tiêu Chuẩn CHUẨN (Ctrl+V)', 'error');
            document.getElementById('_co_proofZone')?.focus();
            return;
        }
    }
    var desVal = document.getElementById('_co_designer')?.value;
    var desType = desVal === 'old_design' ? 'old_design' : 'staff';
    var desId = desVal === 'old_design' ? null : (desVal || null);

    var payload = {
        category_id: cat,
        address: addr,
        province: prov || null,
        total_quantity: items.reduce(function(s, x) { return s + (x ? x.quantity : 0); }, 0),
        total_amount: totalAmt + vatAmt + surTotal,
        surcharges: (_dhtCreate.surcharges || []).map(function(s) { return { name: s.description, amount: Number(s.amount) || 0 }; }),
        has_vat: hasVat,
        vat_amount: vatAmt,
        additional_vat_amount: additionalVat,
        deposit_amount_cache: _dhtCreate.depositAmount || 0,
        designer_user_id: desId,
        designer_type: desType,
        carrier_id: carrier || null,
        carrier_extra: _dhtGetCarrierExtra() || null,
        expected_ship_date: shipDate || null,
        shipping_priority: pri,
        standard_delivery_time: pri === 'CHUẨN' ? ((document.getElementById('_co_deliveryHour')?.value || '00') + ':' + (document.getElementById('_co_deliveryMin')?.value || '00')) : null,
        zalo_oa_sent: document.getElementById('_co_zalo')?.value === '1',
        sale_note_for_accountant: document.getElementById('_co_saleNote')?.value?.trim() || null,
        items: items
    };
    if (proofImg !== undefined) payload.standard_proof_image = proofImg;

    var data = await apiCall('/api/dht/orders/' + id, 'PUT', payload);
    if (data.success) {
        showToast('✅ Đã cập nhật đơn hàng!');
        _dhtCreate = { step: 1, depositId: null, depositAmount: 0, depositCode: '', myInfo: null, surcharges: [], reminders: [], editMode: false, editOrderId: null, editData: null };
        closeModal();
        await _dhtLoadTree();
        await _dhtLoadOrders();
    } else {
        showToast(data.error || 'Lỗi cập nhật', 'error');
    }
}

// ========== ★ REPAIR ORDER — Lên Đơn Sửa ==========
var _dhtRepairData = null; // { parentId, parentCode, categoryName, order }

async function _dhtCreateRepairOrder(orderId) {
    // 1. Fetch parent order detail
    var data = await apiCall('/api/dht/orders/' + orderId + '/detail');
    if (!data.order) { showToast('Không tìm thấy đơn gốc', 'error'); return; }
    var o = data.order;
    var catName = (o.category_name || '').toUpperCase().trim();
    var DONG_PHUC = ['CÔNG TY', 'ÁO LỚP', 'MẦM NON'];
    var isPetTem = (catName === 'PET' || catName === 'TEM');
    var isDongPhuc = DONG_PHUC.some(function(n) { return catName === n; });

    if (!isPetTem && !isDongPhuc) {
        showToast('Lĩnh vực "' + catName + '" chưa hỗ trợ Lên Đơn Sửa', 'error');
        return;
    }

    // 2. Find "ĐƠN SỬA" category ID
    var cats = _dht.categories || [];
    var donSuaCat = cats.find(function(c) { return c.name === 'ĐƠN SỬA'; });
    if (!donSuaCat) {
        // Reload categories and try again
        var catRes = await apiCall('/api/dht/categories');
        _dht.categories = catRes.categories || [];
        donSuaCat = _dht.categories.find(function(c) { return c.name === 'ĐƠN SỬA'; });
    }
    if (!donSuaCat) { showToast('Chưa có lĩnh vực "ĐƠN SỬA". Liên hệ GĐ tạo lĩnh vực.', 'error'); return; }

    // 3. Store repair context
    _dhtRepairData = { parentId: o.id, parentCode: o.order_code, categoryName: catName, catId: donSuaCat.id, order: o, isPetTem: isPetTem };

    closeModal();

    // 4. Open appropriate form
    if (isPetTem) {
        await _dhtShowCreateFree();
    } else {
        _dhtCreate = { step: 1, depositId: null, depositAmount: 0, depositCode: '', myInfo: null, surcharges: [], reminders: [] };
        await _dhtGoStep2();
    }

    // 5. After modal opens — override fields
    setTimeout(function() { _dhtApplyRepairOverrides(); }, 200);
}

function _dhtApplyRepairOverrides() {
    if (!_dhtRepairData) return;
    var rd = _dhtRepairData;
    var o = rd.order;

    // A. Set category to "ĐƠN SỬA" and lock
    var catSel = document.getElementById('_co_cat');
    if (catSel) {
        var found = false;
        for (var i = 0; i < catSel.options.length; i++) {
            if (catSel.options[i].value == rd.catId) { found = true; break; }
        }
        if (!found) {
            var opt = document.createElement('option');
            opt.value = rd.catId;
            opt.text = 'ĐƠN SỬA';
            catSel.appendChild(opt);
        }
        catSel.value = rd.catId;
        catSel.disabled = true;
        catSel.style.background = '#ede9fe';
        catSel.style.color = '#6d28d9';
        catSel.style.fontWeight = '800';
        catSel.style.cursor = 'not-allowed';
    }

    // B. Set order code (readonly badge style)
    var repairCode = 'SUA' + rd.parentCode;
    var _repairDepositHTML = '<div id="_co_repairDepWrap" style="margin:10px 0;background:linear-gradient(135deg,#f0fdf4,#ecfdf5);border:1px solid #86efac;border-radius:10px;padding:12px">'
        +'<label style="font-weight:800;font-size:12px;color:#166534;margin-bottom:6px;display:block">💰 Chọn Mã Cọc (tùy chọn) <span style="font-size:10px;color:#64748b;font-weight:600">— từ Sổ Ghi Nhận Tiền</span></label>'
        +'<div style="position:relative"><input id="_co_depSearch" class="form-control" placeholder="🔍 Gõ mã tiền, số tiền, nội dung CK..." autocomplete="off" oninput="_dhtSearchDeposit()" onfocus="_dhtSearchDeposit()" style="font-size:12px;border:2px solid #059669">'
        +'<div id="_co_depSearchList" style="display:none;position:absolute;z-index:100;background:#fff;border:1px solid #86efac;border-radius:8px;max-height:220px;overflow-y:auto;width:100%;box-shadow:0 6px 20px rgba(0,0,0,0.12);margin-top:2px"></div></div>'
        +'<div id="_co_depSelected" style="display:none;margin-top:6px;background:#fff;border:1px solid #86efac;border-radius:6px;padding:8px 10px;font-size:12px;color:#166534;font-weight:600"></div>'
        +'</div>';

    if (rd.isPetTem) {
        // Free form: update code label
        var freeLabel = document.getElementById('_co_codeFreeLabel');
        if (freeLabel) {
            freeLabel.value = '🔧 ' + repairCode + ' — Đơn Sửa từ ' + rd.parentCode;
            freeLabel.style.color = '#6d28d9';
            freeLabel.style.borderColor = '#7c3aed';
            freeLabel.style.background = '#f5f3ff';
        }
        // Show form fields immediately
        var formFields = document.getElementById('_co_freeFormFields');
        if (formFields) formFields.style.display = '';
        // PET/TEM free form already has built-in deposit picker — no injection needed
    } else {
        // Normal form: hide code search, show repair badge
        var codeNormal = document.getElementById('_co_codeNormal');
        var codeFree = document.getElementById('_co_codeFree');
        if (codeNormal) codeNormal.style.display = 'none';
        if (codeFree) {
            codeFree.style.display = 'block';
            var freeLabel2 = document.getElementById('_co_codeFreeLabel');
            if (freeLabel2) {
                freeLabel2.value = '🔧 ' + repairCode + ' — Đơn Sửa từ ' + rd.parentCode;
                freeLabel2.style.color = '#6d28d9';
                freeLabel2.style.borderColor = '#7c3aed';
                freeLabel2.style.background = '#f5f3ff';
            }
            // Inject deposit picker after code section (for Đồng Phục)
            if (!document.getElementById('_co_repairDepWrap')) {
                codeFree.insertAdjacentHTML('afterend', _repairDepositHTML);
            }
        }
    }

    // C. Pre-fill customer info
    var nameEl = document.getElementById('_co_name');
    var phoneEl = document.getElementById('_co_phone');
    var addrEl = document.getElementById('_co_addr');
    var provEl = document.getElementById('_co_prov');
    if (nameEl) { nameEl.value = o.customer_name || ''; nameEl.disabled = false; nameEl.style.background = '#fff'; nameEl.style.cursor = 'text'; }
    if (phoneEl) { phoneEl.value = o.customer_phone || ''; phoneEl.disabled = false; phoneEl.style.background = '#fff'; phoneEl.style.cursor = 'text'; phoneEl.placeholder = 'SĐT khách hàng'; }
    if (addrEl) addrEl.value = o.address || '';
    if (provEl) provEl.value = o.province || '';

    // D. Pre-fill source from parent order
    var srcEl = document.getElementById('_co_src');
    if (srcEl) srcEl.value = o.source || '';
    var srcFreeSelect = document.getElementById('_co_srcFreeSelect');
    if (srcFreeSelect && o.source) {
        // Check if option exists, if not add it
        var srcFound = false;
        for (var j = 0; j < srcFreeSelect.options.length; j++) {
            if (srcFreeSelect.options[j].value === o.source) { srcFound = true; srcFreeSelect.value = o.source; break; }
        }
        if (!srcFound) {
            var srcOpt = document.createElement('option');
            srcOpt.value = o.source;
            srcOpt.text = o.source;
            srcFreeSelect.appendChild(srcOpt);
            srcFreeSelect.value = o.source;
        }
        // Lock source — repair uses parent's source
        srcFreeSelect.disabled = true;
        srcFreeSelect.style.background = '#f5f3ff';
        srcFreeSelect.style.cursor = 'not-allowed';
    }

    // E. Unlock phone/name labels for repair
    var phoneLbl = document.getElementById('_co_phoneLabel');
    var nameLbl = document.getElementById('_co_nameLabel');
    if (phoneLbl) phoneLbl.innerHTML = 'SĐT Khách Hàng <span style="color:red">*</span> ✏️';
    if (nameLbl) nameLbl.innerHTML = 'Tên Khách Hàng <span style="color:red">*</span> ✏️';

    // F. ★ Auto-set designer = "Thiết Kế Cũ" and LOCK
    var desSel = document.getElementById('_co_designer');
    if (desSel) {
        desSel.value = 'old_design';
        desSel.disabled = true;
        desSel.style.background = '#f5f3ff';
        desSel.style.color = '#6d28d9';
        desSel.style.fontWeight = '700';
        desSel.style.cursor = 'not-allowed';
    }

    // G. Update modal title
    var titleEls = document.querySelectorAll('[class*="modal"] h3, [class*="modal"] .modal-title');
    titleEls.forEach(function(el) {
        if (el.textContent.includes('Tạo Đơn') || el.textContent.includes('Tạo đơn') || el.textContent.includes('PET') || el.textContent.includes('TEM')) {
            el.innerHTML = '🔧 Lên Đơn Sửa — <span style="color:#6d28d9">' + rd.parentCode + '</span>';
        }
    });

    // H. Init deposit state + set orderCode for repair
    _dhtCreate.depositId = null;
    _dhtCreate.depositAmount = 0;
    _dhtCreate.depositCode = '';
    _dhtCreate.orderCode = repairCode;
}
