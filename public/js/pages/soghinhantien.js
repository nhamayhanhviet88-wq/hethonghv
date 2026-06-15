// ========== SỔ GHI NHẬN TIỀN — Bộ Phận Văn Phòng ==========
var _pr = { tree: [], records: [], staff: [], filter: {}, editing: null, filterHandover: false };

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
.pr-tt{background:#d1fae5;color:#065f46}.pr-coc{background:linear-gradient(135deg,#f97316,#ea580c);color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.15)}.pr-sll{background:#dbeafe;color:#1d4ed8}
.pr-tlc{background:#ef4444;color:#fff;font-weight:800;text-shadow:0 1px 2px rgba(0,0,0,.2)}
.pr-row-tlc{background:rgba(239,68,68,.08)!important}
.pr-row-tlc:hover{background:rgba(239,68,68,.14)!important}
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
    var [treeData, staffData, permData, bankData, asData] = await Promise.all([
        apiCall('/api/payment-records/tree'),
        apiCall('/api/payment-records/staff'),
        apiCall('/api/payment-records/permissions').catch(function(){return{}}),
        apiCall('/api/payment-records/bank-list').catch(function(){return{}}),
        apiCall('/api/payment-records/appsheet-config').catch(function(){return{}})
    ]);
    _pr.tree = treeData.tree || [];
    _pr.staff = staffData.staff || [];
    _pr.userPerms = permData.user_permissions || {};
    _pr.allPerms = permData.permissions || {};
    _pr.trackedBanks = bankData.banks || _prBanks;
    _pr.appsheetEnabled = asData.enabled || false;
    _pr.filter = {};
    _pr.filterSearch = '';
    _pr.filterType = '';
    _pr.filterClaimState = '';
    _pr.filterSource = '';
    _pr.currentPage = 1;
    _pr.pageSize = 200;

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

function _prFilterAll() { _pr.filter={}; _pr.currentPage = 1; _prRenderSidebar(); _prLoadRecords(); }
function _prFilterYear(y) { _pr.filter={year:y}; _pr.currentPage = 1; _prRenderSidebar(); _prLoadRecords(); }
function _prFilterMonth(y,m) { _pr.filter={year:y,month:m}; _pr.currentPage = 1; _prRenderSidebar(); _prLoadRecords(); }
function _prFilterDay(y,m,d) { _pr.filter={year:y,month:m,day:d}; _pr.currentPage = 1; _prRenderSidebar(); _prLoadRecords(); }

function _prGetFilteredRecords() {
    return _pr.records.filter(function(r) {
        if (_pr.filterHandover && r.handover_status === 'thu_quy_nhan') return false;
        if (_pr.filterType && r.payment_type !== _pr.filterType) return false;

        // Lọc trạng thái nhận
        var isClaimed = (r.payment_type === 'dat_coc') || (r.payment_type === 'tra_lai_coc') || (r.total_order_codes && r.total_order_codes.trim() !== '') || (r.order_tt_coc && r.order_tt_coc.trim() !== '');
        if (_pr.filterClaimState === 'unclaimed' && isClaimed) return false;
        if (_pr.filterClaimState === 'claimed' && !isClaimed) return false;

        // Lọc nguồn tiền
        if (_pr.filterSource && r.money_source !== _pr.filterSource) return false;

        if (_pr.filterSearch) {
            var q = _pr.filterSearch.toLowerCase().trim();
            var matchCode = (r.payment_code || '').toLowerCase().includes(q);
            var matchName = (r.customer_name || '').toLowerCase().includes(q);
            var matchPhone = (r.customer_phone || '').toLowerCase().includes(q);
            
            var cleanAmtQuery = q.replace(/[\.,đ]/g, '');
            var matchAmount = cleanAmtQuery && String(r.amount || '').includes(cleanAmtQuery);
            
            if (!matchCode && !matchName && !matchPhone && !matchAmount) {
                return false;
            }
        }
        return true;
    });
}

async function _prLoadRecords() {
    var params = [];
    if (_pr.filter.year) params.push('year='+_pr.filter.year);
    if (_pr.filter.month) params.push('month='+_pr.filter.month);
    if (_pr.filter.day) params.push('day='+_pr.filter.day);
    var url = '/api/payment-records' + (params.length ? '?'+params.join('&') : '');
    var data = await apiCall(url);
    _pr.records = data.records || [];
    _pr.currentPage = 1;
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

    var filtered = _prGetFilteredRecords();
    var total = filtered.reduce(function(s,r){return s+Number(r.amount||0)},0);

    var isGD = (typeof currentUser !== 'undefined' && currentUser && currentUser.role === 'giam_doc');
    var settingsBtn = isGD ? '<button class="pr-settings-btn" onclick="_prShowSettings()">⚙️ Cài Đặt Email</button>' : '';
    var tgBtn = isGD ? '<button class="pr-settings-btn" onclick="_prShowTgSettings()" style="background:linear-gradient(135deg,#0088cc,#29b6f6);color:#fff">📢 Telegram</button>' : '';
    var permBtn = isGD ? '<button class="pr-settings-btn" onclick="_prShowPermissions()" style="background:linear-gradient(135deg,#7c3aed,#a78bfa);color:#fff">🔐 Phân Quyền</button>' : '';
    var asColor = _pr.appsheetEnabled ? 'linear-gradient(135deg,#059669,#10b981)' : 'linear-gradient(135deg,#dc2626,#ef4444)';
    var asIcon = _pr.appsheetEnabled ? '🟢' : '🔴';
    var asBtn = isGD ? '<button class="pr-settings-btn" onclick="_prToggleAppSheet()" style="background:'+asColor+';color:#fff">📊 AppSheet '+asIcon+'</button>' : '';
    var bankBtn = isGD ? '<button class="pr-settings-btn" onclick="_prShowBankManager()" style="background:linear-gradient(135deg,#0369a1,#0ea5e9);color:#fff">🏦 Quản Lý NH</button>' : '';
    var pendingCount = _pr.records.filter(function(r){return r.handover_status !== 'thu_quy_nhan';}).length;
    var handoverActive = _pr.filterHandover;
    var handoverBtn = '<button class="pr-settings-btn" onclick="_prToggleFilterHandover()" style="background:' + (handoverActive ? 'linear-gradient(135deg,#dc2626,#ef4444)' : 'linear-gradient(135deg,#f59e0b,#d97706)') + ';color:#fff;position:relative">' + (handoverActive ? '✅ Tất Cả' : '⏳ Chưa BG') + (pendingCount > 0 ? ' <span style="background:#fff;color:#dc2626;padding:1px 6px;border-radius:10px;font-size:9px;font-weight:900;margin-left:4px">' + pendingCount + '</span>' : '') + '</button>';

    var searchBox = '<div style="display:flex;align-items:center;gap:6px;background:#f1f5f9;padding:4px 10px;border-radius:8px;border:1px solid #cbd5e1;margin-right:10px">'
        + '<input type="text" id="prSearchInput" placeholder="Tìm tiền, mã, khách, SĐT..." value="' + (_pr.filterSearch || '') + '" style="border:none;background:transparent;outline:none;font-size:12.5px;width:200px" onkeydown="if(event.key===\'Enter\') _prDoSearch()" oninput="_prOnSearchInput(this.value)">'
        + '<button onclick="_prDoSearch()" style="background:var(--navy);color:#fff;border:none;padding:3px 10px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer">🔍 Tìm</button>'
        + (_pr.filterSearch ? '<button onclick="_prClearSearch()" style="background:none;border:none;color:#ef4444;font-size:12px;cursor:pointer;font-weight:bold;padding:0 4px">✕</button>' : '')
        + '</div>';

    tb.innerHTML = '<span class="pr-filter-info">📅 '+filterText+' <span class="pr-count">'+filtered.length+' mã</span></span>'
        + '<div style="display:flex;gap:6px;margin-left:10px">'
        + '<select id="prFilterClaim" style="padding:4px 10px;font-size:12px;border-radius:8px;border:1px solid #94a3b8;background:#f1f5f9;outline:none;cursor:pointer;font-weight:800;color:#0f172a;height:32px;font-family:inherit" onchange="_prChangeFilterClaim(this.value)">'
        + '<option value=""' + (_pr.filterClaimState === '' ? ' selected' : '') + '>-- Trạng thái nhận --</option>'
        + '<option value="unclaimed"' + (_pr.filterClaimState === 'unclaimed' ? ' selected' : '') + '>Chưa ai nhận</option>'
        + '<option value="claimed"' + (_pr.filterClaimState === 'claimed' ? ' selected' : '') + '>Đã nhận</option>'
        + '</select>'
        + '<select id="prFilterSource" style="padding:4px 10px;font-size:12px;border-radius:8px;border:1px solid #94a3b8;background:#f1f5f9;outline:none;cursor:pointer;font-weight:800;color:#0f172a;height:32px;font-family:inherit" onchange="_prChangeFilterSource(this.value)">'
        + '<option value=""' + (_pr.filterSource === '' ? ' selected' : '') + '>-- Nguồn tiền --</option>'
        + '<option value="khach_hang"' + (_pr.filterSource === 'khach_hang' ? ' selected' : '') + '>Khách hàng</option>'
        + '<option value="khach_hang_sll"' + (_pr.filterSource === 'khach_hang_sll' ? ' selected' : '') + '>Khách hàng SLL</option>'
        + '<option value="nha_van_chuyen"' + (_pr.filterSource === 'nha_van_chuyen' ? ' selected' : '') + '>Nhà vận chuyển</option>'
        + '</select>'
        + '</div>'
        + '<span style="flex:1"></span>'
        + searchBox
        + '<span style="font-size:13px;font-weight:800;color:var(--success);margin-right:15px">💰 '+_prFmt(total)+'</span>'
        + handoverBtn+permBtn+tgBtn+asBtn+bankBtn+settingsBtn+'<button class="pr-add-btn" onclick="_prShowAddModal()">➕ Tạo Mã Tiền</button>';
}

function _prChangeFilterClaim(val) {
    _pr.filterClaimState = val;
    _pr.currentPage = 1;
    _prRenderToolbar();
    _prRenderTable();
}

function _prChangeFilterSource(val) {
    _pr.filterSource = val;
    _pr.currentPage = 1;
    _prRenderToolbar();
    _prRenderTable();
}

function _prRenderTable() {
    var wrap = document.getElementById('prTableWrap');
    if (!wrap) return;
    if (_pr.records.length === 0) {
        wrap.innerHTML = '<div style="text-align:center;padding:60px 20px;color:var(--gray-400)"><div style="font-size:40px;margin-bottom:12px">💵</div><div style="font-size:13px;font-weight:600">Chưa có mã thanh toán nào</div></div>';
        return;
    }

    var filtered = _prGetFilteredRecords();
    if (filtered.length === 0) {
        wrap.innerHTML = '<div style="text-align:center;padding:60px 20px;color:var(--gray-400)"><div style="font-size:40px;margin-bottom:12px">🔍</div><div style="font-size:13px;font-weight:600">Không tìm thấy mã tiền nào phù hợp bộ lọc</div></div>';
        return;
    }

    var cols = [
        {k:'code',l:'Mã TT',w:115},{k:'customer',l:'Khách Hàng',w:140},{k:'cskh',l:'CSKH',w:85},
        {k:'amount',l:'Số Tiền',w:90},{k:'balance',l:'Tiền Dư',w:95},{k:'type',l:'Loại',w:110},{k:'order',l:'Mã Đơn TT/Cọc',w:140},
        {k:'note',l:'Nội Dung',w:140},{k:'source',l:'Nguồn',w:70},
        {k:'bank',l:'NH',w:65},{k:'cod',l:'Tổng COD',w:80},
        {k:'ship',l:'Cước VC',w:75},{k:'history',l:'Lịch Sử CN',w:120},{k:'status',l:'Trạng Thái BG',w:100}
    ];
    var totalW = cols.reduce(function(s,c){return s+c.w},0);
    var h = '<table class="pr-table" style="min-width:'+totalW+'px"><thead><tr>';
    cols.forEach(function(c){
        if (c.k === 'type') {
            var typeFilterHTML = '<select onchange="event.stopPropagation(); _prFilterByType(this.value)" style="background:var(--navy);color:#fff;border:1px solid rgba(255,255,255,0.3);border-radius:4px;padding:2px 4px;font-size:9.5px;font-weight:800;cursor:pointer;outline:none;width:100%;text-transform:uppercase">'
                + '<option value=""' + (_pr.filterType === '' ? ' selected' : '') + '>LOẠI (TẤT CẢ)</option>'
                + '<option value="thanh_toan"' + (_pr.filterType === 'thanh_toan' ? ' selected' : '') + '>Thanh Toán</option>'
                + '<option value="dat_coc"' + (_pr.filterType === 'dat_coc' ? ' selected' : '') + '>Đặt Cọc</option>'
                + '<option value="tt_sll"' + (_pr.filterType === 'tt_sll' ? ' selected' : '') + '>SLL</option>'
                + '<option value="tra_lai_coc"' + (_pr.filterType === 'tra_lai_coc' ? ' selected' : '') + '>Trả Lại Cọc</option>'
                + '<option value="pending"' + (_pr.filterType === 'pending' ? ' selected' : '') + '>Chờ xử lý</option>'
                + '</select>';
            h += '<th style="width:'+c.w+'px;padding:4px 6px">' + typeFilterHTML + '</th>';
        } else {
            h += '<th style="width:'+c.w+'px">'+c.l+'</th>';
        }
    });
    h += '</tr></thead><tbody>';

    var typeLabels = {thanh_toan:'Thanh Toán',dat_coc:'Đặt Cọc',tt_sll:'SLL',pending:'⏳',tra_lai_coc:'Trả Lại Cọc'};
    var typeClass = {thanh_toan:'pr-tt',dat_coc:'pr-coc',tt_sll:'pr-sll',pending:'pr-pending',tra_lai_coc:'pr-tlc'};
    var srcLabels = {khach_hang:'KH',khach_hang_sll:'KH SLL',nha_van_chuyen:'NVC'};
    var srcStyles = {
        khach_hang: 'background:#e0f2fe;color:#0369a1;border:1px solid #bae6fd',
        khach_hang_sll: 'background:#fef3c7;color:#b45309;border:1px solid #fde68a',
        nha_van_chuyen: 'background:#fee2e2;color:#b91c1c;border:1px solid #fca5a5'
    };

    // Pagination
    var totalCount = filtered.length;
    var totalPages = Math.ceil(totalCount / _pr.pageSize);
    if (_pr.currentPage > totalPages) _pr.currentPage = Math.max(1, totalPages);
    
    var startIdx = (_pr.currentPage - 1) * _pr.pageSize;
    var endIdx = startIdx + _pr.pageSize;
    var pageRecords = filtered.slice(startIdx, endIdx);

    pageRecords.forEach(function(r) {
        var methodBadge = r.payment_method === 'TM' ? '<span class="pr-badge pr-tm">💵'+r.payment_code+'</span>' : '<span class="pr-badge pr-ck">🏦'+r.payment_code+'</span>';
        var custDisplay = (r.customer_name||'') + (r.customer_phone ? ' - '+r.customer_phone : '');
        if (r.payment_type === 'parent_sll' && r.sll_customer_names) {
            custDisplay = r.sll_customer_names;
        }
        var typeBadge = '<span class="pr-badge '+(typeClass[r.payment_type]||'pr-tt')+'">'+(typeLabels[r.payment_type]||'TT')+'</span>';
        var statusBadge = r.handover_status === 'thu_quy_nhan' ? '<span class="pr-badge pr-nhan" style="cursor:pointer" onclick="_prToggleHandover('+r.id+',\'chua_bangiao\')">✅ TQ Nhận</span>' : '<span class="pr-badge pr-chua" style="cursor:pointer" onclick="_prToggleHandover('+r.id+',\'thu_quy_nhan\')">⏳ Chưa BG</span>';
        var updatedAt = r.updated_at ? _prVnFormat(new Date(r.updated_at),'dd/MM HH:mm') : '';
        var payDate = r.payment_date ? r.payment_date.split('T')[0].split('-').reverse().join('/') : '';

        var rowClass = r.payment_type === 'tra_lai_coc' ? ' class="pr-row-tlc"' : '';
        h += '<tr style="cursor:pointer"'+rowClass+' onclick="_prShowDetail('+r.id+')">';
        h += '<td style="font-weight:700">'+methodBadge+'</td>';
        h += '<td title="'+(custDisplay||'')+'" style="font-weight:600;color:var(--navy)">'+custDisplay+'</td>';
        h += '<td style="color:var(--info);font-weight:600">'+(r.cskh_name||'')+'</td>';
        var tienDuDisplay = '';
        if (r.payment_type === 'pending') {
            tienDuDisplay = '<span style="font-weight:700;color:#94a3b8;font-size:12.5px">-</span>';
        } else if (r.payment_type === 'parent_sll') {
            var tienDu = Math.max(0, Number(r.amount) - Number(r.sll_children_sum || 0));
            if (tienDu > 0) {
                tienDuDisplay = '<span style="font-weight:900;color:#ea580c;font-size:12.5px">' + _prFmt(tienDu) + '</span>';
            } else {
                tienDuDisplay = '<span style="background:#fff;border:1px solid #22c55e;color:#15803d;padding:2px 8px;border-radius:6px;font-weight:800;font-size:11px;display:inline-block;box-shadow:0 1px 2px rgba(0,0,0,0.05)">0đ</span>';
            }
        } else {
            tienDuDisplay = '<span style="background:#fff;border:1px solid #22c55e;color:#15803d;padding:2px 8px;border-radius:6px;font-weight:800;font-size:11px;display:inline-block;box-shadow:0 1px 2px rgba(0,0,0,0.05)">0đ</span>';
        }

        h += '<td style="font-weight:900;color:#d32f2f;text-align:center;font-size:12.5px">'+_prFmt(r.amount)+'</td>';
        h += '<td style="text-align:center">'+tienDuDisplay+'</td>';
        h += '<td>'+typeBadge+'</td>';
        var displayOrder = r.order_tt_coc || '';
        if (r.payment_type === 'parent_sll' && r.sll_order_codes) {
            displayOrder = r.sll_order_codes;
        } else if (r.total_order_codes && r.total_order_codes.trim()) {
            displayOrder = r.total_order_codes;
        }
        h += '<td title="'+(displayOrder||'')+'">'+(displayOrder||'')+'</td>';
        h += '<td title="'+(r.transfer_note||'')+'" style="color:var(--gray-600)">'+(r.transfer_note||'')+'</td>';
        var srcStyle = srcStyles[r.money_source] || 'background:#f3f4f6;color:#374151;border:1px solid #e5e7eb';
        h += '<td><span class="pr-badge" style="'+srcStyle+'">'+(srcLabels[r.money_source]||r.money_source||'')+'</span></td>';
        h += '<td style="font-weight:600">'+(r.bank_name||'')+'</td>';
        h += '<td style="text-align:right">'+(Number(r.total_cod)?_prFmt(r.total_cod):'')+'</td>';
        h += '<td style="text-align:right">'+(Number(r.shipping_fee)?_prFmt(r.shipping_fee):'')+'</td>';
        
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
        h += '</tr>';
    });
    h += '</tbody></table>';

    if (totalPages > 1) {
        h += '<div class="pr-pagination" style="display:flex;align-items:center;justify-content:center;gap:6px;padding:12px 16px;background:#fff;border-top:1px solid var(--gray-200);border-bottom:1px solid var(--gray-200);flex-wrap:wrap">';
        
        var prevDisabled = _pr.currentPage === 1 ? ' disabled style="opacity:.5;cursor:not-allowed"' : 'onclick="_prGoToPage(' + (_pr.currentPage - 1) + ')"';
        h += '<button class="btn btn-secondary"' + prevDisabled + ' style="padding:4px 10px;font-size:11px;font-weight:700">◀ Trước</button>';
        
        var startPage = Math.max(1, _pr.currentPage - 2);
        var endPage = Math.min(totalPages, startPage + 4);
        if (endPage - startPage < 4) {
            startPage = Math.max(1, endPage - 4);
        }
        
        if (startPage > 1) {
            h += '<button class="btn btn-secondary" onclick="_prGoToPage(1)" style="padding:4px 8px;font-size:11px">1</button>';
            if (startPage > 2) h += '<span style="color:var(--gray-400);font-size:11px;padding:0 4px">...</span>';
        }
        
        for (var p = startPage; p <= endPage; p++) {
            if (p < 1) continue;
            var activeStyle = p === _pr.currentPage 
                ? 'background:var(--navy);color:#fff;border-color:var(--navy);font-weight:700' 
                : '';
            h += '<button class="btn btn-secondary" onclick="_prGoToPage(' + p + ')" style="padding:4px 8px;font-size:11px;' + activeStyle + '">' + p + '</button>';
        }
        
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) h += '<span style="color:var(--gray-400);font-size:11px;padding:0 4px">...</span>';
            h += '<button class="btn btn-secondary" onclick="_prGoToPage(' + totalPages + ')" style="padding:4px 8px;font-size:11px">' + totalPages + '</button>';
        }
        
        var nextDisabled = _pr.currentPage === totalPages ? ' disabled style="opacity:.5;cursor:not-allowed"' : 'onclick="_prGoToPage(' + (_pr.currentPage + 1) + ')"';
        h += '<button class="btn btn-secondary"' + nextDisabled + ' style="padding:4px 10px;font-size:11px;font-weight:700">Sau ▶</button>';
        
        h += '<span style="font-size:11.5px;color:var(--gray-500);margin-left:12px;font-weight:600">Trang ' + _pr.currentPage + ' / ' + totalPages + ' (Hiển thị ' + (startIdx + 1) + '-' + Math.min(endIdx, totalCount) + ' trong ' + totalCount + ' mã)</span>';
        
        h += '</div>';
    }

    wrap.innerHTML = h;
}

function _prToggleFilterHandover() {
    _pr.filterHandover = !_pr.filterHandover;
    _pr.currentPage = 1;
    _prRenderToolbar();
    _prRenderTable();
}

function _prFilterByType(type) {
    _pr.filterType = type;
    _pr.currentPage = 1;
    _prRenderToolbar();
    _prRenderTable();
}

function _prDoSearch() {
    var val = document.getElementById('prSearchInput')?.value || '';
    _pr.filterSearch = val;
    _pr.currentPage = 1;
    _prRenderToolbar();
    _prRenderTable();
}

function _prClearSearch() {
    _pr.filterSearch = '';
    var input = document.getElementById('prSearchInput');
    if (input) input.value = '';
    _pr.currentPage = 1;
    _prRenderToolbar();
    _prRenderTable();
}

var _prSearchDebounce = null;
function _prOnSearchInput(val) {
    clearTimeout(_prSearchDebounce);
    _prSearchDebounce = setTimeout(function() {
        _pr.filterSearch = val;
        _pr.currentPage = 1;
        _prRenderTable();
        _prUpdateToolbarCounts();
    }, 250);
}

function _prUpdateToolbarCounts() {
    var filtered = _prGetFilteredRecords();
    var total = filtered.reduce(function(s,r){return s+Number(r.amount||0)},0);
    var countEl = document.querySelector('.pr-toolbar .pr-count');
    if (countEl) countEl.textContent = filtered.length + ' mã';
    var amountEl = document.querySelector('.pr-toolbar span[style*="color:var(--success)"]');
    if (amountEl) amountEl.innerHTML = '💰 ' + _prFmt(total);
}

function _prGoToPage(p) {
    _pr.currentPage = p;
    _prRenderTable();
    var wrap = document.getElementById('prTableWrap');
    if (wrap) wrap.scrollTop = 0;
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
    // Refresh bank list first
    try {
        var bankData = await apiCall('/api/payment-records/bank-list').catch(function(){return{}});
        _pr.trackedBanks = bankData.banks || _prBanks;
    } catch {}
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
        +'<div class="form-group">'+lbl('🏷️ Nguồn Tiền',false)+'<div id="prSourceDisplay" style="padding:10px 12px;background:#f0fdf4;border-radius:8px;font-weight:700;font-size:13px;color:#065f46;border:1px solid #bbf7d0">✅ Khách Hàng</div><input type="hidden" id="prSource" value="khach_hang"></div>'
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

    // Auto update source based on bank selection
    var sourceInput = document.getElementById('prSource');
    var sourceDisplay = document.getElementById('prSourceDisplay');
    if (sourceInput && sourceDisplay) {
        if (bank === 'Nhà Vận Chuyển') {
            sourceInput.value = 'nha_van_chuyen';
            sourceDisplay.innerHTML = '✅ Nhà Vận Chuyển';
            sourceDisplay.style.background = '#fef2f2';
            sourceDisplay.style.color = '#991b1b';
            sourceDisplay.style.borderColor = '#fca5a5';
        } else {
            sourceInput.value = 'khach_hang';
            sourceDisplay.innerHTML = '✅ Khách Hàng';
            sourceDisplay.style.background = '#f0fdf4';
            sourceDisplay.style.color = '#065f46';
            sourceDisplay.style.borderColor = '#bbf7d0';
        }
    }
}

function _prToggleBankRow() {
    var method = document.getElementById('prMethod')?.value;
    var row = document.getElementById('prBankRow');
    if (!row) return;
    if (method === 'TM') {
        row.style.display = 'none';
        document.getElementById('prBank').value = '';
        var sourceInput = document.getElementById('prSource');
        var sourceDisplay = document.getElementById('prSourceDisplay');
        if (sourceInput && sourceDisplay) {
            sourceInput.value = 'khach_hang';
            sourceDisplay.innerHTML = '✅ Khách Hàng';
            sourceDisplay.style.background = '#f0fdf4';
            sourceDisplay.style.color = '#065f46';
            sourceDisplay.style.borderColor = '#bbf7d0';
        }
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

var _prSubmitting = false;
async function _prSubmitAdd() {
    if (_prSubmitting) return;
    var amount = document.getElementById('prAmount')?.value;
    var bank = document.getElementById('prBank')?.value;
    var note = document.getElementById('prNote')?.value;
    var method = document.getElementById('prMethod')?.value || 'CK';
    if (!amount || Number(amount) <= 0) { showToast('Vui lòng nhập số tiền!','error'); return; }
    if (method === 'CK' && !bank) { showToast('Vui lòng chọn ngân hàng!','error'); return; }
    if (!note || !note.trim()) { showToast('Vui lòng nhập nội dung!','error'); return; }

    _prSubmitting = true;
    var submitBtn = document.querySelector('.modal-footer .btn-primary');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = '⏳ Đang tạo...'; submitBtn.style.opacity = '0.6'; }

    var body = {
        payment_method: document.getElementById('prMethod')?.value || 'CK',
        payment_date: document.getElementById('prDate')?.value,
        customer_name: '',
        customer_phone: '',
        cskh_user_id: null,
        amount: Number(amount),
        payment_type: 'pending',
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
    finally { _prSubmitting = false; }
}

// Helper: _prVnFormat — local date formatter (does NOT override global vnFormat)
function _prVnFormat(d, fmt) {
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

        var lastCheck = c.last_check_at ? _prVnFormat(new Date(c.last_check_at), 'dd/MM HH:mm') : 'Chưa check';
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

// ========== DAILY REPORT CONFIG ==========
async function _prShowReportConfig() {
    try {
        var data = await apiCall('/api/payment-records/report-config');
        var groupId = data.group_id || '';
        var reportTime = data.report_time || '21:00';
        var bodyHTML = '<div style="display:grid;gap:16px">'
            +'<div style="background:linear-gradient(135deg,#d1fae5,#a7f3d0);border-radius:12px;padding:14px 18px;border:1px solid #6ee7b7">'
            +'<div style="font-size:13px;font-weight:800;color:#065f46;margin-bottom:4px">📊 Tổng Kết Tiền Thu Hàng Ngày</div>'
            +'<div style="font-size:11px;color:#047857">Tự động gửi báo cáo tổng số tiền THU trong ngày lên nhóm Telegram Tổng Kết HV theo giờ đã cài đặt.</div>'
            +'</div>'
            +'<div class="form-group">'
            +'<label style="font-size:12px;font-weight:700;color:var(--navy);margin-bottom:4px;display:block">🆔 Group ID Telegram (Tổng Kết HV)</label>'
            +'<input type="text" id="prReportGroupId" class="form-control" value="'+groupId+'" placeholder="-100xxxxxxxxxx" style="padding:10px 12px;font-size:13px">'
            +'</div>'
            +'<div class="form-group">'
            +'<label style="font-size:12px;font-weight:700;color:var(--navy);margin-bottom:4px;display:block">⏰ Giờ Gửi Báo Cáo (Giờ VN)</label>'
            +'<input type="time" id="prReportTime" class="form-control" value="'+reportTime+'" style="padding:10px 12px;font-size:13px" data-num-formatted="skip">'
            +'</div>'
            +'<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:12px 16px">'
            +'<div style="font-size:11px;font-weight:700;color:#166534;margin-bottom:6px">📋 Format tin nhắn:</div>'
            +'<div style="font-size:12px;color:#15803d;font-family:monospace;background:#fff;padding:8px 12px;border-radius:6px;border:1px solid #dcfce7"><b>TỔNG SỐ TIỀN THU</b> ngày 15/05/2026:<br><b>15.000.000đ</b> CK + <b>5.000.000đ</b> TM = <b>20.000.000đ</b></div>'
            +'</div>'
            +'</div>';
        var footerHTML = '<button class="btn btn-secondary" onclick="closeModal()">Đóng</button>'
            +'<button class="btn" onclick="_prSendReport()" style="background:#059669;color:#fff;width:auto">📤 Gửi Thử</button>'
            +'<button class="btn btn-primary" onclick="_prSaveReportConfig()" style="width:auto">💾 Lưu</button>';
        openModal('📊 Tổng Kết Hàng Ngày — Telegram', bodyHTML, footerHTML);
    } catch(e) { showToast('Lỗi: '+e.message,'error'); }
}

async function _prSaveReportConfig() {
    var groupId = document.getElementById('prReportGroupId')?.value || '';
    var reportTime = document.getElementById('prReportTime')?.value || '21:00';
    try {
        await apiCall('/api/payment-records/report-config','PUT',{group_id:groupId,report_time:reportTime});
        showToast('✅ Đã lưu cài đặt tổng kết hàng ngày');
        closeModal();
    } catch(e) { showToast('Lỗi: '+e.message,'error'); }
}

async function _prSendReport() {
    var groupId = document.getElementById('prReportGroupId')?.value || '';
    if (!groupId.trim()) { showToast('Vui lòng nhập Group ID!','error'); return; }
    try {
        var result = await apiCall('/api/payment-records/report-send','POST',{group_id:groupId.trim()});
        if (result.success) {
            showToast('✅ Đã gửi tổng kết! Kiểm tra nhóm Telegram.');
        } else {
            showToast('Lỗi: '+(result.error||'Gửi thất bại'),'error');
        }
    } catch(e) { showToast('Lỗi: '+(e.message||'Gửi thất bại'),'error'); }
}

// ========== DETAIL MODAL ==========
async function _prShowDetail(id) {
    var r = _pr.records.find(function(x){return x.id===id;});
    if (!r) return;
    var up = _pr.userPerms || {};
    var srcLabels = {khach_hang:'Khách hàng',khach_hang_sll:'Khách hàng SLL',nha_van_chuyen:'Nhà vận chuyển'};
    var typeLabels = {thanh_toan:'Thanh toán',dat_coc:'Đặt cọc',tt_sll:'TT Số Lượng Lớn',pending:'⏳ Chờ xử lý',tra_lai_coc:'Trả Lại Cọc',parent_sll:'📊 SLL (Mã Cha)',child_sll:'📊 SLL (Mã Con)'};
    var statusLabels = {thu_quy_nhan:'Thủ quỹ đã nhận',chua_bangiao:'Chưa bàn giao'};
    var payDate = r.payment_date ? r.payment_date.split('T')[0].split('-').reverse().join('/') : '';
    var custDisplay = (r.customer_name||'') + (r.customer_phone ? ' - '+r.customer_phone : '');
    if (r.payment_type === 'parent_sll' && r.sll_customer_names) {
        custDisplay = r.sll_customer_names;
    }
    var updatedAt = r.updated_at ? _prVnFormat(new Date(r.updated_at),'dd/MM HH:mm') : '';
    var histSrc = r.source === 'email_auto' ? '📧 Mail đã thêm ghi nhận.' : (r.created_by_name ? '👤 '+r.created_by_name+' đã thêm.' : '');
    var icon = r.payment_method === 'TM' ? '💵' : '🏦';

    var isGD = (typeof currentUser !== 'undefined' && currentUser && currentUser.role === 'giam_doc');
    var isTrinh = (typeof currentUser !== 'undefined' && currentUser && currentUser.role === 'quan_ly_cap_cao' && currentUser.username === 'trinh');
    var deptName = (typeof currentUser !== 'undefined' && currentUser && currentUser.department_name) ? currentUser.department_name : '';
    var isKT = deptName.toLowerCase().indexOf('kế toán') !== -1 || deptName.toLowerCase().indexOf('ke toan') !== -1;
    var isClaimed = (r.payment_type === 'dat_coc') || (r.payment_type === 'tra_lai_coc') || (r.total_order_codes && r.total_order_codes.trim() !== '') || (r.order_tt_coc && r.order_tt_coc.trim() !== '');

    var isParentSll = r.payment_type === 'parent_sll';

    // Action buttons (permission-based) — horizontal row
    var btnsHTML = '';
    if (up.pr_delete) btnsHTML += '<div onclick="event.stopPropagation();_prDeleteRecord('+id+')" style="text-align:center;cursor:pointer;padding:10px 12px;transition:background .15s;border-radius:10px;flex:1" onmouseover="this.style.background=\'#fef2f2\'" onmouseout="this.style.background=\'\'"><div style="width:44px;height:44px;border-radius:50%;background:#fee2e2;display:flex;align-items:center;justify-content:center;margin:0 auto 6px;font-size:20px">🗑️</div><div style="font-size:10px;font-weight:700;color:#991b1b">Xóa</div></div>';
    
    var canEdit = up.pr_edit && (!isClaimed || (isParentSll && (isGD || isTrinh)));
    if (canEdit) btnsHTML += '<div onclick="event.stopPropagation();_prEditRecord('+id+')" style="text-align:center;cursor:pointer;padding:10px 12px;transition:background .15s;border-radius:10px;flex:1" onmouseover="this.style.background=\'#f0fdf4\'" onmouseout="this.style.background=\'\'"><div style="width:44px;height:44px;border-radius:50%;background:#d1fae5;display:flex;align-items:center;justify-content:center;margin:0 auto 6px;font-size:20px">✏️</div><div style="font-size:10px;font-weight:700;color:#065f46">Chỉnh sửa</div></div>';
    
    var canUpdateCust = isKT ? (r.money_source === 'khach_hang' || r.money_source === 'khach_hang_sll') : !!up.pr_update_customer;
    if (canUpdateCust && !isClaimed && !isParentSll) btnsHTML += '<div onclick="event.stopPropagation();_prUpdateCustomer('+id+')" style="text-align:center;cursor:pointer;padding:10px 12px;transition:background .15s;border-radius:10px;flex:1" onmouseover="this.style.background=\'#fff7ed\'" onmouseout="this.style.background=\'\'"><div style="width:44px;height:44px;border-radius:50%;background:#fed7aa;display:flex;align-items:center;justify-content:center;margin:0 auto 6px;font-size:20px">💳</div><div style="font-size:10px;font-weight:700;color:#c2410c">Cập Nhật Tiền<br>Đơn Hàng</div></div>';

    var actionsBar = btnsHTML ? '<div style="display:flex;gap:4px;background:#f8fafc;border-radius:12px;padding:12px 8px;border:1px solid #e2e8f0;margin-bottom:16px">'+btnsHTML+'</div>' : '';

    var row = function(label,val){ return '<tr><td style="padding:8px 12px;font-size:12px;color:#64748b;font-weight:600;white-space:nowrap;vertical-align:top;width:130px">'+label+'</td><td style="padding:8px 12px;font-size:12.5px;font-weight:700;color:#1e293b">'+val+'</td></tr>'; };

    var childrenHTML = '';
    if (isParentSll) {
        try {
            var childRes = await apiCall('/api/payment-records/parent/' + id + '/children');
            var children = childRes.children || [];
            var splitRecords = childRes.splitRecords || [];
            
            var splitHTML = '';
            if (splitRecords.length > 0) {
                var splitItems = splitRecords.map(function(s) {
                    return '<div style="margin-top:8px;padding:10px 14px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;display:flex;align-items:center;justify-content:space-between;gap:8px">'
                        + '<div style="font-weight:700;font-size:12px;color:#b45309;display:flex;align-items:center;gap:6px">'
                        + '<span>💸 Mã Tiền Thừa Tách ra:</span>'
                        + '<span style="background:#fef3c7;border:1px solid #fde68a;color:#d97706;padding:2px 8px;border-radius:6px;font-family:monospace;font-size:12.5px;font-weight:800">' + s.payment_code + '</span>'
                        + '</div>'
                        + '<div style="font-weight:800;font-size:13px;color:#dc2626">' + _prFmt(s.amount) + '</div>'
                        + '</div>';
                }).join('');
                splitHTML = splitItems;
            }

            if (children.length > 0) {
                var rowsHTML = children.map(function(c) {
                    return '<tr style="border-bottom:1px solid #f1f5f9">'
                        + '<td style="padding:6px 12px;font-weight:700;color:#475569">' + c.payment_code + '</td>'
                        + '<td style="padding:6px 12px"><span style="background:#7c3aed;color:#fff;padding:2px 6px;border-radius:4px;font-weight:700">' + (c.order_tt_coc || '—') + '</span></td>'
                        + '<td style="padding:6px 12px;text-align:right;font-weight:700;color:#d32f2f">' + _prFmt(c.amount) + '</td>'
                        + '</tr>';
                }).join('');
                
                var parentAmt = Number(r.amount) || 0;
                var childSum = children.reduce(function(sum, ch){ return sum + (Number(ch.amount)||0); }, 0);
                var remDu = parentAmt - childSum;
                var remDuHTML = '';
                if (remDu > 0) {
                    remDuHTML = '<div style="margin-top:8px;padding:10px 14px;background:#fff7ed;border:1px solid #ffedd5;border-radius:8px;display:flex;align-items:center;justify-content:space-between;gap:8px">'
                        + '<div style="font-weight:700;font-size:12px;color:#c2410c;display:flex;align-items:center;gap:6px">'
                        + '<span>💵 Tiền dư chưa phân bổ:</span>'
                        + '</div>'
                        + '<div style="font-weight:800;font-size:13px;color:#ea580c">' + _prFmt(remDu) + '</div>'
                        + '</div>';
                }

                var unpaidMsgs = [];
                children.forEach(function(c) {
                    var remDebt = Number(c.order_remaining) || 0;
                    if (remDebt > 0) {
                        unpaidMsgs.push('⚠️ Đơn <strong>' + (c.order_tt_coc || '—') + '</strong> còn <strong>' + _prFmt(remDebt) + '</strong> chưa được thanh toán<br>Do mã tiền <strong>' + r.payment_code + ' (' + _prFmt(r.amount) + ')</strong> không đủ');
                    }
                });
                var warningHTML = '';
                if (unpaidMsgs.length > 0) {
                    warningHTML = '<div style="margin-top:12px;padding:12px;background:#fee2e2;border:1px solid #fca5a5;border-radius:10px;font-size:13px;font-weight:800;color:#991b1b;text-align:center;box-shadow:0 2px 8px rgba(239,68,68,0.08);line-height:1.5">'
                        + unpaidMsgs.join('<div style="margin-top:10px"></div>')
                        + '</div>';
                }

                childrenHTML = '<div style="margin-top:16px;border:1px solid #cbd5e1;border-radius:8px;overflow:hidden">'
                    + '<div style="background:#f8fafc;padding:8px 12px;font-weight:700;font-size:12px;color:#1e293b;border-bottom:1px solid #cbd5e1">📊 Chi tiết phân bổ đơn hàng</div>'
                    + '<table style="width:100%;border-collapse:collapse;font-size:11.5px">'
                    + '<thead><tr style="background:#f1f5f9;border-bottom:1px solid #cbd5e1">'
                    + '<th style="padding:6px 12px;text-align:left">Mã Con</th>'
                    + '<th style="padding:6px 12px;text-align:left">Mã Đơn</th>'
                    + '<th style="padding:6px 12px;text-align:right">Số Tiền</th>'
                    + '</tr></thead>'
                    + '<tbody>' + rowsHTML + '</tbody>'
                    + '</table>'
                    + '</div>'
                    + remDuHTML
                    + splitHTML
                    + warningHTML;
            } else if (splitHTML) {
                childrenHTML = splitHTML;
            }
        } catch(e) { console.error(e); }
    }

    var sllOrdersVal = r.total_order_codes || '';
    if (r.payment_type === 'parent_sll' && r.sll_order_codes) {
        sllOrdersVal = r.sll_order_codes;
    }

    var infoTable = '<table style="width:100%;border-collapse:collapse">'
        +row('Ngày', payDate)
        +row('Mã thanh toán', icon+' '+r.payment_code)
        +row('Nguồn tiền', '<span style="color:#059669">'+icon+'</span> '+(srcLabels[r.money_source]||r.money_source||''))
        +row('Khách hàng', '<b>'+(custDisplay||'—')+'</b>')
        +row('CSKH', r.cskh_name||'—')
        +row('Loại tiền', r.payment_type === 'dat_coc' ? '<span style="background:linear-gradient(135deg,#f97316,#ea580c);color:#fff;padding:3px 10px;border-radius:10px;font-weight:800;font-size:11px;text-shadow:0 1px 2px rgba(0,0,0,.15)">🔒 Đặt Cọc</span>' : r.payment_type === 'tra_lai_coc' ? '<span style="background:#ef4444;color:#fff;padding:3px 10px;border-radius:10px;font-weight:800;font-size:11px;text-shadow:0 1px 2px rgba(0,0,0,.2)">🔓 Trả Lại Cọc</span>' : (typeLabels[r.payment_type]||r.payment_type||''))
        +row('Hình thức TT', r.payment_method||'')
        +row('Ngân hàng', r.bank_name||'—')
        +row('Nội dung CK', '<span style="word-break:break-all">'+(r.transfer_note||'—')+'</span>')
        +row('Mã Đơn TT/Cọc', (r.order_tt_coc ? '<span style="background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff;padding:4px 12px;border-radius:8px;font-weight:800;font-size:12px;letter-spacing:.3px">' + r.order_tt_coc + '</span>' : '—'))
        +row('SLL Mã Đơn TT', (sllOrdersVal && sllOrdersVal.trim() ? '<span style="background:linear-gradient(135deg,#0ea5e9,#0284c7);color:#fff;padding:4px 12px;border-radius:8px;font-weight:800;font-size:12px;letter-spacing:.3px">' + sllOrdersVal + '</span>' : '—'))
        +row('Số tiền về TK', '<span style="font-size:14px;color:#d32f2f">💰 '+_prFmt(r.amount)+'</span>')
        +row('Trạng thái BG', statusLabels[r.handover_status]||r.handover_status||'')
        +row('Lịch sử CN', (updatedAt ? '🗓️ '+updatedAt+'<br>' : '')+(histSrc||''))
        +'</table>'
        + childrenHTML;

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

    var isGD = (typeof currentUser !== 'undefined' && currentUser && currentUser.role === 'giam_doc');
    var isTrinh = (typeof currentUser !== 'undefined' && currentUser && currentUser.role === 'quan_ly_cap_cao' && currentUser.username === 'trinh');

    if (r.payment_type === 'parent_sll') {
        if (!isGD && !isTrinh) {
            showToast('Chỉ Giám Đốc và Quản lý cấp cao Trinh mới được sửa/hủy liên kết mã tiền SLL!', 'error');
            return;
        }
    } else {
        var isClaimed = (r.payment_type === 'dat_coc') || (r.payment_type === 'tra_lai_coc') || (r.total_order_codes && r.total_order_codes.trim() !== '') || (r.order_tt_coc && r.order_tt_coc.trim() !== '');
        if (isClaimed) {
            showToast('Mã tiền đã nhận tiền/liên kết đơn hàng, không thể đổi nguồn!', 'error');
            return;
        }
    }

    var isGD = (typeof currentUser !== 'undefined' && currentUser && currentUser.role === 'giam_doc');
    var isTrinh = (typeof currentUser !== 'undefined' && currentUser && currentUser.role === 'quan_ly_cap_cao' && currentUser.username === 'trinh');
    var deptName = (typeof currentUser !== 'undefined' && currentUser && currentUser.department_name) ? currentUser.department_name : '';
    var isKT = deptName.toLowerCase().indexOf('kế toán') !== -1 || deptName.toLowerCase().indexOf('ke toan') !== -1;

    if (isKT && r.money_source === 'nha_van_chuyen') {
        showToast('Kế toán không được phép đổi nguồn tiền của Nhà Vận Chuyển!', 'error');
        return;
    }

    var sources = [];
    // Khách hàng is allowed if they have general change source permission or is KT/Trinh/GD
    sources.push({k:'khach_hang', l:'Khách hàng'});
    // Nhà vận chuyển: only GĐ and Trinh
    if (isGD || isTrinh) {
        sources.push({k:'nha_van_chuyen', l:'Nhà vận chuyển'});
    }
    // Khách hàng SLL: GĐ, Trinh, and Kế toán
    if (isGD || isTrinh || isKT) {
        sources.push({k:'khach_hang_sll', l:'Khách hàng SLL'});
    }

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

    if (r.payment_type === 'parent_sll') {
        var isGD = (typeof currentUser !== 'undefined' && currentUser && currentUser.role === 'giam_doc');
        var isTrinh = (typeof currentUser !== 'undefined' && currentUser && currentUser.role === 'quan_ly_cap_cao' && currentUser.username === 'trinh');
        if (!isGD && !isTrinh) {
            showToast('Chỉ Giám Đốc và Quản lý cấp cao Trinh mới được xóa mã tiền SLL!', 'error');
            return;
        }
    }

    var impacts = [];
    try {
        var impact = await apiCall('/api/payment-records/'+id+'/impact');
        impacts = impact.impacts || [];
    } catch(e) {}

    var confirmed = await _showDeleteImpact({ code: r.payment_code, amount: r.amount, impacts: impacts });
    if (!confirmed) return;

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

    var isGD = (typeof currentUser !== 'undefined' && currentUser && currentUser.role === 'giam_doc');
    var isTrinh = (typeof currentUser !== 'undefined' && currentUser && currentUser.role === 'quan_ly_cap_cao' && currentUser.username === 'trinh');

    if (r.payment_type === 'parent_sll') {
        if (!isGD && !isTrinh) {
            showToast('Chỉ Giám Đốc và Quản lý cấp cao Trinh mới được sửa/hủy liên kết mã tiền SLL!', 'error');
            return;
        }
    } else {
        var isClaimed = (r.payment_type === 'dat_coc') || (r.payment_type === 'tra_lai_coc') || (r.total_order_codes && r.total_order_codes.trim() !== '') || (r.order_tt_coc && r.order_tt_coc.trim() !== '');
        if (isClaimed) {
            showToast('Mã tiền đã nhận tiền/liên kết đơn hàng, không thể chỉnh sửa!', 'error');
            return;
        }
    }

    closeModal();
    var dateVal = r.payment_date ? r.payment_date.split('T')[0] : '';
    var staffOpts = _pr.staff.map(function(s){return '<option value="'+s.id+'"'+(s.id==r.cskh_user_id?' selected':'')+'>'+s.full_name+'</option>';}).join('');
    var isGD = (typeof currentUser !== 'undefined' && currentUser && currentUser.role === 'giam_doc');
    var isTrinh = (typeof currentUser !== 'undefined' && currentUser && currentUser.role === 'quan_ly_cap_cao' && currentUser.username === 'trinh');
    var isAllowedNVC = isGD || isTrinh;

    var activeBanksForEdit = _pr.trackedBanks && _pr.trackedBanks.length ? _pr.trackedBanks.slice() : _prBanks.slice();
    if (!isAllowedNVC) {
        activeBanksForEdit = activeBanksForEdit.filter(function(b){ return b !== 'Nhà Vận Chuyển'; });
    }
    if (r.bank_name && !activeBanksForEdit.includes(r.bank_name)) {
        activeBanksForEdit.push(r.bank_name);
    }

    var bankOpts = activeBanksForEdit.map(function(b){return '<option value="'+b+'"'+(b===r.bank_name?' selected':'')+'>'+b+'</option>';}).join('');
    var srcOpts = [{k:'khach_hang',l:'Khách Hàng'},{k:'khach_hang_sll',l:'Khách Hàng SLL'}];
    if (isAllowedNVC || r.money_source === 'nha_van_chuyen') {
        srcOpts.push({k:'nha_van_chuyen',l:'Nhà Vận Chuyển'});
    }
    var srcOptsHTML = srcOpts.map(function(s){return '<option value="'+s.k+'"'+(s.k===r.money_source?' selected':'')+'>'+s.l+'</option>';}).join('');
    var typeOpts = [{k:'thanh_toan',l:'Thanh Toán'},{k:'dat_coc',l:'Đặt Cọc'},{k:'tt_sll',l:'TT Số Lượng Lớn'},{k:'tra_lai_coc',l:'🔓 Trả Lại Cọc'}];
    var typeOptsHTML = typeOpts.map(function(t){return '<option value="'+t.k+'"'+(t.k===r.payment_type?' selected':'')+'>'+t.l+'</option>';}).join('');

    var bodyHTML = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'
        +'<div class="form-group" style="grid-column:span 2"><div style="background:linear-gradient(135deg,var(--navy),var(--navy-light));color:var(--gold);padding:10px 16px;border-radius:8px;font-weight:800;font-size:14px;text-align:center;letter-spacing:1px">🏷️ '+r.payment_code+'</div></div>'
        +'<div class="form-group"><label style="font-size:12px;font-weight:700;color:var(--navy);margin-bottom:4px;display:block">Khách Hàng</label><input type="text" id="prEditCustName" class="form-control" value="'+(r.customer_name||'')+'" style="padding:10px 12px;font-size:13px"></div>'
        +'<div class="form-group"><label style="font-size:12px;font-weight:700;color:var(--navy);margin-bottom:4px;display:block">SĐT</label><input type="text" id="prEditCustPhone" class="form-control" value="'+(r.customer_phone||'')+'" style="padding:10px 12px;font-size:13px"></div>'
        +'<div class="form-group"><label style="font-size:12px;font-weight:700;color:var(--navy);margin-bottom:4px;display:block">CSKH</label><select id="prEditCSKH" class="form-control" style="padding:10px 12px;font-size:13px"><option value="">-- Chọn --</option>'+staffOpts+'</select></div>'
        +'<div class="form-group"><label style="font-size:12px;font-weight:700;color:var(--navy);margin-bottom:4px;display:block">Số Tiền <span style="color:var(--danger)">*</span></label><input type="number" id="prEditAmount" class="form-control" value="'+(r.amount||0)+'" style="padding:10px 12px;font-size:13px"></div>'
        +'<div class="form-group"><label style="font-size:12px;font-weight:700;color:var(--navy);margin-bottom:4px;display:block">Loại Tiền</label><select id="prEditType" class="form-control" style="padding:10px 12px;font-size:13px">'+typeOptsHTML+'</select></div>'
        +'<div class="form-group"><label style="font-size:12px;font-weight:700;color:var(--navy);margin-bottom:4px;display:block">Nguồn Tiền</label><select id="prEditSource" class="form-control" style="padding:10px 12px;font-size:13px">'+srcOptsHTML+'</select></div>'
        +'<div class="form-group"><label style="font-size:12px;font-weight:700;color:var(--navy);margin-bottom:4px;display:block">Ngân Hàng</label><select id="prEditBank" class="form-control" style="padding:10px 12px;font-size:13px" onchange="if(this.value===\'Nhà Vận Chuyển\'){var se=document.getElementById(\'prEditSource\');if(se)se.value=\'nha_van_chuyen\';}"><option value="">-- Chọn --</option>'+bankOpts+'</select></div>'
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
            {k:'pr_update_customer', l:'💳 Cập Nhật Tiền Đơn Hàng', desc:'Cập nhật thông tin khách hàng cho mã tiền'}
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

// ========== UPDATE CUSTOMER — Link payment to unpaid order ==========
// ========== UPDATE CUSTOMER — Link payment to unpaid order ==========
var _prActiveRecordId = null;
var _prSelectedOrder = null;
var _prSelectedOrders = [];
var _prPaymentAmount = 0;

async function _prUpdateCustomer(id) {
    var r = _pr.records.find(function(x){return x.id===id;});
    if (!r) return;
    _prActiveRecordId = id;
    _prSelectedOrder = null;
    _prSelectedOrders = [];
    _prPaymentAmount = Number(r.amount) || 0;
    var icon = r.payment_method === 'TM' ? '💵' : '🏦';

    var bodyHTML = '<div style="background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff;padding:14px 16px;border-radius:12px;margin-bottom:16px;text-align:center">'
        +'<div style="font-size:11px;opacity:.8">Mã thanh toán</div>'
        +'<div style="font-size:18px;font-weight:900;letter-spacing:1px">'+icon+' '+r.payment_code+' — '+_prFmt(r.amount)+'</div></div>';

    bodyHTML += '<div style="margin-bottom:12px">'
        +'<label style="font-size:12px;font-weight:700;color:var(--navy);margin-bottom:6px;display:block">🔍 Tìm Mã Đơn Hàng</label>'
        +'<input type="text" id="prSearchOrder" class="form-control" placeholder="Nhập mã đơn, tên KH, SĐT..." style="padding:10px 12px;font-size:13px" oninput="_prSearchUnpaidOrders()" autocomplete="off">'
        +'</div>'
        +'<div id="prSelectedOrdersContainer" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px;margin-bottom:12px;max-height:220px;overflow-y:auto"></div>'
        +'<div id="prSLLConclusionBox" style="background:#fee2e2;border:1px solid #fca5a5;border-radius:10px;padding:12px;margin-bottom:12px;font-size:13.5px;font-weight:800;color:#991b1b;display:none;text-align:center;box-shadow:0 2px 8px rgba(239,68,68,0.08)"></div>'
        +'<div id="prSLLSummaryBox" style="background:#fffbeb;border:1px dashed #d97706;border-radius:10px;padding:10px 12px;margin-bottom:12px;font-size:12px;font-weight:700;color:#92400e;display:none"></div>'
        +'<div id="prOrderResults" style="max-height:220px;overflow-y:auto;border:1px solid #e2e8f0;border-radius:10px;background:#f8fafc">'
        +'<div style="padding:24px;text-align:center;color:#94a3b8;font-size:12px">Nhập từ khóa để tìm đơn hàng chưa thanh toán...</div>'
        +'</div>';

    var footerHTML = '<button class="btn btn-secondary" onclick="closeModal()">Hủy</button>'
        +'<button class="btn btn-primary" id="prBtnLinkOrder" onclick="_prSubmitLinkOrderSLL(' + id + ',' + r.amount + ')" style="width:auto;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff;font-weight:800;font-size:13px;padding:10px 24px;border:none;border-radius:8px;letter-spacing:.3px;opacity:.5;pointer-events:none" disabled>💾 XÁC NHẬN LIÊN KẾT</button>';

    openModal('🔗 Liên Kết Đơn Hàng', bodyHTML, footerHTML);
    setTimeout(function(){ var mc = document.querySelector('.modal-content'); if(mc){ mc.style.maxWidth='680px'; mc.style.width='90vw'; } }, 30);
    _prRenderSelectedOrdersSLL(r.amount);
    _prSearchUnpaidOrders();
}

var _prSearchTimer = null;
function _prSearchUnpaidOrders() {
    clearTimeout(_prSearchTimer);
    _prSearchTimer = setTimeout(async function(){
        var q = (document.getElementById('prSearchOrder')?.value || '').trim();
        var url = '/api/payment-records/unpaid-orders' + (q.length >= 2 ? '?q='+encodeURIComponent(q) : '');
        try {
            var data = await apiCall(url);
            var box = document.getElementById('prOrderResults');
            if (!data.orders || data.orders.length === 0) {
                box.innerHTML = '<div style="padding:24px;text-align:center;color:#94a3b8;font-size:12px">Không tìm thấy đơn hàng nào còn nợ</div>';
                return;
            }
            var isSLL = true;
            var totalAllocated = _prSelectedOrders.reduce(function(sum, x){return sum + (Number(x.allocatedAmount)||0);}, 0);
            var isFullyAllocated = totalAllocated >= _prPaymentAmount;

            var orders = data.orders.slice();
            var h = '';
            orders.forEach(function(o){
                var discount = Number(o.discount_amount) || 0;
                var shipCk = (o.shipping_fee_payer === 'hv' && o.shipping_fee_method === 'ck') ? (Number(o.shipping_fee) || 0) : 0;
                var totalAmt = (Number(o.total_amount) || 0) - discount - shipCk;
                var paid = Number(o.deposit_paid) || 0;
                var remain = Number(o.remaining) || 0;
                var orderDate = o.order_date ? o.order_date.split('T')[0].split('-').reverse().join('/') : '';
                
                var isSelected = false;
                if (isSLL) {
                    isSelected = _prSelectedOrders.some(function(x){return x.order_code === o.order_code;});
                } else {
                    isSelected = _prSelectedOrder && _prSelectedOrder.order_code === o.order_code;
                }

                var isBlocked = isFullyAllocated && !isSelected;
                var style = 'padding:10px 14px;border-bottom:1px solid #e2e8f0;transition:all .15s;display:flex;align-items:center;gap:10px;';
                if (isSelected) {
                    style += 'background:#dbeafe;border-left:4px solid #3b82f6;cursor:pointer;';
                } else if (isBlocked) {
                    style += 'background:#f8fafc;border-left:4px solid transparent;cursor:not-allowed;opacity:0.5;';
                } else {
                    style += 'background:#fff;border-left:4px solid transparent;cursor:pointer;';
                }

                var clickFn = '';
                if (!isBlocked) {
                    clickFn = isSLL 
                        ? '_prSelectOrderSLL(' + JSON.stringify(o).replace(/"/g,'&quot;') + ')'
                        : '_prSelectOrder(' + JSON.stringify(o).replace(/"/g,'&quot;') + ')';
                } else {
                    clickFn = 'showToast(\'Mã tiền đã phân bổ hết, không thể chọn thêm đơn!\', \'warning\')';
                }

                h += '<div onclick="' + clickFn + '" style="' + style + '"' + (!isBlocked && !isSelected ? ' onmouseover="this.style.background=\'#f0f9ff\'" onmouseout="this.style.background=\'#fff\'"' : '') + '>'
                    +'<div style="flex:1">'
                    +'<div style="font-weight:800;font-size:13px;color:#1a1a2e">'+o.order_code+'</div>'
                    +'<div style="font-size:11px;color:#64748b;margin-top:2px">'+(o.customer_name||'—')+' · '+(o.customer_phone||'')+' · '+orderDate+'</div>'
                    +'</div>'
                    +'<div style="text-align:right">'
                    +'<div style="font-size:10px;color:#64748b">Tổng: '+_prFmt(totalAmt)+'</div>'
                    +'<div style="font-size:10px;color:#10b981">Đã TT: '+_prFmt(paid)+'</div>'
                    +'<div style="font-size:12px;font-weight:800;color:#dc2626">Còn: '+_prFmt(remain)+'</div>'
                    +'</div>'
                    +'</div>';
            });
            box.innerHTML = h;
        } catch(e) { console.error('Search error:', e); }
    }, 300);
}

function _prSelectOrder(o) {
    _prSelectedOrder = o;
    var remain = Number(o.remaining) || 0;
    var selBox = document.getElementById('prSelectedOrderBox');
    selBox.style.display = 'block';
    selBox.innerHTML = '<div style="display:flex;align-items:center;gap:10px">'
        +'<div style="width:36px;height:36px;border-radius:50%;background:#10b981;display:flex;align-items:center;justify-content:center;font-size:18px;color:#fff">✓</div>'
        +'<div style="flex:1">'
        +'<div style="font-weight:800;font-size:14px;color:#065f46">'+o.order_code+'</div>'
        +'<div style="font-size:11px;color:#047857">'+(o.customer_name||'')+' — Còn: <b>'+_prFmt(remain)+'</b></div>'
        +'</div>'
        +'</div>';
    var btn = document.getElementById('prBtnLinkOrder');
    if (btn) { btn.style.opacity='1'; btn.style.pointerEvents='auto'; btn.disabled=false; }
    _prSearchUnpaidOrders();
}

function _prSelectOrderSLL(o) {
    var exists = _prSelectedOrders.find(function(x){return x.order_code === o.order_code;});
    if (exists) {
        _prSelectedOrders = _prSelectedOrders.filter(function(x){return x.order_code !== o.order_code;});
    } else {
        var totalAllocated = _prSelectedOrders.reduce(function(sum, x){return sum + (Number(x.allocatedAmount)||0);}, 0);
        if (totalAllocated >= _prPaymentAmount) {
            showToast('Mã tiền đã phân bổ hết, không thể chọn thêm đơn!', 'warning');
            return;
        }
        o.allocatedAmount = 0; // Will be set by auto allocate below
        _prSelectedOrders.push(o);
    }
    _prAutoAllocateSLL(_prPaymentAmount);
    _prSearchUnpaidOrders();
}

function _prRenderSelectedOrdersSLL(recordAmount) {
    var container = document.getElementById('prSelectedOrdersContainer');
    var summaryBox = document.getElementById('prSLLSummaryBox');
    var btn = document.getElementById('prBtnLinkOrder');
    if (!container || !summaryBox) return;

    if (_prSelectedOrders.length === 0) {
        container.innerHTML = '<div style="text-align:center;color:#94a3b8;font-size:12px;padding:10px">Chưa chọn đơn hàng nào</div>';
        summaryBox.style.display = 'none';
        if (btn) { btn.style.opacity='0.5'; btn.style.pointerEvents='none'; btn.disabled=true; }
        return;
    }

    var h = '';
    var totalAllocated = 0;
    _prSelectedOrders.forEach(function(o) {
        var remain = Number(o.remaining) || 0;
        var allocated = Number(o.allocatedAmount) || 0;
        totalAllocated += allocated;

        h += '<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #f1f5f9">'
            +'<div style="flex:1">'
            +'<div style="font-weight:800;font-size:13px;color:var(--navy)">' + o.order_code + ' <span style="font-size:10px;color:#64748b;font-weight:600">(' + _prFmt(remain) + ' - ' + _prFmt(allocated) + ' TT = <span style="color:#dc2626">' + _prFmt(remain - allocated) + '</span>)</span></div>'
            +'<div style="font-size:11px;color:#64748b">' + (o.customer_name||'') + '</div>'
            +'</div>'
            +'<div style="display:flex;align-items:center;gap:6px">'
            +'<input type="number" readonly class="form-control" data-code="' + o.order_code + '" value="' + allocated + '" style="width:110px;text-align:right;padding:4px 8px;font-size:12px;font-weight:700;background-color:#f1f5f9;border:1px solid #cbd5e1;cursor:default" tabindex="-1">'
            +'<button onclick="_prRemoveOrderSLL(\'' + o.order_code + '\',' + recordAmount + ')" style="background:#fee2e2;color:#dc2626;border:none;padding:4px 8px;border-radius:6px;cursor:pointer;font-size:11px">🗑️</button>'
            +'</div>'
            +'</div>';
    });
    container.innerHTML = h;

    var diff = recordAmount - totalAllocated;
    var summaryText = 'Tổng phân bổ: ' + _prFmt(totalAllocated) + ' / ' + _prFmt(recordAmount);
    if (diff > 0) {
        summaryText += ' <span style="color:#2563eb">(Dư: ' + _prFmt(diff) + ' - Sẽ cập nhật tiền dư)</span>';
    } else if (diff < 0) {
        summaryText += ' <span style="color:#dc2626">(Vượt quá: ' + _prFmt(Math.abs(diff)) + ')</span>';
    } else {
        summaryText += ' <span style="color:#10b981">(Khớp 100%)</span>';
    }
    summaryBox.innerHTML = summaryText;
    summaryBox.style.display = 'block';

    var conclusionBox = document.getElementById('prSLLConclusionBox');
    if (conclusionBox) {
        if (_prSelectedOrders.length > 0) {
            var lastOrder = _prSelectedOrders[_prSelectedOrders.length - 1];
            var missingAmount = (Number(lastOrder.remaining) || 0) - (Number(lastOrder.allocatedAmount) || 0);
            if (missingAmount > 0) {
                if (!document.getElementById('_prSllBlinkStyles')) {
                    var st = document.createElement('style');
                    st.id = '_prSllBlinkStyles';
                    st.textContent = '@keyframes prSllBlink { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } } .pr-sll-blink { animation: prSllBlink 1.2s infinite; }';
                    document.head.appendChild(st);
                }
                conclusionBox.innerHTML = '<span class="pr-sll-blink">⚠️ <strong>' + lastOrder.order_code + '</strong> = còn lại <strong>' + _prFmt(missingAmount) + '</strong> chưa thanh toán</span>';
                conclusionBox.style.display = 'block';
            } else {
                conclusionBox.style.display = 'none';
            }
        } else {
            conclusionBox.style.display = 'none';
        }
    }

    var isValid = _prSelectedOrders.length >= 1 && totalAllocated <= recordAmount && totalAllocated > 0;
    if (btn) {
        if (isValid) {
            btn.style.opacity = '1';
            btn.style.pointerEvents = 'auto';
            btn.disabled = false;
        } else {
            btn.style.opacity = '0.5';
            btn.style.pointerEvents = 'none';
            btn.disabled = true;
        }
    }
}

function _prOnSLLAllocatedInput(el, recordAmount) {
    // Left empty since inputs are readonly, but kept for compatibility
}

function _prRemoveOrderSLL(code, recordAmount) {
    _prSelectedOrders = _prSelectedOrders.filter(function(x){return x.order_code !== code;});
    _prAutoAllocateSLL(recordAmount);
    _prSearchUnpaidOrders();
}

function _prAutoAllocateSLL(recordAmount) {
    var remainingPayment = recordAmount;
    _prSelectedOrders.forEach(function(o) {
        var remainDebt = Number(o.remaining) || 0;
        var allocated = Math.min(remainDebt, remainingPayment);
        o.allocatedAmount = allocated;
        remainingPayment -= allocated;
    });
    _prRenderSelectedOrdersSLL(recordAmount);
}

async function _prSubmitLinkOrder(prId) {
    if (!_prSelectedOrder) return showToast('Vui lòng chọn 1 đơn hàng','error');
    var body = {
        order_tt_coc: _prSelectedOrder.order_code,
        customer_name: _prSelectedOrder.customer_name || '',
        customer_phone: _prSelectedOrder.customer_phone || '',
        payment_type: 'thanh_toan'
    };
    try {
        var res = await apiCall('/api/payment-records/'+prId,'PUT',body);
        if (res.auto_completed) {
            var msg = '🏆 Đơn '+_prSelectedOrder.order_code+' đã HOÀN THÀNH (thanh toán đủ)';
            if (res.auto_commission > 0) msg += '\n💰 Hoa hồng: ' + (res.auto_commission||0).toLocaleString('vi-VN') + 'đ';
            showToast(msg);
        } else {
            showToast('✅ Đã nhận thanh toán cho đơn '+_prSelectedOrder.order_code);
        }
        _prSelectedOrder = null;
        closeModal();
        await _prLoadRecords();
    } catch(e) { showToast('Lỗi: '+(e.message||'Không có quyền'),'error'); }
}

function _prConfirmSLLSplit(opts) {
    return new Promise(function(resolve) {
        var overlay = document.createElement('div');
        overlay.id = '_sllSplitOverlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:999999;display:flex;align-items:center;justify-content:center;animation:_diiFadeIn .25s ease';

        overlay.innerHTML = '<div style="background:#fff;border-radius:16px;max-width:440px;width:92%;box-shadow:0 25px 60px rgba(0,0,0,0.3);overflow:hidden;animation:_diiScaleIn .3s cubic-bezier(0.34,1.56,0.64,1);font-family:inherit">'
            + '<div style="background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:18px 24px;text-align:center">'
            + '<div style="font-size:36px;margin-bottom:4px">💰</div>'
            + '<div style="color:#fff;font-size:16px;font-weight:800;letter-spacing:0.5px">PHÂN BỔ LIÊN KẾT & LƯU TIỀN DƯ</div>'
            + '</div>'
            + '<div style="padding:20px 24px">'
            + '<p style="font-size:12.5px;color:#64748b;line-height:1.6;margin-bottom:16px;margin-top:0">Tổng tiền phân bổ cho các đơn hàng chưa bằng tổng số tiền mã gốc. Hệ thống sẽ lưu số dư còn lại:</p>'
            + '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px 16px;margin-bottom:16px">'
            + '<div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:8px"><span style="color:#64748b">Mã tiền gốc:</span><strong style="color:#1e293b">' + opts.prCode + '</strong></div>'
            + '<div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:8px"><span style="color:#64748b">Số tiền gốc:</span><strong style="color:#1e293b">' + _prFmt(opts.prAmount) + '</strong></div>'
            + '<div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:8px;border-top:1px solid #e2e8f0;padding-top:8px;margin-top:8px"><span style="color:#64748b">Đã phân bổ:</span><strong style="color:#2563eb">' + _prFmt(opts.totalAllocated) + '</strong></div>'
            + '<div style="display:flex;justify-content:space-between;font-size:13px"><span style="color:#64748b;font-weight:700">Lưu dư còn lại (Tiền dư):</span><strong style="color:#10b981">+' + _prFmt(opts.diff) + '</strong></div>'
            + '</div>'
            + '<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:10px 14px;text-align:left;margin-bottom:18px">'
            + '<span style="color:#1e40af;font-size:11.5px;font-weight:700;line-height:1.5;display:block">ℹ️ Ghi chú: Số tiền dư này sẽ được tiếp tục sử dụng để đặt cọc hoặc thanh toán cho các đơn khác dưới mã gốc.</span>'
            + '</div>'
            + '<div style="display:flex;gap:10px">'
            + '<button id="_sllCancel" style="flex:1;padding:10px;border:2px solid #e2e8f0;background:#f8fafc;color:#475569;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;transition:all .15s;font-family:inherit">Hủy bỏ</button>'
            + '<button id="_sllConfirm" style="flex:1;padding:10px;border:none;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;border-radius:10px;font-size:13px;font-weight:800;cursor:pointer;box-shadow:0 4px 12px rgba(37,99,235,0.4);transition:all .15s;font-family:inherit">Xác nhận</button>'
            + '</div>'
            + '</div></div>';

        if (!document.getElementById('_diiStyles')) {
            var st = document.createElement('style');
            st.id = '_diiStyles';
            st.textContent = '@keyframes _diiFadeIn{from{opacity:0}to{opacity:1}}@keyframes _diiScaleIn{from{transform:scale(.7);opacity:0}to{transform:scale(1);opacity:1}}';
            document.head.appendChild(st);
        }

        document.body.appendChild(overlay);

        function cleanup(result) {
            overlay.style.animation = '_diiFadeIn .2s ease reverse';
            setTimeout(function(){ overlay.remove(); }, 200);
            resolve(result);
        }

        overlay.querySelector('#_sllCancel').onclick = function(){ cleanup(false); };
        overlay.querySelector('#_sllConfirm').onclick = function(){ cleanup(true); };
        overlay.addEventListener('click', function(e){ if(e.target === overlay) cleanup(false); });
    });
}

async function _prSubmitLinkOrderSLL(prId, recordAmount) {
    var totalAllocated = _prSelectedOrders.reduce(function(sum, o){return sum + (Number(o.allocatedAmount)||0);}, 0);
    if (_prSelectedOrders.length < 1) {
        return showToast('Vui lòng chọn ít nhất 1 đơn hàng để liên kết.','error');
    }
    if (totalAllocated > recordAmount) {
        return showToast('Tổng số tiền phân bổ không được vượt quá số tiền của mã tiền','error');
    }

    var diff = recordAmount - totalAllocated;
    if (diff > 0) {
        var pr = _pr.records.find(function(x){return x.id === prId;}) || {};
        var prCode = pr.payment_code || '';
        var confirmed = await _prConfirmSLLSplit({
            prCode: prCode,
            prAmount: recordAmount,
            totalAllocated: totalAllocated,
            diff: diff
        });
        if (!confirmed) return;
    }

    var body = {
        is_sll: true,
        allocations: _prSelectedOrders.map(function(o) {
            return {
                order_code: o.order_code,
                amount: o.allocatedAmount,
                customer_name: o.customer_name || '',
                customer_phone: o.customer_phone || ''
            };
        })
    };

    try {
        var res = await apiCall('/api/payment-records/' + prId, 'PUT', body);
        var msg = '✅ Đã hoàn thành liên kết đơn hàng';
        if (res.auto_completed_orders && res.auto_completed_orders.length > 0) {
            msg += '\n🏆 Đơn đã hoàn thành: ' + res.auto_completed_orders.join(', ');
        }
        showToast(msg);
        _prSelectedOrders = [];
        closeModal();
        await _prLoadRecords();
    } catch(e) {
        showToast('Lỗi: ' + (e.message || 'Không có quyền'), 'error');
    }
}

// ========== APPSHEET TOGGLE ==========
async function _prToggleAppSheet() {
    var newState = !_pr.appsheetEnabled;
    try {
        await apiCall('/api/payment-records/appsheet-config','PUT',{enabled:newState});
        _pr.appsheetEnabled = newState;
        showToast(newState ? '✅ Đã BẬT đẩy AppSheet' : '🔴 Đã TẮT đẩy AppSheet');
        _prRenderToolbar();
    } catch(e) { showToast('Lỗi: '+(e.message||'Không có quyền'),'error'); }
}

// ========== BANK MANAGER ==========
async function _prShowBankManager() {
    var bodyHTML = '<div style="margin-bottom:16px">'
        +'<label style="font-size:12px;font-weight:700;color:var(--navy);margin-bottom:6px;display:block">➕ Thêm Ngân Hàng Mới</label>'
        +'<div style="display:flex;gap:8px">'
        +'<input type="text" id="prNewBankName" class="form-control" placeholder="Nhập tên ngân hàng..." style="flex:1;padding:10px 12px;font-size:13px" onkeydown="if(event.key===\'Enter\')_prAddBank()">'
        +'<button onclick="_prAddBank()" style="background:linear-gradient(135deg,#059669,#10b981);color:#fff;border:none;padding:8px 18px;border-radius:8px;font-weight:700;font-size:12px;cursor:pointer;white-space:nowrap">➕ Thêm</button>'
        +'</div></div>'
        +'<div id="prBankManagerList" style="max-height:400px;overflow-y:auto"><div style="text-align:center;padding:20px;color:#94a3b8;font-size:12px">Đang tải...</div></div>';
    var footerHTML = '<button class="btn btn-secondary" onclick="closeModal()">Đóng</button>';
    openModal('🏦 Quản Lý Ngân Hàng', bodyHTML, footerHTML);
    setTimeout(function(){ var mc = document.querySelector('.modal-content'); if(mc){ mc.style.maxWidth='520px'; mc.style.width='90vw'; } }, 30);
    await _prRenderBankList();
}

async function _prRenderBankList() {
    var box = document.getElementById('prBankManagerList');
    if (!box) return;
    try {
        // Get email banks (locked, from email parsers)
        var emailData = [];
        try { emailData = (await apiCall('/api/payment-records/bank-list')).banks || []; } catch {}
        // Get custom banks
        var customBanks = [];
        try {
            var row = await apiCall('/api/payment-records/custom-banks-list').catch(function(){return{}});
            customBanks = row.banks || [];
        } catch {}
        // Get email-linked bank names
        var emailBankNames = [];
        try {
            // email_bank_parsers names only
            var eRes = await apiCall('/api/payment-records/email-bank-names').catch(function(){return{}});
            emailBankNames = eRes.banks || [];
        } catch {}

        var h = '<div style="font-size:11px;color:#64748b;margin-bottom:10px;font-weight:600">Tổng: <strong>'+emailData.length+'</strong> ngân hàng</div>';
        emailData.forEach(function(name) {
            var isEmail = emailBankNames.includes(name);
            var isCustom = customBanks.includes(name);
            h += '<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-bottom:1px solid #f1f5f9">';
            h += '<div style="flex:1;font-weight:700;font-size:13px;color:#1e293b">🏦 '+name+'</div>';
            if (isEmail) {
                h += '<span style="background:#dbeafe;color:#1e40af;padding:2px 8px;border-radius:6px;font-size:9px;font-weight:700">📧 Email</span>';
            }
            if (isCustom) {
                h += '<span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:6px;font-size:9px;font-weight:700">✏️ Tùy chỉnh</span>';
                h += '<button onclick="_prDeleteBank(\''+name.replace(/'/g,"\\'")+'\')" style="background:#fee2e2;color:#dc2626;border:none;padding:4px 10px;border-radius:6px;font-size:10px;font-weight:700;cursor:pointer" title="Xóa">🗑️</button>';
            } else if (isEmail) {
                h += '<span style="color:#94a3b8;font-size:9px">🔒</span>';
            }
            h += '</div>';
        });
        box.innerHTML = h;
    } catch(e) {
        box.innerHTML = '<div style="text-align:center;padding:20px;color:#dc2626;font-size:12px">Lỗi tải danh sách</div>';
    }
}

async function _prAddBank() {
    var input = document.getElementById('prNewBankName');
    if (!input) return;
    var name = input.value.trim();
    if (!name) { showToast('Vui lòng nhập tên ngân hàng!','error'); return; }
    try {
        await apiCall('/api/payment-records/custom-banks','POST',{bank_name:name});
        showToast('✅ Đã thêm: '+name);
        input.value = '';
        // Refresh bank list in memory
        var bankData = await apiCall('/api/payment-records/bank-list').catch(function(){return{}});
        _pr.trackedBanks = bankData.banks || _prBanks;
        await _prRenderBankList();
    } catch(e) { showToast('Lỗi: '+(e.message||'Không thể thêm'),'error'); }
}

async function _prDeleteBank(name) {
    if (!confirm('Xóa ngân hàng "'+name+'" khỏi danh sách?')) return;
    try {
        await apiCall('/api/payment-records/custom-banks','DELETE',{bank_name:name});
        showToast('🗑️ Đã xóa: '+name);
        var bankData = await apiCall('/api/payment-records/bank-list').catch(function(){return{}});
        _pr.trackedBanks = bankData.banks || _prBanks;
        await _prRenderBankList();
    } catch(e) { showToast('Lỗi: '+(e.message||'Không thể xóa'),'error'); }
}
