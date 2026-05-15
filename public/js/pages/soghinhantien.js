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
.pr-settings-btn{background:var(--navy);color:var(--gold);border:none;padding:6px 12px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:4px;transition:all .2s}
.pr-settings-btn:hover{background:var(--navy-light);transform:translateY(-1px)}
.pr-pending{background:#fef3c7;color:#92400e}
.pr-mail-tag{background:#ede9fe;color:#6d28d9;padding:2px 6px;border-radius:6px;font-size:9px;font-weight:700}
.pr-user-tag{background:#dbeafe;color:#1e40af;padding:2px 6px;border-radius:6px;font-size:9px;font-weight:700}
`;
        document.head.appendChild(st);
    }

    content.innerHTML = '<div class="pr-wrap"><div class="pr-sidebar" id="prSidebar"><div style="padding:20px;text-align:center;color:var(--gray-400);font-size:12px">Đang tải...</div></div><div class="pr-main"><div class="pr-toolbar" id="prToolbar"></div><div class="pr-table-wrap" id="prTableWrap"></div></div></div>';

    // Load data in parallel
    var [treeData, staffData, permData, bankData] = await Promise.all([
        apiCall('/api/payment-records/tree'),
        apiCall('/api/payment-records/staff'),
        apiCall('/api/payment-records/permissions').catch(function(){return{}}),
        apiCall('/api/payment-records/bank-list').catch(function(){return{}})
    ]);
    _pr.tree = treeData.tree || [];
    _pr.staff = staffData.staff || [];
    _pr.userPerms = permData.user_permissions || {};
    _pr.allPerms = permData.permissions || {};
    _pr.trackedBanks = bankData.banks || _prBanks;
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
    var isGD = (typeof currentUser !== 'undefined' && currentUser && currentUser.role === 'giam_doc');
    var settingsBtn = isGD ? '<button class="pr-settings-btn" onclick="_prShowSettings()">⚙️ Cài Đặt Email</button>' : '';
    var tgBtn = isGD ? '<button class="pr-settings-btn" onclick="_prShowTgSettings()" style="background:linear-gradient(135deg,#0088cc,#29b6f6);color:#fff">📢 Telegram</button>' : '';
    var permBtn = isGD ? '<button class="pr-settings-btn" onclick="_prShowPermissions()" style="background:linear-gradient(135deg,#7c3aed,#a78bfa);color:#fff">🔐 Phân Quyền</button>' : '';
    tb.innerHTML = '<span class="pr-filter-info">📅 '+filterText+' <span class="pr-count">'+_pr.records.length+' mã</span></span><span style="flex:1"></span><span style="font-size:12px;font-weight:800;color:var(--success)">💰 '+_prFmt(total)+'</span>'+permBtn+tgBtn+settingsBtn+'<button class="pr-add-btn" onclick="_prShowAddModal()">➕ Tạo Mã Tiền</button>';
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

    var typeLabels = {thanh_toan:'TT',dat_coc:'Cọc',tt_sll:'SLL',pending:'⏳'};
    var typeClass = {thanh_toan:'pr-tt',dat_coc:'pr-coc',tt_sll:'pr-sll',pending:'pr-pending'};
    var srcLabels = {khach_hang:'KH',khach_hang_sll:'KH SLL',nha_van_chuyen:'NVC'};

    _pr.records.forEach(function(r) {
        var methodBadge = r.payment_method === 'TM' ? '<span class="pr-badge pr-tm">💵'+r.payment_code+'</span>' : '<span class="pr-badge pr-ck">🏦'+r.payment_code+'</span>';
        var custDisplay = (r.customer_name||'') + (r.customer_phone ? ' - '+r.customer_phone : '');
        var typeBadge = '<span class="pr-badge '+(typeClass[r.payment_type]||'pr-tt')+'">'+(typeLabels[r.payment_type]||'TT')+'</span>';
        var statusBadge = r.handover_status === 'thu_quy_nhan' ? '<span class="pr-badge pr-nhan" style="cursor:pointer" onclick="_prToggleHandover('+r.id+',\'chua_bangiao\')">✅ TQ Nhận</span>' : '<span class="pr-badge pr-chua" style="cursor:pointer" onclick="_prToggleHandover('+r.id+',\'thu_quy_nhan\')">⏳ Chưa BG</span>';
        var updatedAt = r.updated_at ? vnFormat(new Date(r.updated_at),'dd/MM HH:mm') : '';
        var payDate = r.payment_date ? r.payment_date.split('T')[0].split('-').reverse().join('/') : '';

        h += '<tr style="cursor:pointer" onclick="_prShowDetail('+r.id+')">';
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
        // Lịch Sử CN: show source
        var historyDisplay = '';
        if (r.source === 'email_auto') {
            historyDisplay = updatedAt + ' <span class="pr-mail-tag">📧 Mail</span>';
        } else if (r.created_by_name) {
            historyDisplay = updatedAt + ' <span class="pr-user-tag">👤 ' + r.created_by_name + '</span>';
        } else {
            historyDisplay = updatedAt;
        }
        h += '<td style="font-size:10px">' + historyDisplay + '</td>';
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
    var todayDisplay = String(today.getDate()).padStart(2,'0')+'/'+String(today.getMonth()+1).padStart(2,'0')+'/'+today.getFullYear();
    var userName = (typeof currentUser !== 'undefined' && currentUser) ? currentUser.full_name : '';

    // Bank chips from tracked banks (NGÂN HÀNG ĐANG THEO DÕI)
    var activeBanks = _pr.trackedBanks && _pr.trackedBanks.length ? _pr.trackedBanks : _prBanks;
    var bankChips = activeBanks.map(function(b){
        return '<div class="pr-bank-chip" data-bank="'+b+'" onclick="_prSelectBank(this,\''+b+'\')" style="padding:6px 14px;border-radius:20px;border:2px solid #e2e8f0;font-size:12px;font-weight:700;cursor:pointer;transition:all .15s;color:#475569;background:#fff">'+b+'</div>';
    }).join('');

    var lbl = function(t,req){ return '<label style="font-size:12px;font-weight:700;color:var(--navy);margin-bottom:6px;display:block">'+t+(req?' <span style="color:var(--danger)">*</span>':'')+'</label>'; };

    var bodyHTML = '<div style="display:grid;gap:16px">'
        // Ngày (readonly)
        +'<div class="form-group"><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'
        +'<div>'+lbl('📅 Ngày',true)+'<input type="date" id="prDate" class="form-control" value="'+todayStr+'" readonly style="padding:10px 12px;font-size:13px;background:#f1f5f9;cursor:not-allowed"></div>'
        // PT Thanh Toán
        +'<div>'+lbl('💳 PT Thanh Toán',true)+'<select id="prMethod" class="form-control" style="padding:10px 12px;font-size:13px" onchange="_prPreviewCode();_prToggleBankRow()"><option value="CK">🏦 CK - Chuyển Khoản</option><option value="TM">💵 TM - Tiền Mặt</option></select></div>'
        +'</div></div>'
        // Nguồn tiền (auto)
        +'<div class="form-group">'+lbl('🏷️ Nguồn Tiền',false)+'<div style="padding:10px 12px;background:#f0fdf4;border-radius:8px;font-weight:700;font-size:13px;color:#065f46;border:1px solid #bbf7d0">✅ Khách Hàng</div><input type="hidden" id="prSource" value="khach_hang"></div>'
        // Số tiền
        +'<div class="form-group">'+lbl('💰 Số Tiền',true)+'<input type="number" id="prAmount" class="form-control" placeholder="Nhập số tiền" style="padding:12px;font-size:15px;font-weight:700"></div>'
        // Ngân hàng (chips) — hidden when TM
        +'<div class="form-group" id="prBankRow">'+lbl('🏦 Ngân Hàng',true)+'<div style="display:flex;flex-wrap:wrap;gap:8px" id="prBankChips">'+bankChips+'</div><input type="hidden" id="prBank" value=""></div>'
        // Nội dung
        +'<div class="form-group">'+lbl('📝 Nội Dung',true)+'<input type="text" id="prNote" class="form-control" placeholder="Nội dung chuyển khoản / thanh toán" style="padding:10px 12px;font-size:13px"></div>'
        // Mã (auto, readonly)
        +'<div class="form-group">'+lbl('🏷️ Mã',false)+'<div id="prCodePreview" style="padding:10px 16px;background:linear-gradient(135deg,var(--navy),var(--navy-light));color:var(--gold);border-radius:8px;font-weight:800;font-size:14px;text-align:center;letter-spacing:1px">Đang tính mã...</div></div>'
        // Người ghi nhận (auto)
        +'<div class="form-group">'+lbl('👤 Người Ghi Nhận',false)+'<div style="padding:10px 12px;background:#f1f5f9;border-radius:8px;font-weight:700;font-size:13px;color:#334155;border:1px solid #e2e8f0">'+userName+'</div></div>'
        +'</div>';

    var footerHTML = '<button class="btn btn-secondary" onclick="closeModal()">Hủy</button><button class="btn btn-primary" onclick="_prSubmitAdd()" style="width:auto">✅ TẠO MÃ TIỀN</button>';
    openModal('➕ Tạo Mã Tiền', bodyHTML, footerHTML);
    setTimeout(_prPreviewCode, 100);
}

function _prSelectBank(el, bank) {
    // Deselect all
    document.querySelectorAll('.pr-bank-chip').forEach(function(c) {
        c.style.background = '#fff';
        c.style.color = '#475569';
        c.style.borderColor = '#e2e8f0';
    });
    // Select this one
    el.style.background = 'var(--navy)';
    el.style.color = '#fff';
    el.style.borderColor = 'var(--navy)';
    document.getElementById('prBank').value = bank;
}

function _prToggleBankRow() {
    var method = document.getElementById('prMethod')?.value;
    var row = document.getElementById('prBankRow');
    if (!row) return;
    if (method === 'TM') {
        row.style.display = 'none';
        document.getElementById('prBank').value = '';
    } else {
        row.style.display = '';
    }
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
    var bank = document.getElementById('prBank')?.value;
    var note = document.getElementById('prNote')?.value;
    var method = document.getElementById('prMethod')?.value || 'CK';
    if (!amount || Number(amount) <= 0) { showToast('Vui lòng nhập số tiền!','error'); return; }
    if (method === 'CK' && !bank) { showToast('Vui lòng chọn ngân hàng!','error'); return; }
    if (!note || !note.trim()) { showToast('Vui lòng nhập nội dung!','error'); return; }
    var body = {
        payment_method: document.getElementById('prMethod')?.value || 'CK',
        payment_date: document.getElementById('prDate')?.value,
        customer_name: '',
        customer_phone: '',
        cskh_user_id: null,
        amount: Number(amount),
        payment_type: 'thanh_toan',
        money_source: document.getElementById('prSource')?.value || 'khach_hang',
        bank_name: bank,
        order_tt_coc: '',
        order_ao_mau: '',
        transfer_note: note.trim()
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

// ========== SETTINGS MODAL ==========
async function _prShowSettings() {
    try {
        var data = await apiCall('/api/payment-records/email-config');
        var c = data.config || {};
        var banks = data.banks || [];
        var totalImported = data.total_imported || 0;

        var lastCheck = c.last_check_at ? vnFormat(new Date(c.last_check_at), 'dd/MM HH:mm') : 'Chưa check';
        var statusText = c.is_active ? '<span style="color:#059669;font-weight:700">🟢 Đang chạy</span>' : '<span style="color:#dc2626;font-weight:700">🔴 Tắt</span>';
        var errorText = c.last_error ? '<div style="color:#dc2626;font-size:10px;margin-top:4px">⚠️ '+c.last_error+'</div>' : '';

        var banksHTML = '';
        banks.forEach(function(b) {
            var toggleBtn = b.is_active
                ? '<span class="pr-badge pr-nhan" style="cursor:pointer" onclick="_prToggleBank('+b.id+',false)">✅ Bật</span>'
                : '<span class="pr-badge pr-chua" style="cursor:pointer" onclick="_prToggleBank('+b.id+',true)">⬚ Tắt</span>';
            banksHTML += '<tr><td style="font-weight:700;padding:6px 8px">'+b.bank_name+'</td><td style="padding:6px 8px;color:var(--gray-500);font-size:11px">'+b.sender_filter+'</td><td style="padding:6px 8px">'+toggleBtn+'</td><td style="padding:6px 8px"><button onclick="_prDeleteBank('+b.id+')" style="background:none;border:none;cursor:pointer;font-size:14px" title="Xóa">🗑️</button></td></tr>';
        });

        var bodyHTML = '<div style="display:grid;gap:14px">'
            +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'
            +'<div class="form-group"><label style="font-size:12px;font-weight:700;color:var(--navy);margin-bottom:4px;display:block">📧 Gmail</label><input type="text" id="prGmail" class="form-control" value="'+(c.gmail_user||'')+'" placeholder="email@gmail.com" style="padding:10px 12px;font-size:13px"></div>'
            +'<div class="form-group"><label style="font-size:12px;font-weight:700;color:var(--navy);margin-bottom:4px;display:block">🔑 App Password '+(c.has_password?'<span style="color:#059669;font-size:10px">(đã lưu)</span>':'')+'</label><input type="password" id="prGmailPass" class="form-control" placeholder="'+(c.has_password?'●●●● (để trống = giữ cũ)':'xxxx xxxx xxxx xxxx')+'" style="padding:10px 12px;font-size:13px"></div>'
            +'</div>'
            +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'
            +'<div class="form-group"><label style="font-size:12px;font-weight:700;color:var(--navy);margin-bottom:4px;display:block">⏱️ Tần Suất Check</label><select id="prInterval" class="form-control" style="padding:10px 12px;font-size:13px"><option value="1"'+(c.check_interval==1?' selected':'')+'>1 phút</option><option value="2"'+(c.check_interval==2?' selected':'')+'>2 phút</option><option value="5"'+(c.check_interval==5?' selected':'')+'>5 phút</option><option value="10"'+(c.check_interval==10?' selected':'')+'>10 phút</option></select></div>'
            +'<div class="form-group"><label style="font-size:12px;font-weight:700;color:var(--navy);margin-bottom:4px;display:block">🔄 Trạng Thái</label><select id="prActive" class="form-control" style="padding:10px 12px;font-size:13px"><option value="true"'+(c.is_active?' selected':'')+'>🟢 Bật</option><option value="false"'+(!c.is_active?' selected':'')+'>🔴 Tắt</option></select></div>'
            +'</div>'
            +'<div style="background:var(--gray-50);border-radius:8px;padding:10px 14px;font-size:11px">'
            +'<span style="font-weight:700">📊 Thống kê:</span> Lần check cuối: <b>'+lastCheck+'</b> · Import lần cuối: <b>'+c.last_import_count+'</b> mã · Tổng đã import: <b>'+totalImported+'</b> mã · '+statusText
            +errorText
            +'</div>'
            +'<div style="border-top:1px solid var(--gray-200);padding-top:12px">'
            +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><span style="font-weight:800;color:var(--navy);font-size:12px">🏦 NGÂN HÀNG ĐANG THEO DÕI</span><button onclick="_prShowAddBank()" style="background:var(--gold);color:var(--navy);border:none;padding:4px 10px;border-radius:6px;font-size:10px;font-weight:700;cursor:pointer">➕ Thêm NH</button></div>'
            +'<table style="width:100%;font-size:12px;border-collapse:collapse"><thead><tr style="background:var(--gray-100)"><th style="padding:6px 8px;text-align:left;font-size:10px">Ngân Hàng</th><th style="padding:6px 8px;text-align:left;font-size:10px">Filter</th><th style="padding:6px 8px;font-size:10px">Trạng Thái</th><th style="padding:6px 8px;font-size:10px">Xóa</th></tr></thead><tbody id="prBanksList">'
            +banksHTML
            +'</tbody></table>'
            +'</div>'
            +'</div>';

        var footerHTML = '<button class="btn btn-secondary" onclick="closeModal()">Đóng</button><button class="btn" onclick="_prCheckNow()" style="background:var(--info);color:#fff;width:auto">🔍 Check Ngay</button><button class="btn btn-primary" onclick="_prSaveSettings()" style="width:auto">💾 Lưu Cài Đặt</button>';
        openModal('⚙️ Cài Đặt Email Tự Động', bodyHTML, footerHTML);
    } catch(e) { showToast('Lỗi tải cài đặt: '+e.message,'error'); }
}

async function _prSaveSettings() {
    var body = {
        gmail_user: document.getElementById('prGmail')?.value || '',
        check_interval: Number(document.getElementById('prInterval')?.value) || 2,
        is_active: document.getElementById('prActive')?.value === 'true'
    };
    var pass = document.getElementById('prGmailPass')?.value;
    if (pass) body.gmail_pass = pass;

    try {
        await apiCall('/api/payment-records/email-config','PUT',body);
        showToast('✅ Đã lưu cài đặt email');
        closeModal();
    } catch(e) { showToast('Lỗi: '+e.message,'error'); }
}

async function _prToggleBank(id, active) {
    await apiCall('/api/payment-records/banks/'+id,'PUT',{is_active:active});
    showToast(active ? '✅ Đã bật' : '⬚ Đã tắt');
    _prShowSettings();
}

async function _prDeleteBank(id) {
    if (!confirm('Xóa ngân hàng này?')) return;
    await apiCall('/api/payment-records/banks/'+id,'DELETE');
    showToast('🗑️ Đã xóa');
    _prShowSettings();
}

function _prShowAddBank() {
    var name = prompt('Tên ngân hàng (VD: Techcombank):');
    if (!name) return;
    var filter = prompt('Email/keyword filter (VD: techcombank):');
    if (!filter) return;
    apiCall('/api/payment-records/banks','POST',{bank_name:name,sender_filter:filter}).then(function(){
        showToast('✅ Đã thêm '+name);
        _prShowSettings();
    });
}

async function _prCheckNow() {
    try {
        await apiCall('/api/payment-records/check-email','POST');
        showToast('🔍 Đang kiểm tra email...');
        setTimeout(function() {
            var treeP = apiCall('/api/payment-records/tree');
            treeP.then(function(d) { _pr.tree = d.tree || []; _prRenderSidebar(); });
            _prLoadRecords();
        }, 3000);
    } catch(e) { showToast('Lỗi: '+e.message,'error'); }
}

// ========== TELEGRAM NOTIFICATION SETTINGS ==========
async function _prShowTgSettings() {
    try {
        var data = await apiCall('/api/payment-records/tg-config');
        var groupId = data.group_id || '';
        var bodyHTML = '<div style="display:grid;gap:16px">'
            +'<div style="background:linear-gradient(135deg,#e0f2fe,#bae6fd);border-radius:12px;padding:14px 18px;border:1px solid #7dd3fc">'
            +'<div style="font-size:13px;font-weight:800;color:#0c4a6e;margin-bottom:4px">📢 Thông Báo Giao Dịch Lên Telegram</div>'
            +'<div style="font-size:11px;color:#0369a1">Mỗi khi có giao dịch ngân hàng mới được import tự động từ email, hệ thống sẽ gửi thông báo lên nhóm Telegram.</div>'
            +'</div>'
            +'<div class="form-group">'
            +'<label style="font-size:12px;font-weight:700;color:var(--navy);margin-bottom:4px;display:block">🆔 Group ID Telegram</label>'
            +'<input type="text" id="prTgGroupId" class="form-control" value="'+groupId+'" placeholder="-100xxxxxxxxxx" style="padding:10px 12px;font-size:13px">'
            +'<div style="font-size:10px;color:var(--gray-400);margin-top:4px">Bot Token được lấy từ Cài Đặt Phân Tầng → Telegram Thông Báo</div>'
            +'</div>'
            +'<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:12px 16px">'
            +'<div style="font-size:11px;font-weight:700;color:#166534;margin-bottom:6px">📋 Format tin nhắn:</div>'
            +'<div style="font-size:12px;color:#15803d;font-family:monospace;background:#fff;padding:8px 12px;border-radius:6px;border:1px solid #dcfce7">🏦CK1-15-5-Y26 : 180.000đ Sacombank QR CHUYEN TIEN...</div>'
            +'</div>'
            +'</div>';
        var footerHTML = '<button class="btn btn-secondary" onclick="closeModal()">Đóng</button>'
            +'<button class="btn" onclick="_prTestTg()" style="background:#0088cc;color:#fff;width:auto">🧪 Test</button>'
            +'<button class="btn btn-primary" onclick="_prSaveTgConfig()" style="width:auto">💾 Lưu</button>';
        openModal('📢 Cài Đặt Telegram — Sổ Ghi Nhận Tiền', bodyHTML, footerHTML);
    } catch(e) { showToast('Lỗi: '+e.message,'error'); }
}

async function _prSaveTgConfig() {
    var groupId = document.getElementById('prTgGroupId')?.value || '';
    try {
        await apiCall('/api/payment-records/tg-config','PUT',{group_id:groupId});
        showToast('✅ Đã lưu cài đặt Telegram');
        closeModal();
    } catch(e) { showToast('Lỗi: '+e.message,'error'); }
}

async function _prTestTg() {
    var groupId = document.getElementById('prTgGroupId')?.value || '';
    if (!groupId.trim()) { showToast('Vui lòng nhập Group ID!','error'); return; }
    try {
        await apiCall('/api/payment-records/tg-test','POST',{group_id:groupId.trim()});
        showToast('✅ Gửi test thành công! Kiểm tra nhóm Telegram.');
    } catch(e) { showToast('Lỗi: '+(e.message||'Gửi thất bại'),'error'); }
}

// ========== DETAIL MODAL ==========
function _prShowDetail(id) {
    var r = _pr.records.find(function(x){return x.id===id;});
    if (!r) return;
    var up = _pr.userPerms || {};
    var srcLabels = {khach_hang:'Khách hàng',khach_hang_sll:'Khách hàng SLL',nha_van_chuyen:'Nhà vận chuyển'};
    var typeLabels = {thanh_toan:'Thanh toán',dat_coc:'Đặt cọc',tt_sll:'TT Số Lượng Lớn',pending:'⏳ Chờ xử lý'};
    var statusLabels = {thu_quy_nhan:'Thủ quỹ đã nhận',chua_bangiao:'Chưa bàn giao'};
    var payDate = r.payment_date ? r.payment_date.split('T')[0].split('-').reverse().join('/') : '';
    var custDisplay = (r.customer_name||'') + (r.customer_phone ? ' - '+r.customer_phone : '');
    var updatedAt = r.updated_at ? vnFormat(new Date(r.updated_at),'dd/MM HH:mm') : '';
    var histSrc = r.source === 'email_auto' ? '📧 Mail đã thêm ghi nhận.' : (r.created_by_name ? '👤 '+r.created_by_name+' đã thêm.' : '');
    var icon = r.payment_method === 'TM' ? '💵' : '🏦';

    // Action buttons (permission-based) — horizontal row
    var btnsHTML = '';
    if (up.pr_change_source) btnsHTML += '<div onclick="event.stopPropagation();_prChangeSource('+id+')" style="text-align:center;cursor:pointer;padding:10px 12px;transition:background .15s;border-radius:10px;flex:1" onmouseover="this.style.background=\'#f0f9ff\'" onmouseout="this.style.background=\'\'"><div style="width:44px;height:44px;border-radius:50%;background:#e0f2fe;display:flex;align-items:center;justify-content:center;margin:0 auto 6px;font-size:20px">🔄</div><div style="font-size:10px;font-weight:700;color:#0c4a6e">Đổi nguồn tiền</div></div>';
    if (up.pr_delete) btnsHTML += '<div onclick="event.stopPropagation();_prDeleteRecord('+id+')" style="text-align:center;cursor:pointer;padding:10px 12px;transition:background .15s;border-radius:10px;flex:1" onmouseover="this.style.background=\'#fef2f2\'" onmouseout="this.style.background=\'\'"><div style="width:44px;height:44px;border-radius:50%;background:#fee2e2;display:flex;align-items:center;justify-content:center;margin:0 auto 6px;font-size:20px">🗑️</div><div style="font-size:10px;font-weight:700;color:#991b1b">Xóa</div></div>';
    if (up.pr_edit) btnsHTML += '<div onclick="event.stopPropagation();_prEditRecord('+id+')" style="text-align:center;cursor:pointer;padding:10px 12px;transition:background .15s;border-radius:10px;flex:1" onmouseover="this.style.background=\'#f0fdf4\'" onmouseout="this.style.background=\'\'"><div style="width:44px;height:44px;border-radius:50%;background:#d1fae5;display:flex;align-items:center;justify-content:center;margin:0 auto 6px;font-size:20px">✏️</div><div style="font-size:10px;font-weight:700;color:#065f46">Chỉnh sửa</div></div>';
    if (up.pr_update_customer) btnsHTML += '<div onclick="event.stopPropagation();_prUpdateCustomer('+id+')" style="text-align:center;cursor:pointer;padding:10px 12px;transition:background .15s;border-radius:10px;flex:1" onmouseover="this.style.background=\'#fff7ed\'" onmouseout="this.style.background=\'\'"><div style="width:44px;height:44px;border-radius:50%;background:#fed7aa;display:flex;align-items:center;justify-content:center;margin:0 auto 6px;font-size:20px">💳</div><div style="font-size:10px;font-weight:700;color:#c2410c">Cập nhật mã<br>tiền KH</div></div>';

    var actionsBar = btnsHTML ? '<div style="display:flex;gap:4px;background:#f8fafc;border-radius:12px;padding:12px 8px;border:1px solid #e2e8f0;margin-bottom:16px">'+btnsHTML+'</div>' : '';

    var row = function(label,val){ return '<tr><td style="padding:8px 12px;font-size:12px;color:#64748b;font-weight:600;white-space:nowrap;vertical-align:top;width:130px">'+label+'</td><td style="padding:8px 12px;font-size:12.5px;font-weight:700;color:#1e293b">'+val+'</td></tr>'; };

    var infoTable = '<table style="width:100%;border-collapse:collapse">'
        +row('Ngày', payDate)
        +row('Mã thanh toán', icon+' '+r.payment_code)
        +row('Nguồn tiền', '<span style="color:#059669">'+icon+'</span> '+(srcLabels[r.money_source]||r.money_source||''))
        +row('Khách hàng', '<b>'+(custDisplay||'—')+'</b>')
        +row('CSKH', r.cskh_name||'—')
        +row('Loại tiền', typeLabels[r.payment_type]||r.payment_type||'')
        +row('Hình thức TT', r.payment_method||'')
        +row('Ngân hàng', r.bank_name||'—')
        +row('Nội dung CK', '<span style="word-break:break-all">'+(r.transfer_note||'—')+'</span>')
        +row('Đơn TT, cọc', (r.order_tt_coc ? '<b>'+r.order_tt_coc+'</b>' + (r.amount ? ' - đ'+_prFmt(r.amount) : '') : '—'))
        +row('Số tiền về TK', '<span style="font-size:14px;color:#d32f2f">💰 '+_prFmt(r.amount)+'</span>')
        +row('Trạng thái BG', statusLabels[r.handover_status]||r.handover_status||'')
        +row('Lịch sử CN', (updatedAt ? '🗓️ '+updatedAt+'<br>' : '')+(histSrc||''))
        +'</table>';

    var bodyHTML = actionsBar + infoTable;
    var titleText = r.payment_code+'| '+_prFmt(r.amount)+'|'+(r.transfer_note||'').substring(0,50);
    var footerHTML = '<button class="btn btn-secondary" onclick="closeModal()">Đóng</button>';
    openModal(titleText, bodyHTML, footerHTML);
    setTimeout(function(){ var mc = document.querySelector('.modal-content'); if(mc){ mc.style.maxWidth='720px'; mc.style.width='90vw'; } }, 30);
}

// ========== CHANGE SOURCE ==========
function _prChangeSource(id) {
    var r = _pr.records.find(function(x){return x.id===id;});
    if (!r) return;
    var sources = [{k:'khach_hang',l:'Khách hàng'},{k:'nha_van_chuyen',l:'Nhà vận chuyển'},{k:'khach_hang_sll',l:'Khách hàng SLL'}];
    var btns = sources.map(function(s){
        var isActive = r.money_source === s.k;
        var bg = isActive ? 'background:var(--navy);color:#fff' : 'background:#f1f5f9;color:#334155';
        return '<div onclick="_prDoChangeSource('+id+',\''+s.k+'\')" style="padding:10px 16px;border-radius:8px;cursor:pointer;font-weight:700;font-size:13px;text-align:center;transition:all .15s;'+bg+'">'+s.l+'</div>';
    }).join('');
    var bodyHTML = '<div style="display:grid;gap:8px">'+btns+'</div>';
    var footerHTML = '<button class="btn btn-secondary" onclick="closeModal()">Hủy bỏ</button>';
    openModal('Đổi nguồn tiền', bodyHTML, footerHTML);
}
async function _prDoChangeSource(id, src) {
    try {
        await apiCall('/api/payment-records/'+id+'/source','PUT',{money_source:src});
        showToast('✅ Đã đổi nguồn tiền');
        closeModal();
        var treeData = await apiCall('/api/payment-records/tree');
        _pr.tree = treeData.tree || [];
        _prRenderSidebar();
        await _prLoadRecords();
    } catch(e) { showToast('Lỗi: '+(e.message||'Không có quyền'),'error'); }
}

// ========== DELETE RECORD ==========
async function _prDeleteRecord(id) {
    var r = _pr.records.find(function(x){return x.id===id;});
    if (!r) return;
    if (!confirm('Xóa mã tiền '+r.payment_code+' ('+_prFmt(r.amount)+')?\nHành động này không thể hoàn tác!')) return;
    try {
        await apiCall('/api/payment-records/'+id,'DELETE');
        showToast('🗑️ Đã xóa '+r.payment_code);
        closeModal();
        var treeData = await apiCall('/api/payment-records/tree');
        _pr.tree = treeData.tree || [];
        _prRenderSidebar();
        await _prLoadRecords();
    } catch(e) { showToast('Lỗi: '+(e.message||'Không có quyền'),'error'); }
}

// ========== EDIT RECORD ==========
function _prEditRecord(id) {
    var r = _pr.records.find(function(x){return x.id===id;});
    if (!r) return;
    closeModal();
    var dateVal = r.payment_date ? r.payment_date.split('T')[0] : '';
    var staffOpts = _pr.staff.map(function(s){return '<option value="'+s.id+'"'+(s.id==r.cskh_user_id?' selected':'')+'>'+s.full_name+'</option>';}).join('');
    var bankOpts = _prBanks.map(function(b){return '<option value="'+b+'"'+(b===r.bank_name?' selected':'')+'>'+b+'</option>';}).join('');
    var srcOpts = [{k:'khach_hang',l:'Khách Hàng'},{k:'khach_hang_sll',l:'Khách Hàng SLL'},{k:'nha_van_chuyen',l:'Nhà Vận Chuyển'}];
    var srcOptsHTML = srcOpts.map(function(s){return '<option value="'+s.k+'"'+(s.k===r.money_source?' selected':'')+'>'+s.l+'</option>';}).join('');
    var typeOpts = [{k:'thanh_toan',l:'Thanh Toán'},{k:'dat_coc',l:'Đặt Cọc'},{k:'tt_sll',l:'TT Số Lượng Lớn'}];
    var typeOptsHTML = typeOpts.map(function(t){return '<option value="'+t.k+'"'+(t.k===r.payment_type?' selected':'')+'>'+t.l+'</option>';}).join('');

    var bodyHTML = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'
        +'<div class="form-group" style="grid-column:span 2"><div style="background:linear-gradient(135deg,var(--navy),var(--navy-light));color:var(--gold);padding:10px 16px;border-radius:8px;font-weight:800;font-size:14px;text-align:center;letter-spacing:1px">🏷️ '+r.payment_code+'</div></div>'
        +'<div class="form-group"><label style="font-size:12px;font-weight:700;color:var(--navy);margin-bottom:4px;display:block">Khách Hàng</label><input type="text" id="prEditCustName" class="form-control" value="'+(r.customer_name||'')+'" style="padding:10px 12px;font-size:13px"></div>'
        +'<div class="form-group"><label style="font-size:12px;font-weight:700;color:var(--navy);margin-bottom:4px;display:block">SĐT</label><input type="text" id="prEditCustPhone" class="form-control" value="'+(r.customer_phone||'')+'" style="padding:10px 12px;font-size:13px"></div>'
        +'<div class="form-group"><label style="font-size:12px;font-weight:700;color:var(--navy);margin-bottom:4px;display:block">CSKH</label><select id="prEditCSKH" class="form-control" style="padding:10px 12px;font-size:13px"><option value="">-- Chọn --</option>'+staffOpts+'</select></div>'
        +'<div class="form-group"><label style="font-size:12px;font-weight:700;color:var(--navy);margin-bottom:4px;display:block">Số Tiền <span style="color:var(--danger)">*</span></label><input type="number" id="prEditAmount" class="form-control" value="'+(r.amount||0)+'" style="padding:10px 12px;font-size:13px"></div>'
        +'<div class="form-group"><label style="font-size:12px;font-weight:700;color:var(--navy);margin-bottom:4px;display:block">Loại Tiền</label><select id="prEditType" class="form-control" style="padding:10px 12px;font-size:13px">'+typeOptsHTML+'</select></div>'
        +'<div class="form-group"><label style="font-size:12px;font-weight:700;color:var(--navy);margin-bottom:4px;display:block">Nguồn Tiền</label><select id="prEditSource" class="form-control" style="padding:10px 12px;font-size:13px">'+srcOptsHTML+'</select></div>'
        +'<div class="form-group"><label style="font-size:12px;font-weight:700;color:var(--navy);margin-bottom:4px;display:block">Ngân Hàng</label><select id="prEditBank" class="form-control" style="padding:10px 12px;font-size:13px"><option value="">-- Chọn --</option>'+bankOpts+'</select></div>'
        +'<div class="form-group"><label style="font-size:12px;font-weight:700;color:var(--navy);margin-bottom:4px;display:block">Đơn TT/Cọc</label><input type="text" id="prEditOrderTT" class="form-control" value="'+(r.order_tt_coc||'')+'" style="padding:10px 12px;font-size:13px"></div>'
        +'<div class="form-group"><label style="font-size:12px;font-weight:700;color:var(--navy);margin-bottom:4px;display:block">Đơn Áo Mẫu</label><input type="text" id="prEditOrderAM" class="form-control" value="'+(r.order_ao_mau||'')+'" style="padding:10px 12px;font-size:13px"></div>'
        +'<div class="form-group" style="grid-column:span 2"><label style="font-size:12px;font-weight:700;color:var(--navy);margin-bottom:4px;display:block">Nội Dung CK</label><input type="text" id="prEditNote" class="form-control" value="'+(r.transfer_note||'')+'" style="padding:10px 12px;font-size:13px"></div>'
        +'</div>';

    var footerHTML = '<button class="btn btn-secondary" onclick="closeModal()">Hủy</button><button class="btn btn-primary" onclick="_prSubmitEdit('+id+')" style="width:auto">💾 Lưu Chỉnh Sửa</button>';
    openModal('✏️ Chỉnh Sửa — '+r.payment_code, bodyHTML, footerHTML);
}

async function _prSubmitEdit(id) {
    var amount = document.getElementById('prEditAmount')?.value;
    if (!amount || Number(amount) <= 0) { showToast('Vui lòng nhập số tiền!','error'); return; }
    var body = {
        customer_name: document.getElementById('prEditCustName')?.value || '',
        customer_phone: document.getElementById('prEditCustPhone')?.value || '',
        cskh_user_id: document.getElementById('prEditCSKH')?.value || null,
        amount: Number(amount),
        payment_type: document.getElementById('prEditType')?.value || 'thanh_toan',
        money_source: document.getElementById('prEditSource')?.value || 'khach_hang',
        bank_name: document.getElementById('prEditBank')?.value || '',
        order_tt_coc: document.getElementById('prEditOrderTT')?.value || '',
        order_ao_mau: document.getElementById('prEditOrderAM')?.value || '',
        transfer_note: document.getElementById('prEditNote')?.value || ''
    };
    try {
        await apiCall('/api/payment-records/'+id,'PUT',body);
        showToast('✅ Đã lưu chỉnh sửa');
        closeModal();
        var treeData = await apiCall('/api/payment-records/tree');
        _pr.tree = treeData.tree || [];
        _prRenderSidebar();
        await _prLoadRecords();
    } catch(e) { showToast('Lỗi: '+(e.message||'Không có quyền'),'error'); }
}

// ========== PERMISSIONS SETTINGS ==========
async function _prShowPermissions() {
    try {
        var data = await apiCall('/api/payment-records/permissions');
        var perms = data.permissions || {};
        var actions = [
            {k:'pr_change_source', l:'🔄 Đổi Nguồn Tiền', desc:'Đổi nguồn tiền KH/NVC/SLL'},
            {k:'pr_delete', l:'🗑️ Xóa', desc:'Xóa mã tiền'},
            {k:'pr_edit', l:'✏️ Chỉnh Sửa', desc:'Sửa toàn bộ nội dung'},
            {k:'pr_update_customer', l:'💳 Cập Nhật Mã Tiền KH', desc:'Cập nhật thông tin khách hàng'}
        ];
        var roles = [
            {k:'giam_doc',l:'GĐ'},{k:'quan_ly_cap_cao',l:'QLCC'},{k:'quan_ly',l:'QL'},{k:'truong_phong',l:'TP'},{k:'nhan_vien',l:'NV'}
        ];
        var h = '<table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr><th style="text-align:left;padding:8px 10px;background:var(--navy);color:#fff;border-radius:8px 0 0 0">Nút</th>';
        roles.forEach(function(rl){ h += '<th style="text-align:center;padding:8px 6px;background:var(--navy);color:var(--gold);font-size:11px">'+rl.l+'</th>'; });
        h += '</tr></thead><tbody>';
        actions.forEach(function(a,ai){
            var bg = ai%2===0 ? '#f8fafc' : '#fff';
            h += '<tr style="background:'+bg+'"><td style="padding:10px;font-weight:700">'+a.l+'<div style="font-size:10px;color:#94a3b8;font-weight:400">'+a.desc+'</div></td>';
            var allowed = perms[a.k] || [];
            roles.forEach(function(rl){
                var checked = allowed.includes(rl.k) ? ' checked' : '';
                var disabled = rl.k === 'giam_doc' ? ' disabled' : '';
                h += '<td style="text-align:center;padding:10px"><input type="checkbox" class="pr-perm-cb" data-action="'+a.k+'" data-role="'+rl.k+'"'+checked+disabled+' style="width:18px;height:18px;cursor:pointer"></td>';
            });
            h += '</tr>';
        });
        h += '</tbody></table>';
        h += '<div style="margin-top:12px;font-size:10px;color:#94a3b8;text-align:center">⚠️ Giám Đốc luôn có quyền — không thể tắt</div>';

        var footerHTML = '<button class="btn btn-secondary" onclick="closeModal()">Đóng</button><button class="btn btn-primary" onclick="_prSavePermissions()" style="width:auto">💾 Lưu Phân Quyền</button>';
        openModal('🔐 Phân Quyền — Sổ Ghi Nhận Tiền', h, footerHTML);
    } catch(e) { showToast('Lỗi: '+e.message,'error'); }
}

async function _prSavePermissions() {
    var perms = {};
    var cbs = document.querySelectorAll('.pr-perm-cb');
    cbs.forEach(function(cb) {
        var action = cb.getAttribute('data-action');
        var role = cb.getAttribute('data-role');
        if (!perms[action]) perms[action] = ['giam_doc']; // GĐ always
        if (cb.checked && !perms[action].includes(role)) perms[action].push(role);
    });
    try {
        await apiCall('/api/payment-records/permissions','PUT',{permissions:perms});
        showToast('✅ Đã lưu phân quyền');
        closeModal();
        // Reload permissions
        var permData = await apiCall('/api/payment-records/permissions').catch(function(){return{};});
        _pr.userPerms = permData.user_permissions || {};
        _pr.allPerms = permData.permissions || {};
    } catch(e) { showToast('Lỗi: '+e.message,'error'); }
}

// ========== UPDATE CUSTOMER ==========
function _prUpdateCustomer(id) {
    var r = _pr.records.find(function(x){return x.id===id;});
    if (!r) return;
    var staffOpts = _pr.staff.map(function(s){return '<option value="'+s.id+'"'+(s.id==r.cskh_user_id?' selected':'')+'>'+s.full_name+'</option>';}).join('');
    var typeOpts = [{k:'thanh_toan',l:'Thanh Toán'},{k:'dat_coc',l:'Đặt Cọc'},{k:'tt_sll',l:'TT Số Lượng Lớn'}];
    var typeOptsHTML = typeOpts.map(function(t){return '<option value="'+t.k+'"'+(t.k===r.payment_type?' selected':'')+'>'+t.l+'</option>';}).join('');
    var icon = r.payment_method === 'TM' ? '💵' : '🏦';

    var bodyHTML = '<div style="background:linear-gradient(135deg,#f97316,#fb923c);color:#fff;padding:12px 16px;border-radius:10px;margin-bottom:16px;text-align:center">'
        +'<div style="font-size:11px;opacity:.8">Mã thanh toán</div>'
        +'<div style="font-size:18px;font-weight:900;letter-spacing:1px">'+icon+' '+r.payment_code+' — '+_prFmt(r.amount)+'đ</div></div>'
        +'<div style="display:grid;gap:14px">'
        +'<div class="form-group"><label style="font-size:12px;font-weight:700;color:var(--navy);margin-bottom:4px;display:block">👤 Tên Khách Hàng</label><input type="text" id="prUpdCustName" class="form-control" value="'+(r.customer_name||'')+'" placeholder="Nhập tên khách hàng" style="padding:10px 12px;font-size:13px"></div>'
        +'<div class="form-group"><label style="font-size:12px;font-weight:700;color:var(--navy);margin-bottom:4px;display:block">📞 Số Điện Thoại</label><input type="text" id="prUpdCustPhone" class="form-control" value="'+(r.customer_phone||'')+'" placeholder="Nhập SĐT" style="padding:10px 12px;font-size:13px"></div>'
        +'<div class="form-group"><label style="font-size:12px;font-weight:700;color:var(--navy);margin-bottom:4px;display:block">🧑‍💼 CSKH</label><select id="prUpdCSKH" class="form-control" style="padding:10px 12px;font-size:13px"><option value="">-- Chọn --</option>'+staffOpts+'</select></div>'
        +'<div class="form-group"><label style="font-size:12px;font-weight:700;color:var(--navy);margin-bottom:4px;display:block">💰 Loại Tiền</label><select id="prUpdType" class="form-control" style="padding:10px 12px;font-size:13px">'+typeOptsHTML+'</select></div>'
        +'<div class="form-group"><label style="font-size:12px;font-weight:700;color:var(--navy);margin-bottom:4px;display:block">📦 Đơn TT/Cọc</label><input type="text" id="prUpdOrderTT" class="form-control" value="'+(r.order_tt_coc||'')+'" placeholder="Mã đơn hàng" style="padding:10px 12px;font-size:13px"></div>'
        +'</div>';

    var footerHTML = '<button class="btn btn-secondary" onclick="closeModal()">Hủy</button><button class="btn btn-primary" onclick="_prSubmitUpdateCustomer('+id+')" style="width:auto;background:linear-gradient(135deg,#f97316,#ea580c)">💳 Cập Nhật</button>';
    openModal('💳 Cập Nhật Mã Tiền Khách Hàng', bodyHTML, footerHTML);
}

async function _prSubmitUpdateCustomer(id) {
    var body = {
        customer_name: document.getElementById('prUpdCustName')?.value || '',
        customer_phone: document.getElementById('prUpdCustPhone')?.value || '',
        cskh_user_id: document.getElementById('prUpdCSKH')?.value || null,
        payment_type: document.getElementById('prUpdType')?.value || 'thanh_toan',
        order_tt_coc: document.getElementById('prUpdOrderTT')?.value || ''
    };
    try {
        await apiCall('/api/payment-records/'+id,'PUT',body);
        showToast('✅ Đã cập nhật mã tiền KH');
        closeModal();
        await _prLoadRecords();
    } catch(e) { showToast('Lỗi: '+(e.message||'Không có quyền'),'error'); }
}
