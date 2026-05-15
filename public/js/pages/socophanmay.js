// ========== SỔ CỔ PHẦN MAY — Lọc từ cashflow_records (money_source='cophanmay') ==========
var _cpm = { tree: [], records: [], filter: {}, userPerms: {} };
function _cpmFmt(n) { return Number(n||0).toLocaleString('vi-VN') + 'đ'; }

async function renderSocophanmayPage(content) {
    if (!document.getElementById('cpmStyles')) {
        var st = document.createElement('style'); st.id = 'cpmStyles';
        st.textContent = '.cpm-wrap{display:flex;height:calc(100vh - 60px);overflow:hidden}.cpm-sidebar{width:260px;min-width:260px;background:#fff;border-right:1px solid var(--gray-200);overflow-y:auto}.cpm-main{flex:1;min-width:0;display:flex;flex-direction:column;overflow-y:auto;padding:16px}.cpm-toolbar{display:flex;align-items:center;gap:8px;padding:10px 16px;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff;border-radius:10px;margin-bottom:12px;flex-wrap:wrap}.cpm-table-wrap{overflow-x:auto}.cpm-table{width:100%;border-collapse:collapse;font-size:12px}.cpm-table th{padding:8px 10px;text-align:left;font-weight:700;font-size:10px;text-transform:uppercase;color:var(--gray-400);background:var(--gray-100);border-bottom:2px solid var(--gray-200);white-space:nowrap}.cpm-table td{padding:8px 10px;border-bottom:1px solid var(--gray-100);vertical-align:middle}.cpm-table tr:hover{background:#f8fafc}.cpm-badge-chi{background:#e67e22;color:#fff;padding:2px 8px;border-radius:4px;font-weight:800;font-size:10px}.cpm-sidebar-title{font-size:13px;font-weight:800;color:#7c3aed;padding:16px;border-bottom:1px solid var(--gray-200);text-align:center}.cpm-tree-total{background:linear-gradient(135deg,#7c3aed,#a78bfa);color:#fff;padding:12px 16px;font-size:13px;font-weight:800;display:flex;justify-content:space-between}.cpm-tree-year{padding:8px 16px;font-weight:800;font-size:12px;color:#7c3aed;cursor:pointer;display:flex;justify-content:space-between;align-items:center;background:#f8fafc;border-bottom:1px solid var(--gray-200)}.cpm-tree-month{padding:6px 16px 6px 32px;font-size:11px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #f8fafc}.cpm-tree-month:hover{background:#f5f3ff}.cpm-tree-month.active{background:#ede9fe;font-weight:700}.cpm-check-btn{width:28px;height:28px;border-radius:50%;border:2px solid #cbd5e1;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:14px;transition:all .15s}.cpm-check-btn.checked{background:#059669;border-color:#059669;color:#fff}';
        document.head.appendChild(st);
    }
    content.innerHTML = '<div class="cpm-wrap"><div class="cpm-sidebar" id="cpmSidebar"><div style="padding:20px;text-align:center;color:var(--gray-400);font-size:12px">Đang tải...</div></div><div class="cpm-main"><div class="cpm-toolbar" id="cpmToolbar"></div><div class="cpm-table-wrap" id="cpmTableWrap"></div></div></div>';

    var [treeData, permData] = await Promise.all([
        apiCall('/api/cashflow/tree?money_source=cophanmay').catch(function(){return{}}),
        apiCall('/api/cashflow/permissions').catch(function(){return{}})
    ]);
    _cpm.tree = treeData.tree || [];
    _cpm.totalUnclosed = treeData.total_unclosed || 0;
    _cpm.userPerms = permData.user_permissions || {};
    _cpm.filter = {};

    _cpmRenderSidebar();
    await _cpmLoadRecords();
}

function _cpmRenderSidebar() {
    var sb = document.getElementById('cpmSidebar'); if (!sb) return;
    var h = '<div class="cpm-sidebar-title">─── Sổ Cổ Phần May ───</div>';
    h += '<div class="cpm-tree-total" style="cursor:pointer" onclick="_cpmFilterAll()"><span>▼ Chưa chốt</span><span>' + _cpmFmt(_cpm.totalUnclosed) + '</span></div>';

    _cpm.tree.forEach(function(yr) {
        var isCurYear = yr.year === new Date().getFullYear();
        h += '<div class="cpm-tree-year" onclick="_cpmToggleYear(this)"><span>' + (isCurYear?'▼':'▶') + ' Năm '+yr.year+'</span><span style="background:rgba(0,0,0,0.08);padding:2px 8px;border-radius:10px;font-size:10px">'+_cpmFmt(yr.balance)+'</span></div>';
        h += '<div class="cpm-year-months" style="display:'+(isCurYear?'block':'none')+'">';
        yr.months.forEach(function(m) {
            var isActive = _cpm.filter.year===yr.year && _cpm.filter.month===m.month;
            h += '<div class="cpm-tree-month'+(isActive?' active':'')+'" onclick="_cpmFilterMonth('+yr.year+','+m.month+')"><span>▸ Tháng '+String(m.month).padStart(2,'0')+'</span><span style="color:'+(m.balance>=0?'#059669':'#dc2626')+';font-weight:700">'+_cpmFmt(m.balance)+'</span></div>';
        });
        h += '</div>';
    });

    // Telegram button for GĐ only
    var isGD = typeof currentUser !== 'undefined' && currentUser && currentUser.role === 'giam_doc';
    if (isGD) {
        h += '<div style="padding:12px;border-top:1px solid var(--gray-200);display:flex;flex-direction:column;gap:6px">';
        h += '<button onclick="_cpmShowTgSettings()" style="background:linear-gradient(135deg,#0088cc,#29b6f6);color:#fff;border:none;padding:8px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer">📢 Telegram</button>';
        h += '</div>';
    }
    sb.innerHTML = h;
}

function _cpmToggleYear(el) {
    var m = el.nextElementSibling; if (!m) return;
    var open = m.style.display !== 'none'; m.style.display = open ? 'none' : 'block';
    var s = el.querySelector('span'); s.textContent = s.textContent.replace(open?'▼':'▶', open?'▶':'▼');
}
function _cpmFilterMonth(y, m) { _cpm.filter = {year:y,month:m}; _cpmLoadRecords(); _cpmRenderSidebar(); }
function _cpmFilterAll() { _cpm.filter = {}; _cpmLoadRecords(); _cpmRenderSidebar(); }

async function _cpmLoadRecords() {
    var p = '?money_source=cophanmay';
    if (_cpm.filter.year) p += '&year='+_cpm.filter.year;
    if (_cpm.filter.month) p += '&month='+_cpm.filter.month;
    var data = await apiCall('/api/cashflow/records'+p);
    _cpm.records = data.records || [];
    _cpmRenderToolbar(); _cpmRenderTable();
}

function _cpmRenderToolbar() {
    var tb = document.getElementById('cpmToolbar'); if (!tb) return;
    var ft = 'Tất cả';
    if (_cpm.filter.year && _cpm.filter.month) ft = 'Tháng '+_cpm.filter.month+'/'+_cpm.filter.year;
    else if (_cpm.filter.year) ft = 'Năm '+_cpm.filter.year;
    var tThu=0, tChi=0;
    _cpm.records.forEach(function(r){ if(r.cashflow_type==='THU') tThu+=Number(r.amount); else tChi+=Number(r.amount); });
    var addBtn = '<button onclick="_cpmShowAdd()" style="background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;border:none;padding:6px 14px;border-radius:8px;font-weight:800;font-size:11px;cursor:pointer">➕ Tạo Mã Tiền</button>';
    tb.innerHTML = '<span style="font-weight:800;font-size:13px">🧵 '+ft+'</span><span style="flex:1"></span><span style="font-size:11px">THU: <b style="color:#2ecc71">'+_cpmFmt(tThu)+'</b></span><span style="font-size:11px">CHI: <b style="color:#e67e22">'+_cpmFmt(tChi)+'</b></span><span style="font-size:12px;font-weight:800">SỐ DƯ: <b style="color:'+(tThu-tChi>=0?'#2ecc71':'#e74c3c')+'">'+_cpmFmt(tThu-tChi)+'</b></span>'+addBtn;
}

function _cpmRenderTable() {
    var wrap = document.getElementById('cpmTableWrap'); if (!wrap) return;
    if (!_cpm.records.length) { wrap.innerHTML = '<div style="text-align:center;padding:40px;color:var(--gray-400)"><div style="font-size:32px">🧵</div><div style="margin-top:8px">Chưa có mã tiền Cổ Phần May</div></div>'; return; }
    var canCheck = _cpm.userPerms.cf_check;
    var h = '<table class="cpm-table"><thead><tr>';
    h += '<th style="width:36px"></th><th>Ngày</th><th>Loại</th><th>Mã</th><th>Nội Dung</th><th>Hình Ảnh</th><th style="text-align:right">Số Tiền</th><th>Chốt</th><th style="text-align:right">Số Dư CP May</th><th>Lịch Sử CN</th></tr></thead><tbody>';

    _cpm.records.forEach(function(r) {
        var d = new Date(r.cashflow_date);
        var ds = String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear();
        var isChecked = !!r.checked_by;
        var checkCls = isChecked ? 'cpm-check-btn checked' : 'cpm-check-btn';
        var checkIcon = isChecked ? '✓' : '👤';
        var closedBadge = r.is_closed ? '<span style="background:#059669;color:#fff;padding:2px 6px;border-radius:4px;font-size:9px;font-weight:700">Đã chốt</span>' : '<span style="background:#fef3c7;color:#92400e;padding:2px 6px;border-radius:4px;font-size:9px;font-weight:700">Chưa chốt</span>';
        var balColor = r.running_balance >= 0 ? '#7c3aed' : '#dc2626';

        var isThu = r.cashflow_type === 'THU';
        var typeBadge = isThu ? '<span style="background:#1a5276;color:#fff;padding:2px 8px;border-radius:4px;font-weight:800;font-size:10px">THU</span>' : '<span style="background:#e67e22;color:#fff;padding:2px 8px;border-radius:4px;font-weight:800;font-size:10px">CHI</span>';
        var amtArrow = isThu ? '↑' : '↓';
        var amtColor = isThu ? '#059669' : '#e67e22';
        var rowBg = isThu ? 'background:#e8f4fd!important' : '';

        // Image thumbnail
        var imgCell = '—';
        if (r.image_url) {
            imgCell = '<img src="'+r.image_url+'" style="width:36px;height:36px;object-fit:cover;border-radius:4px;cursor:pointer;border:1px solid #e2e8f0" onclick="event.stopPropagation();_cpmLightbox(\''+r.image_url+'\')" title="Ấn để xem ảnh">';
        }

        // Lịch Sử CN
        var cnDate = '';
        if (r.created_at) {
            var ca = new Date(r.created_at);
            cnDate = String(ca.getDate()).padStart(2,'0')+'/'+String(ca.getMonth()+1).padStart(2,'0')+' '+String(ca.getHours()).padStart(2,'0')+':'+String(ca.getMinutes()).padStart(2,'0');
        }

        h += '<tr style="cursor:pointer;'+rowBg+'" onclick="_cpmShowDetail('+r.id+')">';
        h += '<td onclick="event.stopPropagation()"><div class="'+checkCls+'" onclick="'+(canCheck&&!isChecked?'_cpmCheck('+r.id+')':'')+'" title="'+(r.checked_by_name||'Chưa kiểm tra')+'">'+checkIcon+'</div></td>';
        h += '<td style="white-space:nowrap;font-weight:600">'+ds+'</td>';
        h += '<td>'+typeBadge+'</td>';
        h += '<td style="font-weight:700;color:#7c3aed">'+r.cashflow_code+'</td>';
        h += '<td style="max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="'+(r.description||'')+'">'+(r.description||'—')+'</td>';
        h += '<td style="text-align:center" onclick="event.stopPropagation()">'+imgCell+'</td>';
        h += '<td style="text-align:right;font-weight:800;color:'+amtColor+'">'+amtArrow+' '+_cpmFmt(r.amount)+'</td>';
        h += '<td>'+closedBadge+'</td>';
        h += '<td style="text-align:right;font-weight:800;color:'+balColor+'">'+_cpmFmt(r.running_balance)+'</td>';
        h += '<td style="white-space:nowrap;font-size:10px"><div style="color:#7c3aed;font-weight:600">'+cnDate+'</div><div style="color:#64748b">'+(r.created_by_name||'')+'</div></td>';
        h += '</tr>';
    });
    h += '</tbody></table>';
    wrap.innerHTML = h;
}

// ========== CPM LIGHTBOX ==========
function _cpmLightbox(url) {
    var overlay = document.createElement('div');
    overlay.id = 'cpmLightbox';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:99999;display:flex;align-items:center;justify-content:center;cursor:pointer';
    overlay.onclick = function() { overlay.remove(); };
    var img = document.createElement('img');
    img.src = url;
    img.style.cssText = 'max-width:90vw;max-height:90vh;border-radius:8px;box-shadow:0 20px 60px rgba(0,0,0,0.5);object-fit:contain';
    img.onclick = function(e) { e.stopPropagation(); };
    overlay.appendChild(img);
    var closeBtn = document.createElement('div');
    closeBtn.innerHTML = '✕';
    closeBtn.style.cssText = 'position:absolute;top:20px;right:20px;width:36px;height:36px;background:rgba(255,255,255,0.2);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;color:#fff;cursor:pointer;font-weight:700';
    closeBtn.onclick = function() { overlay.remove(); };
    overlay.appendChild(closeBtn);
    document.body.appendChild(overlay);
    var escHandler = function(e) { if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', escHandler); } };
    document.addEventListener('keydown', escHandler);
}

// ========== CPM DETAIL ==========
function _cpmShowDetail(id) {
    var r = _cpm.records.find(function(x){ return x.id === id; });
    if (!r) return;
    var d = new Date(r.cashflow_date);
    var ds = String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear();
    var statusBadge = r.is_closed ? '<span style="background:#059669;color:#fff;padding:3px 10px;border-radius:6px;font-size:11px;font-weight:700">✅ Đã chốt</span>' : '<span style="background:#fef3c7;color:#92400e;padding:3px 10px;border-radius:6px;font-size:11px;font-weight:700">⏳ Chưa chốt</span>';
    var checkBadge = r.checked_by ? '<span style="color:#059669;font-weight:700">✅ '+r.checked_by_name+'</span>' : '<span style="color:#94a3b8">Chưa kiểm tra</span>';

    var row = function(label, val) { return '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #f1f5f9"><span style="font-size:12px;color:#64748b;font-weight:600">'+label+'</span><span style="font-size:13px;font-weight:700">'+val+'</span></div>'; };

    var body = '<div style="text-align:center;margin-bottom:16px"><span style="background:#7c3aed;color:#fff;padding:4px 14px;border-radius:6px;font-weight:800;font-size:13px">CỔ PHẦN MAY</span></div>';
    body += '<div style="text-align:center;font-size:22px;font-weight:900;color:#7c3aed;margin-bottom:4px">'+r.cashflow_code+'</div>';
    body += '<div style="text-align:center;font-size:24px;font-weight:900;color:#e67e22;margin-bottom:16px">'+_cpmFmt(r.amount)+'</div>';
    body += row('📅 Ngày', ds);
    body += row('📝 Nội dung', r.description || '—');
    body += row('✅ Kiểm tra', checkBadge);
    body += row('📊 Trạng thái', statusBadge);

    if (r.image_url) {
        body += '<div style="margin-top:14px;text-align:center"><div style="font-size:12px;color:#64748b;font-weight:600;margin-bottom:6px">📸 Hình ảnh</div><img src="'+r.image_url+'" style="max-width:100%;max-height:200px;border-radius:8px;cursor:pointer;border:1px solid #e2e8f0" onclick="_cpmLightbox(\''+r.image_url+'\')"></div>';
    }

    var isGD = typeof currentUser !== 'undefined' && currentUser && currentUser.role === 'giam_doc';
    var delBtn = isGD ? '<button class="btn" onclick="_cpmDeleteRecord('+r.id+',\''+r.cashflow_code+'\')" style="background:#dc2626;color:#fff;width:auto;font-size:11px">🗑️ Xóa</button>' : '';
    openModal('🧵 Chi Tiết — Cổ Phần May', body, delBtn+'<button class="btn btn-secondary" onclick="closeModal()">Đóng</button>');
}

async function _cpmCheck(id) {
    try {
        await apiCall('/api/cashflow/'+id+'/check','PUT');
        showToast('✅ Đã kiểm tra');
        await _cpmLoadRecords();
    } catch(e) { showToast('Lỗi: '+e.message,'error'); }
}

async function _cpmDeleteRecord(id, code) {
    if (!confirm('⚠️ Bạn có chắc muốn XÓA mã tiền ' + code + '?\n\nHành động này KHÔNG thể hoàn tác!')) return;
    try {
        await apiCall('/api/cashflow/'+id, 'DELETE');
        showToast('🗑️ Đã xóa: ' + code);
        closeModal();
        var treeData = await apiCall('/api/cashflow/tree?money_source=cophanmay');
        _cpm.tree = treeData.tree||[]; _cpm.totalUnclosed = treeData.total_unclosed||0;
        _cpmRenderSidebar(); await _cpmLoadRecords();
    } catch(e) { showToast('Lỗi: '+e.message,'error'); }
}

// ========== TELEGRAM CONFIG ==========
async function _cpmShowTgSettings() {
    try {
        var data = await apiCall('/api/cashflow/cpmay-tg-config');
        var h = '<div style="display:grid;gap:14px">'
            +'<div class="form-group"><label style="font-size:12px;font-weight:700;color:#7c3aed;margin-bottom:4px;display:block">📢 Group/Channel ID</label><input type="text" id="cpmTgGroup" class="form-control" value="'+(data.group_id||'')+'" placeholder="-100xxxxxxxxxx" style="padding:10px 12px;font-size:13px"></div>'
            +'<div style="padding:8px 12px;background:#f5f3ff;border-radius:8px;font-size:11px;color:#5b21b6;border:1px solid #ddd6fe">🤖 Bot Token lấy từ <b>Cài Đặt Phân Tầng</b> (dùng chung)</div>'
            +'</div>';
        openModal('📢 Cài Đặt Telegram — Sổ CP May', h, '<button class="btn btn-secondary" onclick="closeModal()">Đóng</button><button onclick="_cpmTestTg()" class="btn" style="background:var(--info);color:#fff;width:auto">🔔 Test</button><button class="btn btn-primary" onclick="_cpmSaveTg()" style="width:auto">💾 Lưu</button>');
    } catch(e) { showToast('Lỗi: '+e.message,'error'); }
}

async function _cpmSaveTg() {
    var gid = document.getElementById('cpmTgGroup')?.value || '';
    try { await apiCall('/api/cashflow/cpmay-tg-config','PUT',{group_id:gid}); showToast('✅ Đã lưu Telegram CP May'); closeModal(); }
    catch(e) { showToast('Lỗi: '+e.message,'error'); }
}

async function _cpmTestTg() {
    var gid = document.getElementById('cpmTgGroup')?.value || '';
    if (!gid) { showToast('Nhập Group ID trước!','error'); return; }
    try { await apiCall('/api/cashflow/cpmay-tg-test','POST',{group_id:gid}); showToast('✅ Đã gửi test!'); }
    catch(e) { showToast('Lỗi: '+e.message,'error'); }
}

// ========== ADD CPMAY RECORD ==========
var _cpmPastedFile = null;
var _cpmSubmitting = false;

async function _cpmShowAdd() {
    _cpmPastedFile = null;
    var today = new Date();
    var dd = String(today.getDate()).padStart(2,'0');
    var mm = String(today.getMonth()+1).padStart(2,'0');
    var yyyy = today.getFullYear();
    var todayStr = yyyy+'-'+mm+'-'+dd;
    var displayDate = dd+'/'+mm+'/'+yyyy;
    var userName = (typeof currentUser!=='undefined' && currentUser) ? (currentUser.full_name||currentUser.username) : '';

    // Get next CPMAY code
    var seqData = {};
    try { seqData = await apiCall('/api/cashflow/cpmay-next-seq?date='+todayStr); } catch(e){}
    var codePreview = seqData.code || 'CPMAY-TM-?-'+today.getDate()+'-'+(today.getMonth()+1)+'-Y'+String(yyyy).slice(-2);

    var body = '<div style="display:grid;gap:12px">'
        +'<div style="display:grid;grid-template-columns:140px 1fr;align-items:center;gap:8px"><label style="font-size:12px;font-weight:700;color:#7c3aed">📅 Ngày</label><input type="text" class="form-control" value="'+displayDate+'" readonly style="padding:10px 12px;font-size:13px;background:#f1f5f9;cursor:not-allowed"></div>'
        +'<div style="display:grid;grid-template-columns:140px 1fr;align-items:center;gap:8px"><label style="font-size:12px;font-weight:700;color:#7c3aed">📌 Loại <span style="color:var(--danger)">*</span></label><div style="display:flex;gap:6px"><button type="button" id="cpmTypeThu" onclick="_cpmPickType(\'THU\')" class="btn" style="flex:1;padding:8px;font-size:12px;font-weight:800;border-radius:8px;background:#059669;color:#fff;border:2px solid #059669">THU</button><button type="button" id="cpmTypeChi" onclick="_cpmPickType(\'CHI\')" class="btn" style="flex:1;padding:8px;font-size:12px;font-weight:800;border-radius:8px;background:#fff;color:var(--navy);border:2px solid var(--gray-300)">CHI</button></div></div>'
        +'<div style="display:grid;grid-template-columns:140px 1fr;align-items:center;gap:8px"><label style="font-size:12px;font-weight:700;color:#7c3aed">💰 Số Tiền <span style="color:var(--danger)">*</span></label><input type="number" id="cpmAmount" class="form-control" placeholder="Nhập số tiền" style="padding:12px;font-size:15px;font-weight:700"></div>'
        +'<div style="display:grid;grid-template-columns:140px 1fr;align-items:center;gap:8px"><label style="font-size:12px;font-weight:700;color:#7c3aed">📝 Nội Dung <span style="color:var(--danger)">*</span></label><input type="text" id="cpmDesc" class="form-control" placeholder="Nội dung chi tiết" style="padding:10px 12px;font-size:13px"></div>'
        +'<div style="display:grid;grid-template-columns:140px 1fr;align-items:center;gap:8px"><label style="font-size:12px;font-weight:700;color:#7c3aed">📸 Hình Ảnh <span style="color:var(--danger)">*</span></label><div id="cpmPasteZone" style="border:2px dashed #a78bfa;border-radius:8px;min-height:80px;display:flex;align-items:center;justify-content:center;cursor:pointer;position:relative;overflow:hidden;background:#faf5ff" tabindex="0"><span id="cpmPasteHint" style="color:#a78bfa;font-size:12px">📋 Ctrl+V để dán ảnh</span><img id="cpmPastePreview" style="display:none;max-width:100%;max-height:150px;border-radius:6px"></div></div>'
        +'<div style="display:grid;grid-template-columns:140px 1fr;align-items:center;gap:8px"><label style="font-size:12px;font-weight:700;color:#7c3aed">🏷️ Mã</label><input type="text" id="cpmCodePreview" class="form-control" value="'+codePreview+'" readonly style="padding:10px 12px;font-size:13px;background:#f5f3ff;cursor:not-allowed;font-weight:700;color:#7c3aed"></div>'
        +'<div style="display:grid;grid-template-columns:140px 1fr;align-items:center;gap:8px"><label style="font-size:12px;font-weight:700;color:#7c3aed">👤 Người Ghi Nhận</label><input type="text" class="form-control" value="'+userName+'" readonly style="padding:10px 12px;font-size:13px;background:#f1f5f9;cursor:not-allowed"></div>'
        +'<input type="hidden" id="cpmDate" value="'+todayStr+'">'
        +'<input type="hidden" id="cpmType" value="THU">'
        +'<div id="cpmTypeNote" style="padding:6px 10px;background:#ecfdf5;border-radius:6px;font-size:10px;color:#065f46;border:1px solid #bbf7d0">ℹ️ THU: chỉ ghi vào Sổ Cổ Phần May</div>'
        +'</div>';

    openModal('🧵 Tạo Mã Tiền CP May', body, '<button class="btn btn-secondary" onclick="closeModal()">Hủy</button><button class="btn btn-primary" onclick="_cpmSubmitRecord()" style="width:auto;background:linear-gradient(135deg,#7c3aed,#6d28d9)">🧵 Tạo Mã Tiền</button>');

    setTimeout(function(){
        var zone = document.getElementById('cpmPasteZone');
        if (zone) {
            zone.addEventListener('paste', _cpmHandlePaste);
            zone.addEventListener('click', function(){ zone.focus(); });
        }
        document.addEventListener('paste', _cpmHandlePaste);
    }, 200);
}

function _cpmPickType(type) {
    document.getElementById('cpmType').value = type;
    var btnThu = document.getElementById('cpmTypeThu');
    var btnChi = document.getElementById('cpmTypeChi');
    var note = document.getElementById('cpmTypeNote');
    if (type === 'THU') {
        btnThu.style.background = '#059669'; btnThu.style.color = '#fff'; btnThu.style.borderColor = '#059669';
        btnChi.style.background = '#fff'; btnChi.style.color = 'var(--navy)'; btnChi.style.borderColor = 'var(--gray-300)';
        if (note) { note.style.background = '#ecfdf5'; note.style.color = '#065f46'; note.style.borderColor = '#bbf7d0'; note.innerHTML = 'ℹ️ THU: chỉ ghi vào Sổ Cổ Phần May'; }
    } else {
        btnChi.style.background = '#e67e22'; btnChi.style.color = '#fff'; btnChi.style.borderColor = '#e67e22';
        btnThu.style.background = '#fff'; btnThu.style.color = 'var(--navy)'; btnThu.style.borderColor = 'var(--gray-300)';
        if (note) { note.style.background = '#fef3c7'; note.style.color = '#92400e'; note.style.borderColor = '#fde68a'; note.innerHTML = '⚠️ CHI: ghi vào cả Sổ CP May và Sổ Thu Chi'; }
    }
}

function _cpmHandlePaste(e) {
    if (!document.getElementById('cpmPasteZone')) { document.removeEventListener('paste', _cpmHandlePaste); return; }
    var items = (e.clipboardData || e.originalEvent?.clipboardData)?.items;
    if (!items) return;
    for (var i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
            e.preventDefault();
            _cpmPastedFile = items[i].getAsFile();
            var reader = new FileReader();
            reader.onload = function(ev) {
                var preview = document.getElementById('cpmPastePreview');
                var hint = document.getElementById('cpmPasteHint');
                if (preview) { preview.src = ev.target.result; preview.style.display = 'block'; }
                if (hint) hint.style.display = 'none';
            };
            reader.readAsDataURL(_cpmPastedFile);
            return;
        }
    }
}

async function _cpmSubmitRecord() {
    if (_cpmSubmitting) return;
    var desc = document.getElementById('cpmDesc')?.value;
    var amount = document.getElementById('cpmAmount')?.value;
    var cfType = document.getElementById('cpmType')?.value || 'THU';
    if (!desc||!desc.trim()) { showToast('Vui lòng nhập nội dung!','error'); return; }
    if (!amount||Number(amount)<=0) { showToast('Vui lòng nhập số tiền!','error'); return; }
    if (!_cpmPastedFile) { showToast('Vui lòng dán hình ảnh (Ctrl+V)!','error'); return; }

    _cpmSubmitting = true;
    var submitBtn = document.querySelector('[onclick="_cpmSubmitRecord()"]');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.style.opacity = '0.5'; submitBtn.textContent = '⏳ Đang tạo...'; }

    var imgUrl = '', imgPath = '';
    try {
        var fd = new FormData();
        fd.append('file', _cpmPastedFile, 'paste_'+Date.now()+'.png');
        var uploadRes = await fetch('/api/cashflow/upload', { method:'POST', body:fd, credentials:'include' });
        var uploadData = await uploadRes.json();
        if (uploadData.success) { imgUrl = uploadData.url; imgPath = uploadData.path; }
        else { showToast('Lỗi upload ảnh: '+(uploadData.error||''),'error'); _cpmSubmitting=false; if(submitBtn){submitBtn.disabled=false;submitBtn.style.opacity='1';submitBtn.textContent='🧵 Tạo Mã Tiền';} return; }
    } catch(ue) { showToast('Lỗi upload: '+ue.message,'error'); _cpmSubmitting=false; if(submitBtn){submitBtn.disabled=false;submitBtn.style.opacity='1';submitBtn.textContent='🧵 Tạo Mã Tiền';} return; }

    try {
        var data = await apiCall('/api/cashflow/cpmay-records','POST',{
            cashflow_date: document.getElementById('cpmDate')?.value,
            cashflow_type: cfType,
            description: desc.trim(),
            amount: Number(amount),
            image_url: imgUrl,
            image_path: imgPath
        });
        if (data.success) {
            showToast('✅ Đã tạo: '+data.cashflow_code); closeModal();
            document.removeEventListener('paste', _cpmHandlePaste);
            _cpmPastedFile = null;
            var treeData = await apiCall('/api/cashflow/tree?money_source=cophanmay');
            _cpm.tree = treeData.tree||[]; _cpm.totalUnclosed = treeData.total_unclosed||0;
            _cpmRenderSidebar(); await _cpmLoadRecords();
        } else showToast(data.error||'Lỗi','error');
    } catch(e) { showToast('Lỗi: '+e.message,'error'); }
    _cpmSubmitting = false;
}
