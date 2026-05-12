// ========== SỔ GHI NHẬN TIỀN — Bộ Phận Văn Phòng ==========
var _pr = { tree: [], records: [], staff: [], filter: {}, editing: null };

function _prFmt(n) { return Number(n||0).toLocaleString('vi-VN') + 'đ'; }
function _prFmtShort(n) { return Number(n||0).toLocaleString('vi-VN') + 'đ'; }

var _prBanks = ['SACOM','TECHCOM','ACB','VIETCOM','BIDV','AGRI','MB','VP','TP','SHB','Khác'];

async function renderSoghinhantienPage(content) {
    // Inject styles once
    if (!document.getElementById('prStyles')) {
        var st = document.createElement('style'); st.id = 'prStyles';
        st.textContent = `
.pr-wrap{display:flex;gap:0;height:calc(100vh - 90px);overflow:hidden}
.pr-sidebar{width:200px;min-width:200px;background:#fff;border-right:1px solid var(--gray-200);overflow-y:auto;flex-shrink:0}
.pr-sidebar::-webkit-scrollbar{width:3px}
.pr-sidebar::-webkit-scrollbar-thumb{background:var(--gray-300);border-radius:4px}
.pr-main{flex:1;display:flex;flex-direction:column;overflow:hidden;background:var(--gray-50)}
.pr-toolbar{padding:10px 16px;background:#fff;border-bottom:1px solid var(--gray-200);display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.pr-table-wrap{flex:1;overflow:auto;padding:0}
.pr-table{width:100%;border-collapse:collapse;font-size:11.5px;table-layout:fixed}
.pr-table thead th{background:var(--navy);color:#fff;padding:7px 6px;font-size:10px;font-weight:700;letter-spacing:.3px;white-space:nowrap;position:sticky;top:0;z-index:2;text-transform:uppercase;border-right:1px solid rgba(255,255,255,.08)}
.pr-table tbody td{padding:6px;border-bottom:1px solid var(--gray-100);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:11.5px;vertical-align:middle}
.pr-table tbody tr:hover{background:rgba(212,168,67,.04)}
.pr-table tbody tr:nth-child(even){background:var(--gray-50)}
.pr-table tbody tr:nth-child(even):hover{background:rgba(212,168,67,.06)}
.pr-badge{display:inline-block;padding:2px 7px;border-radius:10px;font-size:10px;font-weight:700;letter-spacing:.2px}
.pr-ck{background:#dbeafe;color:#1e40af}.pr-tm{background:#dcfce7;color:#166534}
.pr-tt{background:#d1fae5;color:#065f46}.pr-coc{background:#fef3c7;color:#92400e}.pr-sll{background:#dbeafe;color:#1d4ed8}
.pr-nhan{background:#d1fae5;color:#065f46}.pr-chua{background:#fee2e2;color:#991b1b}
.pr-yr{padding:8px 12px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;font-weight:800;font-size:12px;color:var(--navy);border-bottom:1px solid var(--gray-100);transition:background .15s;user-select:none}
.pr-yr:hover{background:var(--gray-50)}
.pr-yr.active{background:rgba(212,168,67,.08);color:var(--gold-dark)}
.pr-mo{padding:6px 12px 6px 24px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;font-weight:600;font-size:11px;color:var(--gray-600);border-bottom:1px solid var(--gray-50);transition:background .15s;user-select:none}
.pr-mo:hover{background:rgba(59,130,246,.04)}
.pr-mo.active{background:rgba(59,130,246,.08);color:#1e40af;font-weight:700}
.pr-dy{padding:5px 12px 5px 40px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;font-size:10.5px;color:var(--gray-500);border-bottom:1px solid rgba(0,0,0,.02);transition:background .15s;user-select:none}
.pr-dy:hover{background:rgba(16,185,129,.04)}
.pr-dy.active{background:rgba(16,185,129,.08);color:#065f46;font-weight:700}
.pr-all{padding:10px 12px;cursor:pointer;font-weight:800;font-size:11px;color:var(--navy);border-bottom:2px solid var(--gold);display:flex;align-items:center;gap:6px;transition:background .15s;user-select:none;text-transform:uppercase;letter-spacing:1px}
.pr-all:hover,.pr-all.active{background:rgba(212,168,67,.1)}
.pr-amt{font-size:11px;font-weight:800;color:#e65100;white-space:nowrap;text-shadow:0 0 1px rgba(230,81,0,.15)}
.pr-add-btn{background:linear-gradient(135deg,var(--success),#059669);color:#fff;border:none;padding:6px 14px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:4px;transition:all .2s;box-shadow:0 2px 8px rgba(16,185,129,.25)}
.pr-add-btn:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(16,185,129,.35)}
.pr-filter-info{font-size:11px;color:var(--gray-500);font-weight:600}
.pr-count{background:var(--navy);color:var(--gold);padding:2px 8px;border-radius:8px;font-size:10px;font-weight:700;margin-left:4px}
`;
        document.head.appendChild(st);
    }

    content.innerHTML = '<div class="pr-wrap"><div class="pr-sidebar" id="prSidebar"><div style="padding:20px;text-align:center;color:var(--gray-400);font-size:12px">Đang tải...</div></div><div class="pr-main"><div class="pr-toolbar" id="prToolbar"></div><div class="pr-table-wrap" id="prTableWrap"></div></div></div>';

    // Load data in parallel
    var [treeData, staffData] = await Promise.all([
        apiCall('/api/payment-records/tree'),
        apiCall('/api/payment-records/staff')
    ]);
    _pr.tree = treeData.tree || [];
    _pr.staff = staffData.staff || [];
    _pr.filter = {};

    _prRenderSidebar();
    await _prLoadRecords();
}

function _prRenderSidebar() {
    var sb = document.getElementById('prSidebar');
    if (!sb) return;
    var isAll = !_pr.filter.year;
    var totalAll = _pr.tree.reduce(function(s,y){return s+y.total},0);
    var h = '<div class="pr-all'+(isAll?' active':'')+'" onclick="_prFilterAll()">📋 Tất cả <span class="pr-amt">'+_prFmtShort(totalAll)+'</span></div>';

    _pr.tree.forEach(function(yr) {
        var yActive = _pr.filter.year === yr.year && !_pr.filter.month;
        var yOpen = _pr.filter.year === yr.year;
        h += '<div class="pr-yr'+(yActive?' active':'')+'" onclick="_prFilterYear('+yr.year+')">';
        h += '<span>'+(yOpen?'▼':'▶')+' '+yr.year+'</span><span class="pr-amt">'+_prFmtShort(yr.total)+'</span></div>';
        if (yOpen) {
            yr.months.forEach(function(mo) {
                var mActive = _pr.filter.month === mo.month && !_pr.filter.day;
                var mOpen = _pr.filter.month === mo.month;
                h += '<div class="pr-mo'+(mActive?' active':'')+'" onclick="event.stopPropagation();_prFilterMonth('+yr.year+','+mo.month+')">';
                h += '<span>'+(mOpen?'▼':'▶')+' Tháng '+mo.month+'</span><span class="pr-amt">'+_prFmtShort(mo.total)+'</span></div>';
                if (mOpen) {
                    mo.days.forEach(function(dy) {
                        var dActive = _pr.filter.day === dy.day;
                        h += '<div class="pr-dy'+(dActive?' active':'')+'" onclick="event.stopPropagation();_prFilterDay('+yr.year+','+mo.month+','+dy.day+')">';
                        h += '<span>'+dy.day+'/'+mo.month+'</span><span class="pr-amt">'+_prFmtShort(dy.total)+'</span></div>';
                    });
                }
            });
        }
    });
    sb.innerHTML = h;
}

function _prFilterAll() { _pr.filter={}; _prRenderSidebar(); _prLoadRecords(); }
function _prFilterYear(y) { _pr.filter={year:y}; _prRenderSidebar(); _prLoadRecords(); }
function _prFilterMonth(y,m) { _pr.filter={year:y,month:m}; _prRenderSidebar(); _prLoadRecords(); }
function _prFilterDay(y,m,d) { _pr.filter={year:y,month:m,day:d}; _prRenderSidebar(); _prLoadRecords(); }

async function _prLoadRecords() {
    var params = [];
    if (_pr.filter.year) params.push('year='+_pr.filter.year);
    if (_pr.filter.month) params.push('month='+_pr.filter.month);
    if (_pr.filter.day) params.push('day='+_pr.filter.day);
    var url = '/api/payment-records' + (params.length ? '?'+params.join('&') : '');
    var data = await apiCall(url);
    _pr.records = data.records || [];
    _prRenderToolbar();
    _prRenderTable();
}

function _prRenderToolbar() {
    var tb = document.getElementById('prToolbar');
    if (!tb) return;
    var filterText = 'Tất cả';
    if (_pr.filter.day) filterText = _pr.filter.day+'/'+_pr.filter.month+'/'+_pr.filter.year;
    else if (_pr.filter.month) filterText = 'Tháng '+_pr.filter.month+'/'+_pr.filter.year;
    else if (_pr.filter.year) filterText = 'Năm '+_pr.filter.year;
    var total = _pr.records.reduce(function(s,r){return s+Number(r.amount||0)},0);
    tb.innerHTML = '<span class="pr-filter-info">📅 '+filterText+' <span class="pr-count">'+_pr.records.length+' mã</span></span><span style="flex:1"></span><span style="font-size:12px;font-weight:800;color:var(--success)">💰 '+_prFmt(total)+'</span><button class="pr-add-btn" onclick="_prShowAddModal()">➕ Thêm Mã Tiền</button>';
}

function _prRenderTable() {
    var wrap = document.getElementById('prTableWrap');
    if (!wrap) return;
    if (_pr.records.length === 0) {
        wrap.innerHTML = '<div style="text-align:center;padding:60px 20px;color:var(--gray-400)"><div style="font-size:40px;margin-bottom:12px">💵</div><div style="font-size:13px;font-weight:600">Chưa có mã thanh toán nào</div></div>';
        return;
    }
    var cols = [
        {k:'code',l:'Mã TT',w:115},{k:'customer',l:'Khách Hàng',w:140},{k:'cskh',l:'CSKH',w:85},
        {k:'amount',l:'Số Tiền',w:90},{k:'type',l:'Loại',w:65},{k:'order',l:'Đơn TT/Cọc',w:100},
        {k:'sample',l:'Áo Mẫu',w:70},{k:'note',l:'Nội Dung',w:140},{k:'source',l:'Nguồn',w:70},
        {k:'bank',l:'NH',w:65},{k:'totalOrders',l:'Tổng Đơn TT',w:100},{k:'cod',l:'Tổng COD',w:80},
        {k:'ship',l:'Cước VC',w:75},{k:'history',l:'Lịch Sử CN',w:120},{k:'status',l:'Trạng Thái BG',w:100},{k:'date',l:'Ngày',w:65}
    ];
    var totalW = cols.reduce(function(s,c){return s+c.w},0);
    var h = '<table class="pr-table" style="min-width:'+totalW+'px"><thead><tr>';
    cols.forEach(function(c){h+='<th style="width:'+c.w+'px">'+c.l+'</th>';});
    h += '</tr></thead><tbody>';

    var typeLabels = {thanh_toan:'TT',dat_coc:'Cọc',tt_sll:'SLL'};
    var typeClass = {thanh_toan:'pr-tt',dat_coc:'pr-coc',tt_sll:'pr-sll'};
    var srcLabels = {khach_hang:'KH',khach_hang_sll:'KH SLL',nha_van_chuyen:'NVC'};

    _pr.records.forEach(function(r) {
        var methodBadge = r.payment_method === 'TM' ? '<span class="pr-badge pr-tm">💵'+r.payment_code+'</span>' : '<span class="pr-badge pr-ck">🏦'+r.payment_code+'</span>';
        var custDisplay = (r.customer_name||'') + (r.customer_phone ? ' - '+r.customer_phone : '');
        var typeBadge = '<span class="pr-badge '+(typeClass[r.payment_type]||'pr-tt')+'">'+(typeLabels[r.payment_type]||'TT')+'</span>';
        var statusBadge = r.handover_status === 'thu_quy_nhan' ? '<span class="pr-badge pr-nhan" style="cursor:pointer" onclick="_prToggleHandover('+r.id+',\'chua_bangiao\')">✅ TQ Nhận</span>' : '<span class="pr-badge pr-chua" style="cursor:pointer" onclick="_prToggleHandover('+r.id+',\'thu_quy_nhan\')">⏳ Chưa BG</span>';
        var updatedAt = r.updated_at ? vnFormat(new Date(r.updated_at),'dd/MM HH:mm') : '';
        var payDate = r.payment_date ? r.payment_date.split('T')[0].split('-').reverse().join('/') : '';

        h += '<tr>';
        h += '<td style="font-weight:700">'+methodBadge+'</td>';
        h += '<td title="'+(custDisplay||'')+'" style="font-weight:600;color:var(--navy)">'+custDisplay+'</td>';
        h += '<td style="color:var(--info);font-weight:600">'+(r.cskh_name||'')+'</td>';
        h += '<td style="font-weight:900;color:#d32f2f;text-align:right;font-size:12.5px">'+_prFmt(r.amount)+'</td>';
        h += '<td>'+typeBadge+'</td>';
        h += '<td title="'+(r.order_tt_coc||'')+'">'+(r.order_tt_coc||'')+'</td>';
        h += '<td title="'+(r.order_ao_mau||'')+'">'+(r.order_ao_mau||'')+'</td>';
        h += '<td title="'+(r.transfer_note||'')+'" style="color:var(--gray-600)">'+(r.transfer_note||'')+'</td>';
        h += '<td><span class="pr-badge" style="background:#f3f4f6;color:#374151">'+(srcLabels[r.money_source]||r.money_source||'')+'</span></td>';
        h += '<td style="font-weight:600">'+(r.bank_name||'')+'</td>';
        h += '<td title="'+(r.total_order_codes||'')+'">'+(r.total_order_codes||'')+'</td>';
        h += '<td style="text-align:right">'+(Number(r.total_cod)?_prFmt(r.total_cod):'')+'</td>';
        h += '<td style="text-align:right">'+(Number(r.shipping_fee)?_prFmt(r.shipping_fee):'')+'</td>';
        h += '<td style="font-size:10px;color:var(--gray-500)">'+updatedAt+'</td>';
        h += '<td>'+statusBadge+'</td>';
        h += '<td style="font-weight:600;font-size:10.5px">'+payDate+'</td>';
        h += '</tr>';
    });
    h += '</tbody></table>';
    wrap.innerHTML = h;
}

async function _prToggleHandover(id, newStatus) {
    await apiCall('/api/payment-records/'+id+'/handover','PUT',{status:newStatus});
    showToast(newStatus==='thu_quy_nhan'?'✅ Thủ quỹ đã nhận':'↩️ Đã hủy bàn giao');
    var treeData = await apiCall('/api/payment-records/tree');
    _pr.tree = treeData.tree || [];
    _prRenderSidebar();
    await _prLoadRecords();
}

async function _prShowAddModal() {
    var today = new Date();
    var todayStr = today.getFullYear()+'-'+String(today.getMonth()+1).padStart(2,'0')+'-'+String(today.getDate()).padStart(2,'0');
    var staffOpts = _pr.staff.map(function(s){return '<option value="'+s.id+'">'+s.full_name+'</option>';}).join('');
    var bankOpts = _prBanks.map(function(b){return '<option value="'+b+'">'+b+'</option>';}).join('');

    var bodyHTML = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'
        +'<div class="form-group"><label style="font-size:12px;font-weight:700;color:var(--navy);margin-bottom:4px;display:block">Phương Thức <span style="color:var(--danger)">*</span></label><select id="prMethod" class="form-control" style="padding:10px 12px;font-size:13px" onchange="_prPreviewCode()"><option value="CK">🏦 Chuyển Khoản</option><option value="TM">💵 Tiền Mặt</option></select></div>'
        +'<div class="form-group"><label style="font-size:12px;font-weight:700;color:var(--navy);margin-bottom:4px;display:block">Ngày <span style="color:var(--danger)">*</span></label><input type="date" id="prDate" class="form-control" value="'+todayStr+'" style="padding:10px 12px;font-size:13px" onchange="_prPreviewCode()"></div>'
        +'<div class="form-group" style="grid-column:span 2"><div id="prCodePreview" style="background:linear-gradient(135deg,var(--navy),var(--navy-light));color:var(--gold);padding:10px 16px;border-radius:8px;font-weight:800;font-size:14px;text-align:center;letter-spacing:1px">Đang tính mã...</div></div>'
        +'<div class="form-group"><label style="font-size:12px;font-weight:700;color:var(--navy);margin-bottom:4px;display:block">Khách Hàng</label><input type="text" id="prCustName" class="form-control" placeholder="Tên KH" style="padding:10px 12px;font-size:13px"></div>'
        +'<div class="form-group"><label style="font-size:12px;font-weight:700;color:var(--navy);margin-bottom:4px;display:block">SĐT</label><input type="text" id="prCustPhone" class="form-control" placeholder="0xxx" style="padding:10px 12px;font-size:13px"></div>'
        +'<div class="form-group"><label style="font-size:12px;font-weight:700;color:var(--navy);margin-bottom:4px;display:block">CSKH</label><select id="prCSKH" class="form-control" style="padding:10px 12px;font-size:13px"><option value="">-- Chọn --</option>'+staffOpts+'</select></div>'
        +'<div class="form-group"><label style="font-size:12px;font-weight:700;color:var(--navy);margin-bottom:4px;display:block">Số Tiền <span style="color:var(--danger)">*</span></label><input type="number" id="prAmount" class="form-control" placeholder="0" style="padding:10px 12px;font-size:13px"></div>'
        +'<div class="form-group"><label style="font-size:12px;font-weight:700;color:var(--navy);margin-bottom:4px;display:block">Loại Tiền</label><select id="prType" class="form-control" style="padding:10px 12px;font-size:13px"><option value="thanh_toan">Thanh Toán</option><option value="dat_coc">Đặt Cọc</option><option value="tt_sll">TT Số Lượng Lớn</option></select></div>'
        +'<div class="form-group"><label style="font-size:12px;font-weight:700;color:var(--navy);margin-bottom:4px;display:block">Nguồn Tiền</label><select id="prSource" class="form-control" style="padding:10px 12px;font-size:13px"><option value="khach_hang">Khách Hàng</option><option value="khach_hang_sll">Khách Hàng SLL</option><option value="nha_van_chuyen">Nhà Vận Chuyển</option></select></div>'
        +'<div class="form-group"><label style="font-size:12px;font-weight:700;color:var(--navy);margin-bottom:4px;display:block">Ngân Hàng</label><select id="prBank" class="form-control" style="padding:10px 12px;font-size:13px"><option value="">-- Chọn --</option>'+bankOpts+'</select></div>'
        +'<div class="form-group"><label style="font-size:12px;font-weight:700;color:var(--navy);margin-bottom:4px;display:block">Đơn TT/Cọc</label><input type="text" id="prOrderTT" class="form-control" placeholder="VTxxxx" style="padding:10px 12px;font-size:13px"></div>'
        +'<div class="form-group"><label style="font-size:12px;font-weight:700;color:var(--navy);margin-bottom:4px;display:block">Đơn Áo Mẫu</label><input type="text" id="prOrderAM" class="form-control" placeholder="" style="padding:10px 12px;font-size:13px"></div>'
        +'<div class="form-group" style="grid-column:span 2"><label style="font-size:12px;font-weight:700;color:var(--navy);margin-bottom:4px;display:block">Nội Dung CK</label><input type="text" id="prNote" class="form-control" placeholder="Nội dung chuyển khoản" style="padding:10px 12px;font-size:13px"></div>'
        +'</div>';

    var footerHTML = '<button class="btn btn-secondary" onclick="closeModal()">Hủy</button><button class="btn btn-primary" onclick="_prSubmitAdd()" style="width:auto">✅ Tạo Mã Tiền</button>';
    openModal('➕ Tạo Mã Thanh Toán Mới', bodyHTML, footerHTML);
    setTimeout(_prPreviewCode, 100);
}

async function _prPreviewCode() {
    var method = document.getElementById('prMethod')?.value || 'CK';
    var date = document.getElementById('prDate')?.value;
    var preview = document.getElementById('prCodePreview');
    if (!date || !preview) return;
    try {
        var data = await apiCall('/api/payment-records/next-seq?method='+method+'&date='+date);
        preview.textContent = '🏷️ Mã: ' + data.code;
    } catch(e) { preview.textContent = '⚠️ Lỗi tính mã'; }
}

async function _prSubmitAdd() {
    var amount = document.getElementById('prAmount')?.value;
    if (!amount || Number(amount) <= 0) { showToast('Vui lòng nhập số tiền!','error'); return; }
    var body = {
        payment_method: document.getElementById('prMethod')?.value || 'CK',
        payment_date: document.getElementById('prDate')?.value,
        customer_name: document.getElementById('prCustName')?.value || '',
        customer_phone: document.getElementById('prCustPhone')?.value || '',
        cskh_user_id: document.getElementById('prCSKH')?.value || null,
        amount: Number(amount),
        payment_type: document.getElementById('prType')?.value || 'thanh_toan',
        money_source: document.getElementById('prSource')?.value || 'khach_hang',
        bank_name: document.getElementById('prBank')?.value || '',
        order_tt_coc: document.getElementById('prOrderTT')?.value || '',
        order_ao_mau: document.getElementById('prOrderAM')?.value || '',
        transfer_note: document.getElementById('prNote')?.value || ''
    };
    try {
        var data = await apiCall('/api/payment-records','POST',body);
        if (data.success) {
            showToast('✅ Đã tạo mã: '+data.payment_code);
            closeModal();
            // Refresh tree + records
            var treeData = await apiCall('/api/payment-records/tree');
            _pr.tree = treeData.tree || [];
            _prRenderSidebar();
            await _prLoadRecords();
        } else { showToast(data.error||'Lỗi tạo mã','error'); }
    } catch(e) { showToast('Lỗi kết nối','error'); }
}

// Helper: vnFormat fallback
function vnFormat(d, fmt) {
    if (!d || isNaN(d.getTime())) return '';
    var dd = String(d.getDate()).padStart(2,'0');
    var MM = String(d.getMonth()+1).padStart(2,'0');
    var HH = String(d.getHours()).padStart(2,'0');
    var mm = String(d.getMinutes()).padStart(2,'0');
    return fmt.replace('dd',dd).replace('MM',MM).replace('HH',HH).replace('mm',mm);
}
