// ========== SỔ THU CHI — Bộ Phận Văn Phòng ==========
var _cf = { tree: [], records: [], filter: {}, userPerms: {}, allPerms: {} };
function _cfFmt(n) { return Number(n||0).toLocaleString('vi-VN') + 'đ'; }

async function renderSothuchiPage(content) {
    if (!document.getElementById('cfStyles')) {
        var st = document.createElement('style'); st.id = 'cfStyles';
        st.textContent = '.cf-wrap{display:flex;height:calc(100vh - 60px);overflow:hidden}.cf-sidebar{width:260px;min-width:260px;background:#fff;border-right:1px solid var(--gray-200);overflow-y:auto}.cf-main{flex:1;min-width:0;display:flex;flex-direction:column;overflow-y:auto;padding:16px}.cf-toolbar{display:flex;align-items:center;gap:8px;padding:10px 16px;background:var(--navy);color:#fff;border-radius:10px;margin-bottom:12px;flex-wrap:wrap}.cf-table-wrap{overflow-x:auto}.cf-table{width:100%;border-collapse:collapse;font-size:12px}.cf-table th{padding:8px 10px;text-align:left;font-weight:700;font-size:10px;text-transform:uppercase;color:var(--gray-400);background:var(--gray-100);border-bottom:2px solid var(--gray-200);white-space:nowrap}.cf-table td{padding:8px 10px;border-bottom:1px solid var(--gray-100);vertical-align:middle}.cf-table tr:hover{background:#f8fafc}.cf-row-thu{background:#e8f4fd!important}.cf-row-thu:hover{background:#d0e8f7!important}.cf-badge-thu{background:#1a5276;color:#fff;padding:2px 8px;border-radius:4px;font-weight:800;font-size:10px}.cf-badge-chi{background:#e67e22;color:#fff;padding:2px 8px;border-radius:4px;font-weight:800;font-size:10px}.cf-sidebar-title{font-size:13px;font-weight:800;color:var(--navy);padding:16px;border-bottom:1px solid var(--gray-200);text-align:center}.cf-tree-total{background:linear-gradient(135deg,#1a5276,#2980b9);color:#fff;padding:12px 16px;font-size:13px;font-weight:800;display:flex;justify-content:space-between}.cf-tree-year{padding:8px 16px;font-weight:800;font-size:12px;color:var(--navy);cursor:pointer;display:flex;justify-content:space-between;align-items:center;background:#f8fafc;border-bottom:1px solid var(--gray-200)}.cf-tree-month{padding:6px 16px 6px 32px;font-size:11px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #f8fafc}.cf-tree-month:hover{background:#f0f9ff}.cf-tree-month.active{background:#dbeafe;font-weight:700}.cf-add-btn{background:linear-gradient(135deg,var(--gold),#f0c040);color:var(--navy);border:none;padding:6px 14px;border-radius:8px;font-weight:800;font-size:11px;cursor:pointer}.cf-check-btn{width:28px;height:28px;border-radius:50%;border:2px solid #cbd5e1;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:14px;transition:all .15s}.cf-check-btn.checked{background:#059669;border-color:#059669;color:#fff}.cf-batch-bar{display:flex;align-items:center;gap:8px;padding:8px 14px;background:#fef3c7;border-radius:8px;margin-bottom:8px;font-size:12px;font-weight:700;color:#92400e}';
        document.head.appendChild(st);
    }
    content.innerHTML = '<div class="cf-wrap"><div class="cf-sidebar" id="cfSidebar"><div style="padding:20px;text-align:center;color:var(--gray-400);font-size:12px">Đang tải...</div></div><div class="cf-main"><div class="cf-toolbar" id="cfToolbar"></div><div id="cfBatchBar"></div><div class="cf-table-wrap" id="cfTableWrap"></div></div></div>';

    var [treeData, permData] = await Promise.all([
        apiCall('/api/cashflow/tree').catch(function(){return{}}),
        apiCall('/api/cashflow/permissions').catch(function(){return{}})
    ]);
    _cf.tree = treeData.tree || [];
    _cf.totalUnclosed = treeData.total_unclosed || 0;
    _cf.userPerms = permData.user_permissions || {};
    _cf.allPerms = permData.permissions || {};
    _cf.filter = {};
    _cf.selected = [];

    _cfRenderSidebar();
    await _cfLoadRecords();
}

function _cfRenderSidebar() {
    var sb = document.getElementById('cfSidebar'); if (!sb) return;
    var isGD = typeof currentUser !== 'undefined' && currentUser && currentUser.role === 'giam_doc';
    var h = '<div class="cf-sidebar-title">─── Sổ thu chi ───</div>';
    h += '<div class="cf-tree-total" style="cursor:pointer" onclick="_cfFilterAll()"><span>▼ Chưa chốt</span><span>' + _cfFmt(_cf.totalUnclosed) + '</span></div>';

    _cf.tree.forEach(function(yr) {
        var isCurYear = yr.year === new Date().getFullYear();
        h += '<div class="cf-tree-year" onclick="_cfToggleYear(this)"><span>' + (isCurYear?'▼':'▶') + ' Năm '+yr.year+'</span><span style="background:rgba(0,0,0,0.08);padding:2px 8px;border-radius:10px;font-size:10px">'+_cfFmt(yr.balance)+'</span></div>';
        h += '<div class="cf-year-months" style="display:'+(isCurYear?'block':'none')+'">';
        yr.months.forEach(function(m) {
            var isActive = _cf.filter.year===yr.year && _cf.filter.month===m.month;
            h += '<div class="cf-tree-month'+(isActive?' active':'')+'" onclick="_cfFilterMonth('+yr.year+','+m.month+')"><span>▸ Tháng '+String(m.month).padStart(2,'0')+'</span><span style="color:'+(m.balance>=0?'#059669':'#dc2626')+';font-weight:700">'+_cfFmt(m.balance)+'</span></div>';
        });
        h += '</div>';
    });

    // Settings buttons for GĐ
    if (isGD) {
        h += '<div style="padding:12px;border-top:1px solid var(--gray-200);display:flex;flex-direction:column;gap:6px">';
        h += '<button onclick="_cfShowPermissions()" style="background:linear-gradient(135deg,#7c3aed,#a78bfa);color:#fff;border:none;padding:8px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer">🔐 Phân Quyền</button>';
        h += '<button onclick="_cfShowTgSettings()" style="background:linear-gradient(135deg,#0088cc,#29b6f6);color:#fff;border:none;padding:8px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer">📢 Telegram</button>';
        h += '</div>';
    }
    sb.innerHTML = h;
}

function _cfToggleYear(el) {
    var m = el.nextElementSibling; if (!m) return;
    var open = m.style.display !== 'none'; m.style.display = open ? 'none' : 'block';
    var s = el.querySelector('span'); s.textContent = s.textContent.replace(open?'▼':'▶', open?'▶':'▼');
}
function _cfFilterMonth(y, m) { _cf.filter = {year:y,month:m}; _cfLoadRecords(); _cfRenderSidebar(); }
function _cfFilterAll() { _cf.filter = {}; _cfLoadRecords(); _cfRenderSidebar(); }

async function _cfLoadRecords() {
    var p = '';
    if (_cf.filter.year) p += '?year='+_cf.filter.year;
    if (_cf.filter.month) p += (p?'&':'?')+'month='+_cf.filter.month;
    var data = await apiCall('/api/cashflow/records'+p);
    _cf.records = data.records || [];
    _cf.selected = [];
    _cfRenderToolbar(); _cfRenderBatchBar(); _cfRenderTable();
}

function _cfRenderToolbar() {
    var tb = document.getElementById('cfToolbar'); if (!tb) return;
    var ft = 'Tất cả';
    if (_cf.filter.year && _cf.filter.month) ft = 'Tháng '+_cf.filter.month+'/'+_cf.filter.year;
    else if (_cf.filter.year) ft = 'Năm '+_cf.filter.year;
    var tThu=0, tChi=0;
    _cf.records.forEach(function(r){ if(r.cashflow_type==='THU') tThu+=Number(r.amount); else tChi+=Number(r.amount); });
    var canChi = _cf.userPerms.cf_create_chi;
    var chiBtn = canChi ? '<button class="cf-add-btn" onclick="_cfShowAddChi()">➕ Tạo Phiếu Chi</button>' : '';
    tb.innerHTML = '<span style="font-weight:800;font-size:13px">📅 '+ft+'</span><span style="flex:1"></span><span style="font-size:11px">THU: <b style="color:#2ecc71">'+_cfFmt(tThu)+'</b></span><span style="font-size:11px">CHI: <b style="color:#e67e22">'+_cfFmt(tChi)+'</b></span><span style="font-size:12px;font-weight:800">SỐ DƯ: <b style="color:'+(tThu-tChi>=0?'#2ecc71':'#e74c3c')+'">'+_cfFmt(tThu-tChi)+'</b></span>'+chiBtn;
}

function _cfRenderBatchBar() {
    var bar = document.getElementById('cfBatchBar'); if (!bar) return;
    if (!_cf.selected.length || !_cf.userPerms.cf_check) { bar.innerHTML = ''; return; }
    bar.innerHTML = '<div class="cf-batch-bar"><span>✅ Đã chọn '+_cf.selected.length+' mã</span><button onclick="_cfBatchCheck()" style="background:#059669;color:#fff;border:none;padding:4px 12px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer">✓ Kiểm Tra Tất Cả</button><button onclick="_cfClearSelection()" style="background:#94a3b8;color:#fff;border:none;padding:4px 12px;border-radius:6px;font-size:11px;cursor:pointer">✕ Bỏ chọn</button></div>';
}

function _cfRenderTable() {
    var wrap = document.getElementById('cfTableWrap'); if (!wrap) return;
    if (!_cf.records.length) { wrap.innerHTML = '<div style="text-align:center;padding:40px;color:var(--gray-400)"><div style="font-size:32px">📒</div><div style="margin-top:8px">Chưa có dữ liệu</div></div>'; return; }
    var canCheck = _cf.userPerms.cf_check;
    var h = '<table class="cf-table"><thead><tr>';
    if (canCheck) h += '<th style="width:30px"><input type="checkbox" onchange="_cfToggleAll(this)" title="Chọn tất cả chưa kiểm tra"></th>';
    h += '<th style="width:36px"></th><th>Ngày</th><th>Loại</th><th>Mã</th><th>Nội Dung</th><th>Hình Ảnh</th><th style="text-align:right">Số Tiền</th><th>Mã Đơn</th><th>Chốt</th><th style="text-align:right">Chưa Chốt Sổ</th><th>Lịch Sử CN</th></tr></thead><tbody>';

    _cf.records.forEach(function(r) {
        var isThu = r.cashflow_type === 'THU';
        var d = new Date(r.cashflow_date);
        var ds = String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear();
        var isChecked = !!r.checked_by;
        var checkCls = isChecked ? 'cf-check-btn checked' : 'cf-check-btn';
        var checkIcon = isChecked ? '✓' : '👤';
        var amtColor = isThu ? '#059669' : '#e67e22';
        var amtPfx = isThu ? '↑' : '↓';
        var closedBadge = r.is_closed ? '<span style="background:#059669;color:#fff;padding:2px 6px;border-radius:4px;font-size:9px;font-weight:700">Đã chốt</span>' : '<span style="background:#fef3c7;color:#92400e;padding:2px 6px;border-radius:4px;font-size:9px;font-weight:700">Chưa chốt</span>';
        var balColor = r.running_balance >= 0 ? '#1a5276' : '#dc2626';

        // Image thumbnail
        var imgCell = '—';
        if (r.image_url) {
            imgCell = '<img src="'+r.image_url+'" style="width:36px;height:36px;object-fit:cover;border-radius:4px;cursor:pointer;border:1px solid #e2e8f0" onclick="event.stopPropagation();_cfLightbox(\''+r.image_url+'\')" title="Ấn để xem ảnh">';
        }

        h += '<tr'+(isThu?' class="cf-row-thu"':'')+' style="cursor:pointer" onclick="_cfShowDetail('+r.id+')">';
        if (canCheck) {
            var cbChecked = _cf.selected.indexOf(r.id) !== -1 ? ' checked' : '';
            var cbDisabled = isChecked ? ' disabled' : '';
            h += '<td onclick="event.stopPropagation()"><input type="checkbox" data-cfid="'+r.id+'"'+cbChecked+cbDisabled+' onchange="_cfToggleSelect('+r.id+',this.checked)"'+(isChecked?' title="Đã KT: '+r.checked_by_name+'"':'')+' onclick="event.stopPropagation()"></td>';
        }
        h += '<td onclick="event.stopPropagation()"><div class="'+checkCls+'" onclick="'+(canCheck&&!isChecked?'_cfCheck('+r.id+')':'')+'" title="'+(r.checked_by_name||'Chưa kiểm tra')+'">'+checkIcon+'</div></td>';
        h += '<td style="white-space:nowrap;font-weight:600">'+ds+'</td>';
        h += '<td><span class="'+(isThu?'cf-badge-thu':'cf-badge-chi')+'">'+r.cashflow_type+'</span></td>';
        h += '<td style="font-weight:700;color:var(--navy)">'+r.cashflow_code+'</td>';
        h += '<td style="max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="'+(r.description||'')+'">'+( r.description||'—')+'</td>';
        h += '<td style="text-align:center" onclick="event.stopPropagation()">'+imgCell+'</td>';
        h += '<td style="text-align:right;font-weight:800;color:'+amtColor+'">'+amtPfx+' '+_cfFmt(r.amount)+'</td>';
        h += '<td>'+(r.order_code||'—')+'</td>';
        h += '<td>'+closedBadge+'</td>';
        h += '<td style="text-align:right;font-weight:800;color:'+balColor+'">'+_cfFmt(r.running_balance)+'</td>';
        // Lịch Sử CN
        var cnDate = '';
        if (r.created_at) {
            var ca = new Date(r.created_at);
            cnDate = String(ca.getDate()).padStart(2,'0')+'/'+String(ca.getMonth()+1).padStart(2,'0')+' '+String(ca.getHours()).padStart(2,'0')+':'+String(ca.getMinutes()).padStart(2,'0');
        }
        h += '<td style="white-space:nowrap;font-size:10px"><div style="color:var(--navy);font-weight:600">'+cnDate+'</div><div style="color:#64748b">'+(r.created_by_name||'')+'</div></td>';
        h += '</tr>';
    });
    h += '</tbody></table>';
    wrap.innerHTML = h;
}

// ========== LIGHTBOX ==========
function _cfLightbox(url) {
    var overlay = document.createElement('div');
    overlay.id = 'cfLightbox';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:99999;display:flex;align-items:center;justify-content:center;cursor:pointer;animation:fadeIn .2s';
    overlay.onclick = function() { overlay.remove(); };
    var img = document.createElement('img');
    img.src = url;
    img.style.cssText = 'max-width:90vw;max-height:90vh;border-radius:8px;box-shadow:0 20px 60px rgba(0,0,0,0.5);object-fit:contain';
    img.onclick = function(e) { e.stopPropagation(); };
    overlay.appendChild(img);
    // Close button
    var closeBtn = document.createElement('div');
    closeBtn.innerHTML = '✕';
    closeBtn.style.cssText = 'position:absolute;top:20px;right:20px;width:36px;height:36px;background:rgba(255,255,255,0.2);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;color:#fff;cursor:pointer;font-weight:700';
    closeBtn.onclick = function() { overlay.remove(); };
    overlay.appendChild(closeBtn);
    document.body.appendChild(overlay);
    // ESC key to close
    var escHandler = function(e) { if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', escHandler); } };
    document.addEventListener('keydown', escHandler);
}

// ========== DETAIL MODAL ==========
function _cfShowDetail(id) {
    var r = _cf.records.find(function(x){ return x.id === id; });
    if (!r) return;
    var isThu = r.cashflow_type === 'THU';
    var d = new Date(r.cashflow_date);
    var ds = String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear();
    var typeBadge = isThu ? '<span style="background:#1a5276;color:#fff;padding:4px 14px;border-radius:6px;font-weight:800;font-size:13px">THU</span>' : '<span style="background:#e67e22;color:#fff;padding:4px 14px;border-radius:6px;font-weight:800;font-size:13px">CHI</span>';
    var amtColor = isThu ? '#059669' : '#e67e22';
    var statusBadge = r.is_closed ? '<span style="background:#059669;color:#fff;padding:3px 10px;border-radius:6px;font-size:11px;font-weight:700">✅ Đã chốt</span>' : '<span style="background:#fef3c7;color:#92400e;padding:3px 10px;border-radius:6px;font-size:11px;font-weight:700">⏳ Chưa chốt</span>';
    var checkBadge = r.checked_by ? '<span style="color:#059669;font-weight:700">✅ '+r.checked_by_name+'</span>' : '<span style="color:#94a3b8">Chưa kiểm tra</span>';

    var row = function(label, val) { return '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #f1f5f9"><span style="font-size:12px;color:#64748b;font-weight:600">'+label+'</span><span style="font-size:13px;font-weight:700">'+val+'</span></div>'; };

    var body = '<div style="text-align:center;margin-bottom:16px">' + typeBadge + '</div>';
    body += '<div style="text-align:center;font-size:22px;font-weight:900;color:var(--navy);margin-bottom:4px">'+r.cashflow_code+'</div>';
    body += '<div style="text-align:center;font-size:24px;font-weight:900;color:'+amtColor+';margin-bottom:16px">'+_cfFmt(r.amount)+'</div>';
    body += row('📅 Ngày', ds);
    body += row('📝 Nội dung', r.description || '—');
    body += row('📦 Mã đơn', r.order_code || '—');
    body += row('✅ Kiểm tra', checkBadge);
    body += row('📊 Trạng thái', statusBadge);
    body += row('💰 Số dư lúc tạo', '<span style="color:'+(r.running_balance>=0?'#1a5276':'#dc2626')+'">'+_cfFmt(r.running_balance)+'</span>');

    if (r.image_url) {
        body += '<div style="margin-top:14px;text-align:center"><div style="font-size:12px;color:#64748b;font-weight:600;margin-bottom:6px">📸 Hình ảnh</div><img src="'+r.image_url+'" style="max-width:100%;max-height:200px;border-radius:8px;cursor:pointer;border:1px solid #e2e8f0" onclick="_cfLightbox(\''+r.image_url+'\')"></div>';
    }

    var isGD = typeof currentUser !== 'undefined' && currentUser && currentUser.role === 'giam_doc';
    var delBtn = isGD ? '<button class="btn" onclick="_cfDeleteRecord('+r.id+',\''+r.cashflow_code+'\')" style="background:#dc2626;color:#fff;width:auto;font-size:11px">🗑️ Xóa</button>' : '';
    openModal('📋 Chi Tiết Mã Tiền', body, delBtn+'<button class="btn btn-secondary" onclick="closeModal()">Đóng</button>');
}

function _cfToggleSelect(id, checked) {
    if (checked) { if (_cf.selected.indexOf(id)===-1) _cf.selected.push(id); }
    else { _cf.selected = _cf.selected.filter(function(x){return x!==id;}); }
    _cfRenderBatchBar();
}
function _cfToggleAll(el) {
    var cbs = document.querySelectorAll('[data-cfid]');
    _cf.selected = [];
    cbs.forEach(function(cb){ if(!cb.disabled){ cb.checked=el.checked; if(el.checked) _cf.selected.push(Number(cb.dataset.cfid)); }});
    _cfRenderBatchBar();
}
function _cfClearSelection() { _cf.selected=[]; _cfRenderBatchBar(); _cfRenderTable(); }

async function _cfBatchCheck() {
    if (!_cf.selected.length) return;
    try {
        await apiCall('/api/cashflow/batch-check','PUT',{ids:_cf.selected});
        showToast('✅ Đã kiểm tra '+_cf.selected.length+' mã');
        _cf.selected = [];
        var treeData = await apiCall('/api/cashflow/tree');
        _cf.tree = treeData.tree||[]; _cf.totalUnclosed = treeData.total_unclosed||0;
        _cfRenderSidebar(); await _cfLoadRecords();
    } catch(e) { showToast('Lỗi: '+e.message,'error'); }
}

async function _cfCheck(id) {
    try {
        await apiCall('/api/cashflow/'+id+'/check','PUT');
        showToast('✅ Đã kiểm tra');
        await _cfLoadRecords();
    } catch(e) { showToast('Lỗi: '+e.message,'error'); }
}

async function _cfDeleteRecord(id, code) {
    if (!confirm('⚠️ Bạn có chắc muốn XÓA mã tiền ' + code + '?\n\nHành động này KHÔNG thể hoàn tác!')) return;
    try {
        await apiCall('/api/cashflow/'+id, 'DELETE');
        showToast('🗑️ Đã xóa: ' + code);
        closeModal();
        var treeData = await apiCall('/api/cashflow/tree');
        _cf.tree = treeData.tree||[]; _cf.totalUnclosed = treeData.total_unclosed||0;
        _cfRenderSidebar(); await _cfLoadRecords();
    } catch(e) { showToast('Lỗi: '+e.message,'error'); }
}

var _cfPastedFile = null;

async function _cfShowAddChi() {
    _cfPastedFile = null;
    var today = new Date();
    var dd = String(today.getDate()).padStart(2,'0');
    var mm = String(today.getMonth()+1).padStart(2,'0');
    var yyyy = today.getFullYear();
    var todayStr = yyyy+'-'+mm+'-'+dd;
    var displayDate = dd+'/'+mm+'/'+yyyy;
    var userName = (typeof currentUser!=='undefined' && currentUser) ? (currentUser.full_name||currentUser.username) : '';

    // Get next code
    var seqData = {};
    try { seqData = await apiCall('/api/cashflow/next-seq?date='+todayStr); } catch(e){}
    var codePreview = seqData.code || 'TC?-'+today.getDate()+'-'+(today.getMonth()+1)+'-Y'+String(yyyy).slice(-2);

    var body = '<div style="display:grid;gap:12px">'
        // Ngày
        +'<div style="display:grid;grid-template-columns:140px 1fr;align-items:center;gap:8px"><label style="font-size:12px;font-weight:700;color:var(--navy)">📅 Ngày <span style="color:var(--danger)">*</span></label><input type="text" class="form-control" value="'+displayDate+'" readonly style="padding:10px 12px;font-size:13px;background:#f1f5f9;cursor:not-allowed"></div>'
        // PT Thanh Toán
        +'<div style="display:grid;grid-template-columns:140px 1fr;align-items:center;gap:8px"><label style="font-size:12px;font-weight:700;color:var(--navy)">💳 PT Thanh Toán</label><input type="text" class="form-control" value="TM" readonly style="padding:10px 12px;font-size:13px;background:#f1f5f9;cursor:not-allowed;font-weight:700"></div>'
        // Nguồn Tiền
        +'<div style="display:grid;grid-template-columns:140px 1fr;align-items:center;gap:8px"><label style="font-size:12px;font-weight:700;color:var(--navy)">📂 Nguồn Tiền <span style="color:var(--danger)">*</span></label><div style="display:flex;gap:6px"><button type="button" id="cfSrcCongty" onclick="_cfPickSrc(\'congty\')" class="btn" style="flex:1;padding:8px;font-size:12px;font-weight:800;border-radius:8px;background:var(--navy);color:#fff;border:2px solid var(--navy)">CÔNG TY</button><button type="button" id="cfSrcCpm" onclick="_cfPickSrc(\'cophanmay\')" class="btn" style="flex:1;padding:8px;font-size:12px;font-weight:800;border-radius:8px;background:#fff;color:var(--navy);border:2px solid var(--gray-300)">CP MAY</button></div></div>'
        // Số Tiền
        +'<div style="display:grid;grid-template-columns:140px 1fr;align-items:center;gap:8px"><label style="font-size:12px;font-weight:700;color:var(--navy)">💰 Số Tiền <span style="color:var(--danger)">*</span></label><input type="number" id="cfAmount" class="form-control" placeholder="Nhập số tiền" style="padding:12px;font-size:15px;font-weight:700"></div>'
        // Nội Dung Chi
        +'<div style="display:grid;grid-template-columns:140px 1fr;align-items:center;gap:8px"><label style="font-size:12px;font-weight:700;color:var(--navy)">📝 Nội Dung Chi <span style="color:var(--danger)">*</span></label><input type="text" id="cfDesc" class="form-control" placeholder="Nội dung chi tiết" style="padding:10px 12px;font-size:13px"></div>'
        // Hình Ảnh
        +'<div style="display:grid;grid-template-columns:140px 1fr;align-items:center;gap:8px"><label style="font-size:12px;font-weight:700;color:var(--navy)">📸 Hình Ảnh <span style="color:var(--danger)">*</span></label><div id="cfPasteZone" style="border:2px dashed #cbd5e1;border-radius:8px;min-height:80px;display:flex;align-items:center;justify-content:center;cursor:pointer;position:relative;overflow:hidden;background:#fafafa" tabindex="0"><span id="cfPasteHint" style="color:#94a3b8;font-size:12px">📋 Ctrl+V để dán ảnh</span><img id="cfPastePreview" style="display:none;max-width:100%;max-height:150px;border-radius:6px"></div></div>'
        // Mã
        +'<div style="display:grid;grid-template-columns:140px 1fr;align-items:center;gap:8px"><label style="font-size:12px;font-weight:700;color:var(--navy)">🏷️ Mã</label><input type="text" id="cfCodePreview" class="form-control" value="'+codePreview+'" readonly style="padding:10px 12px;font-size:13px;background:#f1f5f9;cursor:not-allowed;font-weight:700;color:var(--navy)"></div>'
        // Người Ghi Nhận
        +'<div style="display:grid;grid-template-columns:140px 1fr;align-items:center;gap:8px"><label style="font-size:12px;font-weight:700;color:var(--navy)">👤 Người Ghi Nhận</label><input type="text" class="form-control" value="'+userName+'" readonly style="padding:10px 12px;font-size:13px;background:#f1f5f9;cursor:not-allowed"></div>'
        +'<input type="hidden" id="cfDate" value="'+todayStr+'">'
        +'<input type="hidden" id="cfMoneySrc" value="congty">'
        +'</div>';

    openModal('💸 Tạo Phiếu Chi', body, '<button class="btn btn-secondary" onclick="closeModal()">Hủy</button><button class="btn btn-primary" onclick="_cfSubmitChi()" style="width:auto;background:linear-gradient(135deg,#e67e22,#d35400)">💸 Tạo Phiếu Chi</button>');

    // Setup paste listener
    setTimeout(function(){
        var zone = document.getElementById('cfPasteZone');
        if (zone) {
            zone.addEventListener('paste', _cfHandlePaste);
            zone.addEventListener('click', function(){ zone.focus(); });
        }
        // Also listen on document level
        document.addEventListener('paste', _cfHandlePaste);
    }, 200);
}

async function _cfPickSrc(src) {
    document.getElementById('cfMoneySrc').value = src;
    var btnCt = document.getElementById('cfSrcCongty');
    var btnCp = document.getElementById('cfSrcCpm');
    if (src === 'congty') {
        btnCt.style.background = 'var(--navy)'; btnCt.style.color = '#fff'; btnCt.style.borderColor = 'var(--navy)';
        btnCp.style.background = '#fff'; btnCp.style.color = 'var(--navy)'; btnCp.style.borderColor = 'var(--gray-300)';
    } else {
        btnCp.style.background = 'var(--navy)'; btnCp.style.color = '#fff'; btnCp.style.borderColor = 'var(--navy)';
        btnCt.style.background = '#fff'; btnCt.style.color = 'var(--navy)'; btnCt.style.borderColor = 'var(--gray-300)';
    }
    // Update code preview based on source
    var dateVal = document.getElementById('cfDate')?.value;
    if (dateVal) {
        var codeEl = document.getElementById('cfCodePreview');
        if (codeEl) {
            try {
                var seqUrl = src === 'cophanmay' ? '/api/cashflow/cpmay-next-seq?date='+dateVal : '/api/cashflow/next-seq?date='+dateVal;
                var seqData = await apiCall(seqUrl);
                codeEl.value = seqData.code || codeEl.value;
                codeEl.style.color = src === 'cophanmay' ? '#7c3aed' : 'var(--navy)';
                codeEl.style.background = src === 'cophanmay' ? '#f5f3ff' : '#f1f5f9';
            } catch(e){}
        }
    }
}

function _cfHandlePaste(e) {
    if (!document.getElementById('cfPasteZone')) { document.removeEventListener('paste', _cfHandlePaste); return; }
    var items = (e.clipboardData || e.originalEvent?.clipboardData)?.items;
    if (!items) return;
    for (var i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
            e.preventDefault();
            _cfPastedFile = items[i].getAsFile();
            var reader = new FileReader();
            reader.onload = function(ev) {
                var preview = document.getElementById('cfPastePreview');
                var hint = document.getElementById('cfPasteHint');
                if (preview) { preview.src = ev.target.result; preview.style.display = 'block'; }
                if (hint) hint.style.display = 'none';
            };
            reader.readAsDataURL(_cfPastedFile);
            return;
        }
    }
}

var _cfSubmitting = false;
async function _cfSubmitChi() {
    if (_cfSubmitting) return;
    var desc = document.getElementById('cfDesc')?.value;
    var amount = document.getElementById('cfAmount')?.value;
    var moneySrc = document.getElementById('cfMoneySrc')?.value || 'congty';
    if (!desc||!desc.trim()) { showToast('Vui lòng nhập nội dung chi!','error'); return; }
    if (!amount||Number(amount)<=0) { showToast('Vui lòng nhập số tiền!','error'); return; }
    if (!_cfPastedFile) { showToast('Vui lòng dán hình ảnh (Ctrl+V)!','error'); return; }

    _cfSubmitting = true;
    // Disable submit button
    var submitBtn = document.querySelector('[onclick="_cfSubmitChi()"]');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.style.opacity = '0.5'; submitBtn.textContent = '⏳ Đang tạo...'; }

    // Upload image first
    var imgUrl = '', imgPath = '';
    try {
        var fd = new FormData();
        fd.append('file', _cfPastedFile, 'paste_'+Date.now()+'.png');
        var uploadRes = await fetch('/api/cashflow/upload', { method:'POST', body:fd, credentials:'include' });
        var uploadData = await uploadRes.json();
        if (uploadData.success) { imgUrl = uploadData.url; imgPath = uploadData.path; }
        else { showToast('Lỗi upload ảnh: '+(uploadData.error||''),'error'); _cfSubmitting=false; if(submitBtn){submitBtn.disabled=false;submitBtn.style.opacity='1';submitBtn.textContent='💸 Tạo Phiếu Chi';} return; }
    } catch(ue) { showToast('Lỗi upload: '+ue.message,'error'); _cfSubmitting=false; if(submitBtn){submitBtn.disabled=false;submitBtn.style.opacity='1';submitBtn.textContent='💸 Tạo Phiếu Chi';} return; }

    try {
        var data = await apiCall('/api/cashflow/records','POST',{
            cashflow_date: document.getElementById('cfDate')?.value,
            description: desc.trim(),
            amount: Number(amount),
            money_source: moneySrc,
            image_url: imgUrl,
            image_path: imgPath
        });
        if (data.success) {
            showToast('✅ Đã tạo phiếu chi: '+data.cashflow_code); closeModal();
            document.removeEventListener('paste', _cfHandlePaste);
            _cfPastedFile = null;
            var treeData = await apiCall('/api/cashflow/tree');
            _cf.tree = treeData.tree||[]; _cf.totalUnclosed = treeData.total_unclosed||0;
            _cfRenderSidebar(); await _cfLoadRecords();
        } else showToast(data.error||'Lỗi','error');
    } catch(e) { showToast('Lỗi: '+e.message,'error'); }
    _cfSubmitting = false;
}

// ========== PERMISSIONS ==========
function _cfShowPermissions() {
    var ROLES = [{slug:'giam_doc',name:'Giám Đốc'},{slug:'quan_ly_cap_cao',name:'QL Cấp Cao'},{slug:'quan_ly',name:'Quản Lý'},{slug:'truong_phong',name:'Trưởng Phòng'},{slug:'nhan_vien',name:'Nhân Viên'}];
    var ACTIONS = [{key:'cf_check',label:'✅ Kiểm Tra',desc:'Đánh dấu đã kiểm tra mã tiền'},{key:'cf_create_chi',label:'💸 Tạo Phiếu Chi',desc:'Tạo phiếu chi mới'}];
    var perms = _cf.allPerms || {};
    var h = '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr><th style="padding:8px;text-align:left;font-size:10px;background:var(--navy);color:#fff">Hành Động</th>';
    ROLES.forEach(function(r){ h += '<th style="padding:8px;text-align:center;font-size:10px;background:var(--navy);color:#fff">'+r.name+'</th>'; });
    h += '</tr></thead><tbody>';
    ACTIONS.forEach(function(a){
        h += '<tr><td style="padding:8px;font-weight:700">'+a.label+'<div style="font-size:10px;color:var(--gray-400)">'+a.desc+'</div></td>';
        ROLES.forEach(function(r){
            var checked = (perms[a.key]||[]).indexOf(r.slug) !== -1 ? ' checked' : '';
            h += '<td style="text-align:center;padding:8px"><input type="checkbox" class="cfPermCb" data-action="'+a.key+'" data-role="'+r.slug+'"'+checked+'></td>';
        });
        h += '</tr>';
    });
    h += '</tbody></table></div>';
    openModal('🔐 Phân Quyền Sổ Thu Chi', h, '<button class="btn btn-secondary" onclick="closeModal()">Đóng</button><button class="btn btn-primary" onclick="_cfSavePermissions()" style="width:auto">💾 Lưu</button>');
}

async function _cfSavePermissions() {
    var perms = {};
    document.querySelectorAll('.cfPermCb').forEach(function(cb){
        var a = cb.dataset.action, r = cb.dataset.role;
        if (!perms[a]) perms[a] = [];
        if (cb.checked) perms[a].push(r);
    });
    try {
        await apiCall('/api/cashflow/permissions','PUT',perms);
        showToast('✅ Đã lưu phân quyền'); closeModal();
        var permData = await apiCall('/api/cashflow/permissions');
        _cf.userPerms = permData.user_permissions||{}; _cf.allPerms = permData.permissions||{};
        _cfRenderToolbar(); _cfRenderTable();
    } catch(e) { showToast('Lỗi: '+e.message,'error'); }
}

// ========== TELEGRAM CONFIG ==========
async function _cfShowTgSettings() {
    try {
        var data = await apiCall('/api/cashflow/tg-config');
        var h = '<div style="display:grid;gap:14px">'
            +'<div class="form-group"><label style="font-size:12px;font-weight:700;color:var(--navy);margin-bottom:4px;display:block">📢 Group/Channel ID</label><input type="text" id="cfTgGroup" class="form-control" value="'+(data.group_id||'')+'" placeholder="-100xxxxxxxxxx" style="padding:10px 12px;font-size:13px"></div>'
            +'<div style="padding:8px 12px;background:#f0fdf4;border-radius:8px;font-size:11px;color:#065f46;border:1px solid #bbf7d0">🤖 Bot Token lấy từ <b>Cài Đặt Phân Tầng</b> (dùng chung)</div>'
            +'</div>';
        openModal('📢 Cài Đặt Telegram — Sổ Thu Chi', h, '<button class="btn btn-secondary" onclick="closeModal()">Đóng</button><button onclick="_cfTestTg()" class="btn" style="background:var(--info);color:#fff;width:auto">🔔 Test</button><button class="btn btn-primary" onclick="_cfSaveTg()" style="width:auto">💾 Lưu</button>');
    } catch(e) { showToast('Lỗi: '+e.message,'error'); }
}

async function _cfSaveTg() {
    var gid = document.getElementById('cfTgGroup')?.value||'';
    try { await apiCall('/api/cashflow/tg-config','PUT',{group_id:gid}); showToast('✅ Đã lưu Telegram'); closeModal(); }
    catch(e) { showToast('Lỗi: '+e.message,'error'); }
}

async function _cfTestTg() {
    var gid = document.getElementById('cfTgGroup')?.value||'';
    if (!gid) { showToast('Nhập Group ID trước!','error'); return; }
    try { await apiCall('/api/cashflow/tg-test','POST',{group_id:gid}); showToast('✅ Đã gửi test!'); }
    catch(e) { showToast('Lỗi: '+e.message,'error'); }
}
