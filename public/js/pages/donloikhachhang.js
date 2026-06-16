// ========== ĐƠN LỖI KHÁCH & NỘI BỘ — Bộ Phận Văn Phòng ==========
var _ceo = { items: [], tree: [], total: 0, year: null, month: null, editId: null, filter: null, allUsers: [], commonErrors: [], extViolators: [] };

function renderDonloikhachhangPage(content) {
    _ceo.year = null;
    _ceo.month = null;
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
        var isOpen = !_ceo.year || _ceo.year == yr;
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
        // Load common error templates for dropdown
        try { var ce = await apiCall('/api/common-errors-tpl'); _ceo.commonErrors = ce.items || []; } catch(e) {}
        try { var ev = await apiCall('/api/customer-errors/external-violators'); _ceo.extViolators = ev.items || []; } catch(e) {}
        _ceoRenderTable();
    } catch(e) { console.error('[CEO] Load error:', e); }
}

function _ceoRenderTable() {
    var main = document.getElementById('ceoMain');
    if (!main) return;
    var allItems = _ceo.items;
    // Apply client-side filter
    var items = allItems;
    // SEQUENTIAL: Step 1 → 2 → 3 → 4 (use Number() because DB returns string "0")
    var _phatDone=function(i){return !!i.phat_updated_at;};
    var _nvpDone=function(i){return i.violator_commitment&&i.violator_commitment.trim()!==''&&i.violator_commitment.trim()!=='1. '&&!!i.penalty_month;};
    var _isStep1=function(i){return !i.qlx_updated_at;};
    var _isStep2=function(i){return i.qlx_updated_at&&!_phatDone(i);};
    var _isStep3=function(i){return i.qlx_updated_at&&_phatDone(i)&&!_nvpDone(i);};
    var _isStep4=function(i){return i.qlx_updated_at&&_phatDone(i)&&_nvpDone(i);};
    if (_ceo.filter === 'qlx_chua_xl') items = allItems.filter(_isStep1);
    else if (_ceo.filter === 'chua_phat') items = allItems.filter(_isStep2);
    else if (_ceo.filter === 'chua_nvp') items = allItems.filter(_isStep3);
    else if (_ceo.filter === 'hoan_thanh') items = allItems.filter(_isStep4);
    else items = allItems.filter(function(i){return !_isStep4(i);});
    var title = _ceo.year && _ceo.month ? 'Tháng ' + _ceo.month + '/' + _ceo.year : _ceo.year ? 'Năm ' + _ceo.year : 'Tất Cả';
    var cQLX = allItems.filter(_isStep1).length;
    var cPhat = allItems.filter(_isStep2).length;
    var cNVP = allItems.filter(_isStep3).length;
    var cDone = allItems.filter(_isStep4).length;

    var h = '<div style="padding:12px 16px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e5e7eb;background:#fff">' +
        '<div style="font-size:14px;font-weight:800;color:#1e293b">⚠️ ĐƠN LỖI KHÁCH & NỘI BỘ — ' + title + ' <span style="color:#9ca3af;font-weight:500;font-size:12px">(' + items.length + '/' + allItems.length + ')</span></div>' +
        '<div style="display:flex;gap:8px">' +
        '<button onclick="_ceoSetFilter(null)" style="padding:8px 14px;background:' + (!_ceo.filter ? '#1e293b' : '#f1f5f9') + ';color:' + (!_ceo.filter ? '#fff' : '#64748b') + ';border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer">Tất Cả</button>' +
        (currentUser && currentUser.role==='giam_doc' ? '<button onclick="_ceoOpenExtViolators()" style="padding:8px 14px;background:linear-gradient(135deg,#16a34a,#15803d);color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer">🏭 Bên Gia Công</button>' : '') +
        '<button onclick="_ceoOpenUpdatePicker()" style="padding:8px 16px;background:linear-gradient(135deg,#3b82f6,#1d4ed8);color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer">🔄 Cập Nhật Lỗi</button>' +
        '</div></div>';

    // === 4 STAT CARDS ===
    h += '<div style="padding:12px 16px;display:flex;gap:12px;background:#fff;border-bottom:1px solid #e5e7eb">';
    // Card 0: QLX Chưa Xử Lý Lỗi
    h += '<div onclick="_ceoSetFilter(\'qlx_chua_xl\')" style="flex:1;padding:16px 20px;background:linear-gradient(135deg,#fff7ed,#ffedd5);border:2px solid ' + (_ceo.filter==='qlx_chua_xl'?'#ea580c':'#fed7aa') + ';border-radius:12px;cursor:pointer;display:flex;align-items:center;gap:14px;transition:all .2s;user-select:none" onmouseover="this.style.boxShadow=\'0 4px 16px rgba(234,88,12,0.2)\'" onmouseout="this.style.boxShadow=\'' + (_ceo.filter==='qlx_chua_xl'?'0 4px 16px rgba(234,88,12,0.15)':'none') + '\'">'
    + '<div style="font-size:32px">🏭</div>'
    + '<div><div style="font-size:20px;font-weight:900;color:#ea580c">' + cQLX + '</div>'
    + '<div style="font-size:11px;font-weight:700;color:#9a3412">QLX Chưa Cập Nhật Lỗi</div></div></div>';
    // Card 1: Chưa Cập Nhật Tiền Phạt
    h += '<div onclick="_ceoSetFilter(\'chua_phat\')" style="flex:1;padding:16px 20px;background:linear-gradient(135deg,#fef2f2,#fee2e2);border:2px solid ' + (_ceo.filter==='chua_phat'?'#dc2626':'#fecaca') + ';border-radius:12px;cursor:pointer;display:flex;align-items:center;gap:14px;transition:all .2s;user-select:none" onmouseover="this.style.boxShadow=\'0 4px 16px rgba(220,38,38,0.2)\'" onmouseout="this.style.boxShadow=\'' + (_ceo.filter==='chua_phat'?'0 4px 16px rgba(220,38,38,0.15)':'none') + '\'">';
    h += '<div style="font-size:32px">🔴</div>';
    h += '<div><div style="font-size:20px;font-weight:900;color:#dc2626">' + cPhat + '</div>';
    h += '<div style="font-size:13px;font-weight:700;color:#991b1b">Chưa Cập Nhật Tiền Phạt</div></div></div>';
    // Card 2: Chưa Phạt Tiền Người Vi Phạm
    h += '<div onclick="_ceoSetFilter(\'chua_nvp\')" style="flex:1;padding:16px 20px;background:linear-gradient(135deg,#fef3c7,#fde68a);border:2px solid ' + (_ceo.filter==='chua_nvp'?'#d97706':'#fde68a') + ';border-radius:12px;cursor:pointer;display:flex;align-items:center;gap:14px;transition:all .2s;user-select:none" onmouseover="this.style.boxShadow=\'0 4px 16px rgba(217,119,6,0.2)\'" onmouseout="this.style.boxShadow=\'' + (_ceo.filter==='chua_nvp'?'0 4px 16px rgba(217,119,6,0.15)':'none') + '\'">';
    h += '<div style="font-size:32px">🟡</div>';
    h += '<div><div style="font-size:20px;font-weight:900;color:#d97706">' + cNVP + '</div>';
    h += '<div style="font-size:13px;font-weight:700;color:#92400e">Chưa Phạt Tiền Người Vi Phạm</div></div></div>';
    // Card 3: Hoàn Thành
    h += '<div onclick="_ceoSetFilter(\'hoan_thanh\')" style="flex:1;padding:16px 20px;background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:2px solid ' + (_ceo.filter==='hoan_thanh'?'#16a34a':'#bbf7d0') + ';border-radius:12px;cursor:pointer;display:flex;align-items:center;gap:14px;transition:all .2s;user-select:none" onmouseover="this.style.boxShadow=\'0 4px 16px rgba(22,163,74,0.2)\'" onmouseout="this.style.boxShadow=\'' + (_ceo.filter==='hoan_thanh'?'0 4px 16px rgba(22,163,74,0.15)':'none') + '\'">';
    h += '<div style="font-size:32px">🟢</div>';
    h += '<div><div style="font-size:20px;font-weight:900;color:#16a34a">' + cDone + '</div>';
    h += '<div style="font-size:13px;font-weight:700;color:#166534">Hoàn Thành</div></div></div>';
    h += '</div>';

    h += '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:11px;table-layout:fixed">';
    h += '<thead><tr style="background:#1e3a4f;border-bottom:2px solid #0f2a3a">';
    var cols = ['Ngày','Người Báo Lỗi','Đơn Lỗi','Lỗi Thường Gặp','Mã Đơn','Lĩnh Vực','Tên Khách Hàng','CSKH','SL SX','SL Lỗi','Nội Dung Lỗi','Hình Ảnh','Cách Xử Lý Lỗi QLX',
        'Chi Phí SX','Phí Ship','Xử Lý','Người Vi Phạm','Cam Kết Người Vi Phạm','Đã Phạt'];
    var colW={'Ngày':'40px','Người Báo Lỗi':'95px','Đơn Lỗi':'55px','Lỗi Thường Gặp':'80px','Mã Đơn':'80px','Lĩnh Vực':'65px','Tên Khách Hàng':'85px','CSKH':'65px','SL SX':'38px','SL Lỗi':'38px','Nội Dung Lỗi':'120px','Hình Ảnh':'50px','Cách Xử Lý Lỗi QLX':'120px','Chi Phí SX':'60px','Phí Ship':'60px','Xử Lý':'60px','Người Vi Phạm':'70px','Cam Kết Người Vi Phạm':'130px','Đã Phạt':'60px'};
    cols.forEach(function(c) {
        var extraStyle = '';
        if (c === 'Cách Xử Lý Lỗi QLX') extraStyle = 'background:#ea580c;color:#fef08a;';
        if (c === 'Xử Lý') extraStyle = 'background:#dc2626;color:#fef08a;';
        if (c === 'Đã Phạt') extraStyle = 'background:#fef08a;color:#dc2626;';
        h += '<th style="padding:6px 4px;text-align:left;font-size:10px;font-weight:700;color:#ffffff;white-space:nowrap;border-right:1px solid rgba(255,255,255,0.1);width:'+(colW[c]||'auto')+';' + extraStyle + '">' + c + '</th>';
    });
    h += '</tr></thead><tbody>';

    if (items.length === 0) {
        h += '<tr><td colspan="19" style="padding:40px;text-align:center;color:#9ca3af">Chưa có đơn lỗi nào</td></tr>';
    } else {
        items.forEach(function(item) {
            var imgs = [];
            try { imgs = typeof item.error_images === 'string' ? JSON.parse(item.error_images || '[]') : (item.error_images || []); } catch(e) {}
            var imgHtml = imgs.length ? imgs.slice(0,2).map(function(url) {
                return '<img src="' + url + '" style="width:24px;height:24px;object-fit:cover;border-radius:3px;cursor:pointer;border:1px solid #e5e7eb" onclick="_ceoViewImage(\'' + url + '\')">';
            }).join('') + (imgs.length > 2 ? '<span style="font-size:9px;color:#9ca3af">+' + (imgs.length-2) + '</span>' : '') : '<span style="color:#d1d5db">—</span>';
            var rd = item.report_date ? (function(d){return d.getDate()+'/'+(d.getMonth()+1);})(new Date(item.report_date)) : '—';
            var fmtMoney = function(v) { return Number(v||0) > 0 ? Number(v).toLocaleString('vi-VN') : ''; };

            // Đơn Lỗi type badge
            var errorType = item.error_type || (item.dht_order_id ? 'Khách Hàng' : 'Nội Bộ');
            var etColor = (errorType === 'Nội Bộ') ? '#7c3aed' : '#dc2626';
            var etBg = (errorType === 'Nội Bộ') ? '#f3e8ff' : '#fee2e2';

            // Video column
            var videoHtml = item.error_video ? '<a href="' + item.error_video + '" target="_blank" style="color:#2563eb;font-weight:700;font-size:11px" title="Xem video">🎬 Xem</a>' : '<span style="color:#d1d5db">—</span>';

            // Calculate reporter name
            var reporter = '—';
            if (item.cskh_name && item.cskh_name.startsWith('Người Báo Lỗi: Bộ Phận ')) {
                var raw = item.cskh_name.substring('Người Báo Lỗi: Bộ Phận '.length);
                var idx = raw.lastIndexOf(' - ');
                if (idx !== -1) {
                    var dept = raw.substring(0, idx).trim();
                    var name = raw.substring(idx + 3).trim();
                    reporter = name + ' - BP ' + dept;
                } else {
                    reporter = raw;
                }
            } else if (item.cskh_name && item.cskh_name.startsWith('Người Báo Lỗi: ')) {
                var raw = item.cskh_name.substring('Người Báo Lỗi: '.length);
                var idx = raw.lastIndexOf(' - ');
                reporter = idx !== -1 ? raw.substring(idx + 3) + ' - ' + raw.substring(0, idx) : raw;
            } else {
                reporter = item.created_by_name || '—';
                if (reporter === 'Giám Đốc') {
                    reporter = 'Giám Đốc - BP Kiểm Tra QC';
                } else if (item.created_by_dept_name && (item.created_by_dept_name.includes('Kiểm Tra') || item.created_by_dept_name.includes('QC'))) {
                    reporter = reporter + ' - BP Kiểm Tra QC';
                }
            }
            if (reporter.trim() === 'Giám Đốc') {
                reporter = 'Giám Đốc - BP Kiểm Tra QC';
            }

            var cleanCskh = item.cskh_name && item.cskh_name.startsWith('Người Báo Lỗi: ') ? '—' : (item.cskh_name || '—');

            h += '<tr style="border-bottom:1px solid #f1f5f9;transition:background .15s;cursor:pointer" onmouseover="this.style.background=\'#fffbeb\'" onmouseout="this.style.background=\'\'" onclick="_ceoViewDetail(' + item.id + ')">';
            h += '<td style="padding:4px;white-space:nowrap;border-right:1px solid #f8fafc;font-size:11px">' + rd + '</td>';
            h += '<td style="padding:4px;border-right:1px solid #f8fafc;font-size:10px;font-weight:700;color:#475569;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + reporter.replace(/"/g, '&quot;') + '">' + reporter + '</td>';
            h += '<td style="padding:4px;white-space:nowrap;border-right:1px solid #f8fafc"><span style="padding:1px 5px;border-radius:3px;font-size:9px;font-weight:700;color:' + etColor + ';background:' + etBg + '">' + errorType + '</span></td>';
            h += '<td style="padding:4px;border-right:1px solid #f8fafc;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px">' + (item.common_error_type || '') + '</td>';
            h += '<td style="padding:4px;font-weight:700;color:#ea580c;white-space:nowrap;border-right:1px solid #f8fafc;font-size:10px">' + (item.order_code || '—') + '</td>';
            h += '<td style="padding:4px;border-right:1px solid #f8fafc;font-size:10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + (item.linh_vuc || '').replace(/"/g, '&quot;') + '">' + (item.linh_vuc || '—') + '</td>';
            h += '<td style="padding:4px;border-right:1px solid #f8fafc;font-size:10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + (item.customer_name || '').replace(/"/g, '&quot;') + '">' + (item.customer_name || '—') + '</td>';
            h += '<td style="padding:4px;border-right:1px solid #f8fafc;font-size:10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + cleanCskh.replace(/"/g, '&quot;') + '">' + cleanCskh + '</td>';
            h += '<td style="padding:4px;text-align:center;font-weight:700;border-right:1px solid #f8fafc;font-size:11px">' + (Number(item.production_quantity)||'') + '</td>';
            h += '<td style="padding:4px;text-align:center;font-weight:700;color:#dc2626;border-right:1px solid #f8fafc;font-size:11px">' + (Number(item.error_quantity)||'') + '</td>';
            h += '<td style="padding:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;border-right:1px solid #f8fafc;font-size:11px" title="' + (item.error_content||'').replace(/"/g,'&quot;') + '">' + (item.error_content || '') + '</td>';
            h += '<td style="padding:4px;border-right:1px solid #f8fafc"><div style="display:flex;gap:1px;align-items:center">' + imgHtml + '</div></td>';
            h += '<td style="padding:4px;border-right:1px solid #f8fafc;background:#fff7ed;color:#c2410c;font-weight:700;font-size:10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + (item.sale_resolution || '') + '</td>';
            h += '<td style="padding:4px;text-align:right;border-right:1px solid #f8fafc;font-size:11px">' + fmtMoney(item.production_cost) + '</td>';
            h += '<td style="padding:4px;text-align:right;border-right:1px solid #f8fafc;font-size:11px">' + fmtMoney(item.shipping_cost) + '</td>';
            var _xlDisp='';if(item.qlx_updated_at){var _xd=new Date(item.qlx_updated_at);_xlDisp=_xd.toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit',timeZone:'Asia/Ho_Chi_Minh'})+' '+_xd.toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'Asia/Ho_Chi_Minh'});if(item.qlx_updated_by_name)_xlDisp+='<br><span style="font-size:8px;opacity:0.9">'+item.qlx_updated_by_name+'</span>';}
            h += '<td style="padding:4px;border-right:1px solid #f8fafc;background:'+(item.qlx_updated_at?'#16a34a':'#dc2626')+';color:#fef08a;font-weight:700;font-size:10px;white-space:nowrap">' + _xlDisp + '</td>';
            h += '<td style="padding:4px;border-right:1px solid #f8fafc;font-size:10px">' + (item.violator_name||'').split(',').map(function(n){return n.trim();}).filter(Boolean).join('<br>') + '</td>';
            h += '<td style="padding:4px;border-right:1px solid #f8fafc;font-size:10px;overflow:hidden;text-overflow:ellipsis">' + (item.violator_commitment || '') + '</td>';
            h += '<td style="padding:4px;border-right:1px solid #f8fafc;background:#fef08a;color:#dc2626;font-weight:700;font-size:10px;white-space:nowrap">' + (item.penalty_month || '') + '</td>';
            h += '</tr>';
        });
    }
    h += '</tbody></table></div>';
    main.innerHTML = h;
}

// ===== DETAIL VIEWER — READ-ONLY =====
async function _ceoViewDetail(id) {
    var item=null;
    try{var d=await apiCall('/api/customer-errors/'+id);item=d.item;}catch(e){}
    if(!item){item=_ceo.items.find(function(x){return x.id===id;});}
    if(!item)return;
    var _canEdit=currentUser&&(currentUser.role==='giam_doc'||currentUser.role==='quan_ly_cap_cao');
    var rd=item.report_date?new Date(item.report_date).toLocaleDateString('vi-VN'):'—';
    var fmtMoney=function(v){return Number(v||0)>0?Number(v).toLocaleString('vi-VN')+'đ':'—';};
    var errorType=item.error_type||(item.dht_order_id?'Khách Hàng':'Nội Bộ');
    var etColor=(errorType==='Nội Bộ')?'#7c3aed':'#dc2626';
    var etBg=(errorType==='Nội Bộ')?'#f3e8ff':'#fee2e2';
    var imgs=[];try{imgs=typeof item.error_images==='string'?JSON.parse(item.error_images||'[]'):(item.error_images||[]);}catch(e){}
    var imgHtml=imgs.length?imgs.map(function(url){return '<img src="'+url+'" style="width:100px;height:100px;object-fit:cover;border-radius:8px;cursor:pointer;border:2px solid #e5e7eb" onclick="_ceoViewImage(\''+url+'\')">';}).join(''):'<span style="color:#9ca3af;font-style:italic">Không có hình ảnh</span>';
    var videoHtml=item.error_video?'<video controls style="max-width:100%;max-height:250px;border-radius:8px;border:2px solid #e5e7eb"><source src="'+item.error_video+'"></video>':'<span style="color:#9ca3af;font-style:italic">Không có video</span>';
    var field=function(label,value,color){return '<div style="margin-bottom:10px"><div style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:2px">'+label+'</div><div style="font-size:13px;font-weight:600;color:'+(color||'#1e293b')+'">'+(value||'—')+'</div></div>';};
    var _hasQLX=!!item.qlx_updated_at;
    var _hasPhat=!!item.phat_updated_at;
    var _hasNVP=!!(item.violator_commitment&&item.violator_commitment.trim()!==''&&item.violator_commitment.trim()!=='1. '&&item.penalty_month);
    var _badge=function(done){return done?'<span style="color:#16a34a;font-size:13px">✅</span>':'<span style="color:#d97706;font-size:13px">⏳</span>';};
    var old=document.getElementById('ceoDetailModal');if(old)old.remove();
    var ov=document.createElement('div');ov.id='ceoDetailModal';
    ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:99998;display:flex;align-items:center;justify-content:center;padding:20px';
    ov.onclick=function(e){if(e.target===ov)ov.remove();};
    var h='<div style="background:#fff;border-radius:16px;max-width:800px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 25px 60px rgba(0,0,0,0.3)" onclick="event.stopPropagation()">';
    // HEADER
    h+='<div style="padding:18px 24px;background:linear-gradient(135deg,#1e3a5f,#0f2a3a);border-radius:16px 16px 0 0;display:flex;align-items:center;justify-content:space-between">';
    h+='<div style="display:flex;align-items:center;gap:12px"><span style="font-size:22px">📝</span><div><div style="font-size:15px;font-weight:800;color:#fff">Đơn Lỗi — '+(item.order_code||'N/A')+'</div>';
    h+='<div style="font-size:11px;color:#94a3b8;margin-top:2px">'+rd+' · Người tạo: '+(item.created_by_name||'—')+'</div></div></div>';
    h+='<div style="display:flex;align-items:center;gap:8px"><span style="padding:3px 10px;border-radius:5px;font-size:10px;font-weight:700;color:'+etColor+';background:'+etBg+'">'+errorType+'</span>';
    h+='<button onclick="document.getElementById(\'ceoDetailModal\').remove()" style="background:rgba(255,255,255,0.15);border:none;color:#fff;width:30px;height:30px;border-radius:8px;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center">×</button></div></div>';
    // BODY
    h+='<div style="padding:20px">';
    // Calculate reporter name
    var reporter = '—';
    if (item.cskh_name && item.cskh_name.startsWith('Người Báo Lỗi: Bộ Phận ')) {
        var raw = item.cskh_name.substring('Người Báo Lỗi: Bộ Phận '.length);
        var idx = raw.lastIndexOf(' - ');
        if (idx !== -1) {
            var dept = raw.substring(0, idx).trim();
            var name = raw.substring(idx + 3).trim();
            reporter = name + ' - BP ' + dept;
        } else {
            reporter = raw;
        }
    } else if (item.cskh_name && item.cskh_name.startsWith('Người Báo Lỗi: ')) {
        var raw = item.cskh_name.substring('Người Báo Lỗi: '.length);
        var idx = raw.lastIndexOf(' - ');
        reporter = idx !== -1 ? raw.substring(idx + 3) + ' - ' + raw.substring(0, idx) : raw;
    } else {
        reporter = item.created_by_name || '—';
        if (reporter === 'Giám Đốc') {
            reporter = 'Giám Đốc - BP Kiểm Tra QC';
        } else if (item.created_by_dept_name && (item.created_by_dept_name.includes('Kiểm Tra') || item.created_by_dept_name.includes('QC'))) {
            reporter = reporter + ' - BP Kiểm Tra QC';
        }
    }
    if (reporter.trim() === 'Giám Đốc') {
        reporter = 'Giám Đốc - BP Kiểm Tra QC';
    }
    var cleanCskh = item.cskh_name && item.cskh_name.startsWith('Người Báo Lỗi: ') ? '—' : (item.cskh_name || '—');

    // Info grid
    h+='<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:12px;padding:14px;background:#f8fafc;border-radius:10px;margin-bottom:16px">'+field('Mã Đơn',item.order_code,'#ea580c')+field('Lĩnh Vực',item.linh_vuc,'#7c3aed')+field('Lỗi Thường Gặp',item.common_error_type)+field('Tên Khách Hàng',item.customer_name)+field('Người Báo Lỗi',reporter,'#2563eb')+field('CSKH',cleanCskh)+field('Bộ Phận Gây Lỗi',item.error_department,'#059669')+field('Người Vi Phạm',item.violator_name,'#dc2626')+'</div>';
    // Quantities
    h+='<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:12px;margin-bottom:16px">';
    h+='<div style="background:#f0fdf4;padding:10px;border-radius:8px;text-align:center;border:1px solid #bbf7d0"><div style="font-size:9px;font-weight:700;color:#166534;text-transform:uppercase">SL Sản Xuất</div><div style="font-size:20px;font-weight:800;color:#166534;margin-top:2px">'+(Number(item.production_quantity)||0)+'</div></div>';
    h+='<div style="background:#fef2f2;padding:10px;border-radius:8px;text-align:center;border:1px solid #fecaca"><div style="font-size:9px;font-weight:700;color:#991b1b;text-transform:uppercase">SL Lỗi</div><div style="font-size:20px;font-weight:800;color:#dc2626;margin-top:2px">'+(Number(item.error_quantity)||0)+'</div></div>';
    h+='<div style="background:#eff6ff;padding:10px;border-radius:8px;text-align:center;border:1px solid #bfdbfe"><div style="font-size:9px;font-weight:700;color:#1e40af;text-transform:uppercase">Chi Phí SX</div><div style="font-size:14px;font-weight:800;color:#1e40af;margin-top:2px">'+(item.phat_updated_at?(Number(item.production_cost||0).toLocaleString('vi-VN')+'đ'):'—')+'</div></div>';
    h+='<div style="background:#fefce8;padding:10px;border-radius:8px;text-align:center;border:1px solid #fde68a"><div style="font-size:9px;font-weight:700;color:#92400e;text-transform:uppercase">Phí Ship</div><div style="font-size:14px;font-weight:800;color:#92400e;margin-top:2px">'+(item.phat_updated_at?(Number(item.shipping_cost||0).toLocaleString('vi-VN')+'đ'):'—')+'</div></div></div>';
    // Error content
    // 👤 Chịu Trách Nhiệm (from common error template)
    h+=_ceoRespSection(item);
    h+='<div style="margin-bottom:14px"><div style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;margin-bottom:4px">📌 Nội Dung Lỗi</div><div style="padding:10px;background:#fff7ed;border-radius:8px;border:1px solid #fed7aa;font-size:13px;color:#9a3412;line-height:1.5">'+(item.error_content||'—')+'</div></div>';
    h+='<div style="margin-bottom:14px"><div style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;margin-bottom:4px">✅ Cách Xử Lý Lỗi</div><div style="padding:10px;background:#f0fdf4;border-radius:8px;border:1px solid #bbf7d0;font-size:13px;color:#166534;line-height:1.5;white-space:pre-line">'+(item.sale_resolution||'—')+'</div></div>';
    // Images + Video
    h+='<div style="margin-bottom:14px"><div style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;margin-bottom:4px">📷 Hình Ảnh Lỗi</div><div style="display:flex;gap:6px;flex-wrap:wrap">'+imgHtml+'</div></div>';
    h+='<div style="margin-bottom:16px"><div style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;margin-bottom:4px">🎬 Video Lỗi</div>'+videoHtml+'</div>';
    // ★ Repair order placeholder
    h+='<div id="ceoRepairDetail"><div style="padding:10px;text-align:center;color:#c4b5fd;font-size:11px">⏳ Đang tải đơn sửa...</div></div>';
    // === 3 NAV BUTTONS (only for authorized users) ===
    if(_canEdit){
      h+='<div style="display:flex;gap:8px;margin-bottom:16px">';
      h+='<button onclick="_ceoOpenQLX('+item.id+')" style="flex:1;padding:10px;border:2px solid #ea580c;border-radius:10px;cursor:pointer;background:linear-gradient(135deg,#fff7ed,#ffedd5);font-size:12px;font-weight:800;color:#c2410c;transition:all .2s" onmouseover="this.style.boxShadow=\'0 4px 12px rgba(234,88,12,0.3)\'" onmouseout="this.style.boxShadow=\'none\'">🏭 CẬP NHẬT QLX '+_badge(_hasQLX)+'</button>';
      h+='<button onclick="_ceoOpenPhat('+item.id+')" style="flex:1;padding:10px;border:2px solid #dc2626;border-radius:10px;cursor:pointer;background:linear-gradient(135deg,#fef2f2,#fee2e2);font-size:12px;font-weight:800;color:#dc2626;transition:all .2s" onmouseover="this.style.boxShadow=\'0 4px 12px rgba(220,38,38,0.3)\'" onmouseout="this.style.boxShadow=\'none\'">💰 CẬP NHẬT PHẠT '+_badge(_hasPhat)+'</button>';
      h+='<button onclick="_ceoOpenNVP('+item.id+')" style="flex:1;padding:10px;border:2px solid #7c3aed;border-radius:10px;cursor:pointer;background:linear-gradient(135deg,#f5f3ff,#ede9fe);font-size:12px;font-weight:800;color:#7c3aed;transition:all .2s" onmouseover="this.style.boxShadow=\'0 4px 12px rgba(124,58,237,0.3)\'" onmouseout="this.style.boxShadow=\'none\'">👤 CẬP NHẬT NVP '+_badge(_hasNVP)+'</button>';
      h+='</div>';
    }
    // === SECTION QLX — READ-ONLY ===
    h+='<div style="margin-bottom:14px;border:1.5px solid '+(item.qlx_updated_at?'#16a34a':'#d1d5db')+';border-radius:10px;overflow:hidden">';
    h+='<div style="padding:10px 14px;background:'+(item.qlx_updated_at?'linear-gradient(135deg,#16a34a,#15803d)':'#f1f5f9')+';display:flex;justify-content:space-between;align-items:center"><div style="font-size:12px;font-weight:800;color:'+(item.qlx_updated_at?'#fff':'#6b7280')+'">🏭 QLX</div>'+_badge(_hasQLX)+'</div>';
    if(_hasQLX){
      h+='<div style="padding:12px 14px;font-size:12px">';
      h+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">';
      h+=field('Lỗi Thường Gặp',item.common_error_type);
      h+=field('Xử Lý Lúc',item.qlx_updated_at?new Date(item.qlx_updated_at).toLocaleString('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'Asia/Ho_Chi_Minh'})+(item.qlx_updated_by_name?' — '+item.qlx_updated_by_name:''):'—');
      h+='</div>';
      h+='<div style="margin-bottom:8px"><div style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;margin-bottom:2px">Cách Xử Lý QLX</div><div style="padding:8px;background:#fff7ed;border-radius:6px;border:1px solid #fed7aa;font-size:12px;color:#c2410c;white-space:pre-line">'+(item.sale_resolution||'—')+'</div></div>';
      var vpList=(item.violator_name||'').split(',').map(function(n){return n.trim();}).filter(Boolean);
      if(vpList.length){h+='<div><div style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;margin-bottom:2px">Người Vi Phạm</div><div style="display:flex;flex-wrap:wrap;gap:4px">';vpList.forEach(function(n){h+='<span style="padding:3px 8px;background:#ffedd5;border:1px solid #fb923c;border-radius:12px;font-size:11px;font-weight:600;color:#c2410c">'+n+'</span>';});h+='</div></div>';}
      h+='</div>';
    } else {h+='<div style="padding:14px;text-align:center;color:#9ca3af;font-size:12px;font-style:italic">⏳ Chưa cập nhật QLX</div>';}
    h+='</div>';
    // === SECTION PHẠT — READ-ONLY ===
    h+='<div style="margin-bottom:14px;border:1.5px solid '+(_hasPhat?'#dc2626':'#d1d5db')+';border-radius:10px;overflow:hidden">';
    h+='<div style="padding:10px 14px;background:'+(_hasPhat?'linear-gradient(135deg,#dc2626,#991b1b)':'#f1f5f9')+';display:flex;justify-content:space-between;align-items:center"><div style="font-size:12px;font-weight:800;color:'+(_hasPhat?'#fff':'#6b7280')+'">💰 Phạt</div>'+_badge(_hasPhat)+'</div>';
    if(_hasPhat){
      h+='<div style="padding:12px 14px;font-size:12px">';
      var sxItems=[{l:'Cắt',k:'cost_cut'},{l:'In',k:'cost_print'},{l:'Ép',k:'cost_press'},{l:'May',k:'cost_sew'},{l:'Cổ Dệt',k:'cost_collar'},{l:'Vật Liệu Khác',k:'cost_material_other'},{l:'Chi Phí Khác',k:'cost_other'},{l:'Bù Giảm Giá KH',k:'cost_discount'}];
      h+='<div style="margin-bottom:8px"><div style="font-size:10px;font-weight:700;color:#c2410c;margin-bottom:4px">Chi Phí SX</div><div style="display:flex;flex-wrap:wrap;gap:6px">';
      sxItems.forEach(function(f){var v=Number(item[f.k])||0;if(v){h+='<span style="padding:2px 8px;background:#fff7ed;border:1px solid #fdba74;border-radius:6px;font-size:11px"><b>'+f.l+':</b> '+v.toLocaleString('vi-VN')+'đ</span>';}});
      h+='</div><div style="margin-top:4px;padding:6px 10px;background:#ea580c;border-radius:6px;display:inline-flex;gap:6px;align-items:center"><span style="color:#fff;font-size:11px;font-weight:700">Tổng SX:</span><span style="color:#fff;font-size:13px;font-weight:900">'+(Number(item.production_cost||0)>0?Number(item.production_cost).toLocaleString('vi-VN')+'đ':'0đ')+'</span></div></div>';
      var shipItems=[{l:'Về Sửa',k:'ship_return'},{l:'Trả Hàng',k:'ship_delivery'},{l:'Khác',k:'ship_other'}];
      h+='<div><div style="font-size:10px;font-weight:700;color:#1d4ed8;margin-bottom:4px">Phí Ship</div><div style="display:flex;flex-wrap:wrap;gap:6px">';
      shipItems.forEach(function(f){var v=Number(item[f.k])||0;if(v){h+='<span style="padding:2px 8px;background:#eff6ff;border:1px solid #93c5fd;border-radius:6px;font-size:11px"><b>'+f.l+':</b> '+v.toLocaleString('vi-VN')+'đ</span>';}});
      h+='</div><div style="margin-top:4px;padding:6px 10px;background:#1d4ed8;border-radius:6px;display:inline-flex;gap:6px;align-items:center"><span style="color:#fff;font-size:11px;font-weight:700">Tổng Ship:</span><span style="color:#fff;font-size:13px;font-weight:900">'+(Number(item.shipping_cost||0)>0?Number(item.shipping_cost).toLocaleString('vi-VN')+'đ':'0đ')+'</span></div></div>';
      h+='</div>';
    } else {h+='<div style="padding:14px;text-align:center;color:#9ca3af;font-size:12px;font-style:italic">⏳ Chưa cập nhật Phạt</div>';}
    h+='</div>';
    // === SECTION NVP — READ-ONLY ===
    h+='<div style="margin-bottom:14px;border:1.5px solid '+(_hasNVP?'#7c3aed':'#d1d5db')+';border-radius:10px;overflow:hidden">';
    h+='<div style="padding:10px 14px;background:'+(_hasNVP?'linear-gradient(135deg,#7c3aed,#5b21b6)':'#f1f5f9')+';display:flex;justify-content:space-between;align-items:center"><div style="font-size:12px;font-weight:800;color:'+(_hasNVP?'#fff':'#6b7280')+'">👤 Người Vi Phạm</div>'+_badge(_hasNVP)+'</div>';
    if(_hasNVP){
      h+='<div style="padding:12px 14px;font-size:12px">';
      // Violation history
      var vName=item.violator_name||'';var vType=item.common_error_type||'';
      if(vName&&vType){
        var repeats=_ceo.items.filter(function(o){return o.id!==item.id&&o.violator_name===vName&&o.common_error_type===vType;});
        if(repeats.length>0){h+='<div style="margin-bottom:8px;padding:8px 10px;background:#fef2f2;border:1px solid #fecaca;border-radius:6px;font-size:11px;font-weight:700;color:#dc2626">⚠️ Đã vi phạm "'+vType+'" tổng cộng <b>'+(repeats.length+1)+'</b> lần!</div>';}
        else{h+='<div style="margin-bottom:8px;padding:8px 10px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;font-size:11px;font-weight:700;color:#16a34a">✅ Lần đầu vi phạm "'+vType+'"</div>';}
      }
      // Per-person commitment
      var _nvpNames=vName.split(',').map(function(n){return n.trim();}).filter(Boolean);
      var _nvpCommitMap={};var _nvpPenaltyMap={};
      if(item.violator_commitment){var _cLines=item.violator_commitment.split('\n');var _curName='';_cLines.forEach(function(line){var m=line.match(/^\[(.+?)\]:\s*(.*)/);if(m){_curName=m[1];_nvpCommitMap[_curName]=(m[2]||'');}else if(_curName){_nvpCommitMap[_curName]+=(_nvpCommitMap[_curName]?'\n':'')+line;}else if(_nvpNames.length<=1){_nvpCommitMap[_nvpNames[0]||'_default']=((_nvpCommitMap[_nvpNames[0]||'_default']||'')+'\n'+line).trim();}});}
      if(item.penalty_per_person){try{_nvpPenaltyMap=typeof item.penalty_per_person==='string'?JSON.parse(item.penalty_per_person):item.penalty_per_person;}catch(e){}}
      _nvpNames.forEach(function(name){
        var commit=_nvpCommitMap[name]||'';var penalty=Number(_nvpPenaltyMap[name])||0;
        h+='<div style="margin-bottom:6px;padding:8px 10px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px">';
        h+='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px"><span style="font-weight:700;color:#7c3aed;font-size:11px">📌 '+name+'</span>';
        h+='<span style="font-size:11px;font-weight:700;color:#dc2626">💰 '+( penalty?penalty.toLocaleString('vi-VN')+'đ':'0đ')+'</span></div>';
        if(commit&&commit!=='1. '){h+='<div style="font-size:11px;color:#334155;white-space:pre-line;line-height:1.4">'+commit+'</div>';}
        h+='</div>';
      });
      // Totals
      var _totalCostShip=(Number(item.production_cost)||0)+(Number(item.shipping_cost)||0);
      h+='<div style="margin-top:8px;display:grid;grid-template-columns:1fr 1fr;gap:8px">';
      h+='<div style="padding:8px 10px;background:#eff6ff;border:1px solid #93c5fd;border-radius:6px"><div style="font-size:9px;font-weight:700;color:#1d4ed8;text-transform:uppercase">Tổng Chi Phí SX + Ship</div><div style="font-size:14px;font-weight:800;color:#1d4ed8">'+(_totalCostShip?_totalCostShip.toLocaleString('vi-VN')+'đ':'0đ')+'</div></div>';
      h+='<div style="padding:8px 10px;background:#fef2f2;border:2px solid #fca5a5;border-radius:6px"><div style="font-size:9px;font-weight:700;color:#dc2626;text-transform:uppercase">Tổng Tiền Phạt NVP</div><div style="font-size:14px;font-weight:800;color:#dc2626">'+(Number(item.penalty_total)?Number(item.penalty_total).toLocaleString('vi-VN')+'đ':'0đ')+'</div></div>';
      h+='</div>';
      if(item.penalty_month){h+='<div style="margin-top:6px;padding:6px 10px;background:#fefce8;border:1px solid #fde68a;border-radius:6px;font-size:11px;font-weight:700;color:#92400e">📅 Đã Phạt: '+item.penalty_month+'</div>';}
      h+='</div>';
    } else {h+='<div style="padding:14px;text-align:center;color:#9ca3af;font-size:12px;font-style:italic">⏳ Chưa cập nhật NVP</div>';}
    h+='</div>';
    h+='</div></div>';
    ov.innerHTML=h;document.body.appendChild(ov);
    // ★ Load repair orders async
    if(item.order_code) _ceoLoadRepairOrders(item.order_code, 'ceoRepairDetail');
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
        _ceoField('Chi Phí SX', 'ceoF_prodcost', item.production_cost, 'number', false) +
        '</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">' +
        _ceoField('Phí Ship', 'ceoF_shipcost', item.shipping_cost, 'number', false) +
        _ceoField('Đã Phạt', 'ceoF_pmonth', item.penalty_month, 'text', false) +
        '</div>' +
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

// ===== FILTER =====
function _ceoSetFilter(f){_ceo.filter=(_ceo.filter===f)?null:f;_ceoRenderTable();}

// ===== UPDATE PICKER — chọn đơn chưa đầy đủ =====
function _ceoOpenUpdatePicker(){
  var incomplete=_ceo.items.filter(function(i){
    var _done=i.qlx_updated_at && !!i.phat_updated_at && i.violator_commitment && i.violator_commitment.trim()!=='' && i.violator_commitment.trim()!=='1. ' && !!i.penalty_month;
    return !_done;
  });
  var ov=document.createElement('div');ov.id='ceoPickerOv';
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:9998;display:flex;align-items:center;justify-content:center;padding:20px';
  ov.onclick=function(e){if(e.target===ov)ov.remove();};
  var h='<div style="background:#fff;border-radius:16px;width:700px;max-width:95vw;max-height:85vh;overflow-y:auto;box-shadow:0 25px 60px rgba(0,0,0,0.3)" onclick="event.stopPropagation()">';
  h+='<div style="padding:16px 20px;background:linear-gradient(135deg,#3b82f6,#1d4ed8);border-radius:16px 16px 0 0;display:flex;justify-content:space-between;align-items:center">';
  h+='<div style="color:#fff;font-size:15px;font-weight:800">🔄 Chọn Đơn Cần Cập Nhật</div>';
  h+='<span onclick="document.getElementById(\'ceoPickerOv\').remove()" style="color:#fff;font-size:20px;cursor:pointer;opacity:0.8">✕</span></div>';
  h+='<div style="padding:16px">';
  if(!incomplete.length){
    h+='<div style="padding:30px;text-align:center;color:#16a34a;font-weight:700">✅ Tất cả đơn đã cập nhật đầy đủ!</div>';
  }else{
    h+='<div style="font-size:12px;color:#6b7280;margin-bottom:10px">Có <b style="color:#dc2626">'+incomplete.length+'</b> đơn chưa đầy đủ thông tin:</div>';
    h+='<div style="display:flex;flex-direction:column;gap:6px">';
    incomplete.forEach(function(item){
      var rd=item.report_date?new Date(item.report_date).toLocaleDateString('vi-VN'):'';
      var missing='';
      if(!item.qlx_updated_at)missing='QLX Chưa Cập Nhật Lỗi';
      else if(!item.phat_updated_at)missing='Chưa Cập Nhật Tiền Phạt';
      else missing='Chưa Phạt Tiền Người Vi Phạm';
      h+='<div onclick="document.getElementById(\'ceoPickerOv\').remove();_ceoViewDetail('+item.id+')" style="padding:10px 14px;border:1px solid #e5e7eb;border-radius:8px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;transition:all .15s" onmouseover="this.style.background=\'#eff6ff\';this.style.borderColor=\'#3b82f6\'" onmouseout="this.style.background=\'\';this.style.borderColor=\'#e5e7eb\'">';
      h+='<div><span style="font-weight:700;color:#ea580c">'+(item.order_code||'#'+item.id)+'</span> <span style="color:#9ca3af;font-size:11px">'+rd+'</span>';
      h+='<div style="font-size:10px;color:#dc2626;margin-top:2px">Thiếu: '+missing+'</div></div>';
      h+='<span style="font-size:16px">→</span></div>';
    });
    h+='</div>';
  }
  h+='</div></div>';
  ov.innerHTML=h;document.body.appendChild(ov);
}


// ===== MODAL 1: QLX =====
async function _ceoOpenQLX(id){
  var item;try{var d=await apiCall('/api/customer-errors/'+id);item=d.item;}catch(e){}
  if(!item){item=_ceo.items.find(function(x){return x.id===id;});}
  if(!item)return;
  if(!_ceo.allUsers.length){try{var ud=await apiCall('/api/users');_ceo.allUsers=ud.users||ud||[];}catch(e){}}
  var old=document.getElementById('ceoUpdateOv');if(old)old.remove();
  var ov=document.createElement('div');ov.id='ceoUpdateOv';
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px';
  var h='<div style="background:#fff;border-radius:16px;width:650px;max-width:95vw;max-height:90vh;overflow-y:auto;box-shadow:0 25px 60px rgba(0,0,0,0.3)" onclick="event.stopPropagation()">';
  h+='<div style="padding:16px 20px;background:linear-gradient(135deg,#ea580c,#c2410c);border-radius:16px 16px 0 0;display:flex;justify-content:space-between;align-items:center">';
  h+='<div><div style="color:#fff;font-size:15px;font-weight:800">\u{1F3ED} Cập Nhật QLX — '+(item.order_code||'#'+item.id)+'</div>';
  h+='<div style="color:#fed7aa;font-size:11px;margin-top:2px">Nội dung: '+(item.error_content||'').substring(0,60)+'</div></div>';
  h+='<span onclick="document.getElementById(\'ceoUpdateOv\').remove()" style="color:#fff;font-size:20px;cursor:pointer;opacity:0.8">\u2715</span></div>';
  h+='<div style="padding:20px">';
  // 👤 Chịu Trách Nhiệm (read-only from template)
  h+='<div id="ceoU_respContainer">'+_ceoRespSection(item)+'</div>';
  h+='<div style="margin-bottom:14px"><label style="display:block;font-size:12px;font-weight:700;color:#334155;margin-bottom:4px">Lỗi Thường Gặp <span style="color:#dc2626">*</span></label>';
  h+='<select id="ceoU_errtype" onchange="_ceoOnCommonErrorChange(this)" data-prev-val="'+(item.common_error_type||'')+'" style="width:100%;padding:8px 12px;border:1.5px solid #d1d5db;border-radius:8px;font-size:13px;background:#f8fafc">';
  h+='<option value="">-- Chọn loại lỗi --</option>';
  _ceo.commonErrors.forEach(function(ce){h+='<option value="'+ce.error_name+'"'+(item.common_error_type===ce.error_name?' selected':'')+'>'+ce.error_name+'</option>';});
  h+='</select></div>';
  h+='<div id="ceoU_guideContainer">'+_ceoBuildGuideSection(item.common_error_type)+'</div>';
  h+='<div style="margin-bottom:14px"><label style="display:block;font-size:12px;font-weight:800;color:#c2410c;margin-bottom:4px">Cách Xử Lý Lỗi QLX <span style="color:#dc2626">*</span> <span style="color:#9ca3af;font-size:10px;font-weight:500">(Enter = thêm dòng mới có số)</span></label>';
  h+='<textarea id="ceoU_saleRes" rows="4" onkeydown="_ceoAutoNumber(event,this)" style="width:100%;padding:8px 12px;border:2px solid #ea580c;border-radius:8px;font-size:13px;resize:vertical;line-height:1.6;background:#fff7ed">'+(item.sale_resolution||'1. ')+'</textarea></div>';
  h+='<div style="margin-bottom:14px"><label style="display:block;font-size:12px;font-weight:700;color:#334155;margin-bottom:4px">Người Vi Phạm <span style="color:#dc2626">*</span> <span style="color:#9ca3af;font-size:10px;font-weight:400">(chọn nhiều người vi phạm)</span></label>';
  h+='<div id="ceoU_violatorChips" style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px"></div>';
  h+='<div style="position:relative"><input type="text" id="ceoU_violator_search" value="" placeholder="Tìm hoặc thêm mới..." onfocus="_ceoShowAllUsers()" oninput="_ceoFilterUsers()" style="width:100%;padding:8px 12px;border:1.5px solid #d1d5db;border-radius:8px;font-size:13px;background:#fff" autocomplete="off">';
  h+='<span onclick="_ceoShowAllUsers()" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);cursor:pointer;color:#9ca3af;font-size:14px">\u25bc</span></div>';
  h+='<div id="ceoU_userDropdown" style="display:none;max-height:200px;overflow-y:auto;border:1px solid #d1d5db;border-radius:8px;margin-top:4px;background:#fff;box-shadow:0 4px 12px rgba(0,0,0,0.1)"></div></div>';
  h+='<div style="display:flex;gap:8px"><button onclick="_ceoSubmitQLX('+item.id+')" style="padding:10px 28px;background:linear-gradient(135deg,#ea580c,#c2410c);color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer">\u{1F4BE} Lưu QLX</button>';
  h+='<button onclick="document.getElementById(\'ceoUpdateOv\').remove()" style="padding:10px 20px;background:#f1f5f9;color:#64748b;border:none;border-radius:10px;font-size:13px;cursor:pointer">Hủy</button></div>';
  h+='</div></div>';
  ov.innerHTML=h;document.body.appendChild(ov);
  _ceo._selectedViolators=[];
  if(item.violator_name){item.violator_name.split(',').forEach(function(n){var t=n.trim();if(t)_ceo._selectedViolators.push(t);});}
  _ceoRenderViolatorChips();
}

function _ceoOnCommonErrorChange(el) {
  el.setAttribute('data-prev-val', el.value);
  var respContainer = document.getElementById('ceoU_respContainer');
  if (respContainer) {
    respContainer.innerHTML = _ceoRespSection({common_error_type: el.value});
  }
  var guideContainer = document.getElementById('ceoU_guideContainer');
  if (guideContainer) {
    guideContainer.innerHTML = _ceoBuildGuideSection(el.value);
  }
}

// ===== MODAL 2: PHẠT =====
async function _ceoOpenPhat(id){
  var item;try{var d=await apiCall('/api/customer-errors/'+id);item=d.item;}catch(e){}
  if(!item){item=_ceo.items.find(function(x){return x.id===id;});}
  if(!item)return;
  var old=document.getElementById('ceoUpdateOv');if(old)old.remove();
  var ov=document.createElement('div');ov.id='ceoUpdateOv';
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px';
  var h='<div style="background:#fff;border-radius:16px;width:650px;max-width:95vw;max-height:90vh;overflow-y:auto;box-shadow:0 25px 60px rgba(0,0,0,0.3)" onclick="event.stopPropagation()">';
  h+='<div style="padding:16px 20px;background:linear-gradient(135deg,#dc2626,#991b1b);border-radius:16px 16px 0 0;display:flex;justify-content:space-between;align-items:center">';
  h+='<div><div style="color:#fff;font-size:15px;font-weight:800">💰 Cập Nhật Phạt — '+(item.order_code||'#'+item.id)+'</div>';
  h+='<div style="color:#fecaca;font-size:11px;margin-top:2px">Nội dung: '+(item.error_content||'').substring(0,60)+'</div></div>';
  h+='<span onclick="document.getElementById(\'ceoUpdateOv\').remove()" style="color:#fff;font-size:20px;cursor:pointer;opacity:0.8">✕</span></div>';
  h+='<div style="padding:20px">';
  // 👤 Chịu Trách Nhiệm (read-only from template)
  h+=_ceoRespSection(item);
  // ★ Repair order placeholder for Phat modal
  h+='<div id="ceoRepairPhat"><div style="padding:8px;text-align:center;color:#c4b5fd;font-size:11px">⏳ Đang tải đơn sửa...</div></div>';
  var sxFields=[{id:'ceoU_cut',label:'Cắt',key:'cost_cut'},{id:'ceoU_print',label:'In',key:'cost_print'},{id:'ceoU_press',label:'Ép',key:'cost_press'},{id:'ceoU_sew',label:'May',key:'cost_sew'},{id:'ceoU_collar',label:'Cổ Dệt',key:'cost_collar'},{id:'ceoU_matother',label:'Vật Liệu Khác',key:'cost_material_other'},{id:'ceoU_costother',label:'Chi Phí Khác',key:'cost_other'},{id:'ceoU_discount',label:'Bù Tiền Giảm Giá KH',key:'cost_discount'}];
  h+='<div style="margin-bottom:16px;padding:14px;background:#fff7ed;border:1.5px solid #fed7aa;border-radius:10px"><div style="font-size:12px;font-weight:800;color:#c2410c;margin-bottom:10px">Chi Phí SX</div><div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px">';
  sxFields.forEach(function(f){h+='<div><div style="font-size:10px;color:#9a3412;font-weight:600;margin-bottom:2px">'+f.label+'</div><div style="position:relative"><input type="text" id="'+f.id+'" value="'+(Number(item[f.key])?Number(item[f.key]).toLocaleString('vi-VN'):'')+'" placeholder="0" oninput="_ceoFmtMoney(this);_ceoPhatCalcSX()" style="width:100%;padding:6px 24px 6px 8px;border:1px solid #fdba74;border-radius:6px;font-size:12px"><span style="position:absolute;right:6px;top:50%;transform:translateY(-50%);color:#9ca3af;font-size:10px">đ</span></div></div>';});
  h+='</div><div style="margin-top:10px;padding:8px 12px;background:#ea580c;border-radius:8px;display:flex;justify-content:space-between;align-items:center"><span style="color:#fff;font-size:12px;font-weight:700">Tổng Chi Phí SX</span><span id="ceoU_prodcost_display" style="color:#fff;font-size:14px;font-weight:900">0đ</span></div></div>';
  var shipFields=[{id:'ceoU_shipreturn',label:'Tiền Ship Về Sửa',key:'ship_return'},{id:'ceoU_shipdelivery',label:'Tiền Ship Trả Hàng',key:'ship_delivery'},{id:'ceoU_shipother',label:'Tiền Ship Khác',key:'ship_other'}];
  h+='<div style="margin-bottom:16px;padding:14px;background:#eff6ff;border:1.5px solid #bfdbfe;border-radius:10px"><div style="font-size:12px;font-weight:800;color:#1d4ed8;margin-bottom:10px">Phí Ship</div><div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">';
  shipFields.forEach(function(f){h+='<div><div style="font-size:10px;color:#1e40af;font-weight:600;margin-bottom:2px">'+f.label+'</div><div style="position:relative"><input type="text" id="'+f.id+'" value="'+(Number(item[f.key])?Number(item[f.key]).toLocaleString('vi-VN'):'')+'" placeholder="0" oninput="_ceoFmtMoney(this);_ceoPhatCalcShip()" style="width:100%;padding:6px 24px 6px 8px;border:1px solid #93c5fd;border-radius:6px;font-size:12px"><span style="position:absolute;right:6px;top:50%;transform:translateY(-50%);color:#9ca3af;font-size:10px">đ</span></div></div>';});
  h+='</div><div style="margin-top:10px;padding:8px 12px;background:#1d4ed8;border-radius:8px;display:flex;justify-content:space-between;align-items:center"><span style="color:#fff;font-size:12px;font-weight:700">Tổng Phí Ship</span><span id="ceoU_shipcost_display" style="color:#fff;font-size:14px;font-weight:900">0đ</span></div></div>';
  h+='<div style="display:flex;gap:8px"><button onclick="_ceoSubmitPhat('+item.id+')" style="padding:10px 28px;background:linear-gradient(135deg,#dc2626,#991b1b);color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer">💾 Lưu Phạt</button>';
  h+='<button onclick="document.getElementById(\'ceoUpdateOv\').remove()" style="padding:10px 20px;background:#f1f5f9;color:#64748b;border:none;border-radius:10px;font-size:13px;cursor:pointer">Hủy</button></div>';
  h+='</div></div>';
  ov.innerHTML=h;document.body.appendChild(ov);
  setTimeout(function(){_ceoPhatCalcSX();_ceoPhatCalcShip();},50);
  // ★ Load repair orders async
  if(item.order_code) _ceoLoadRepairOrders(item.order_code, 'ceoRepairPhat');
}

// ===== MODAL 3: NVP =====
async function _ceoOpenNVP(id){
  var item;try{var d=await apiCall('/api/customer-errors/'+id);item=d.item;}catch(e){}
  if(!item){item=_ceo.items.find(function(x){return x.id===id;});}
  if(!item)return;
  var old=document.getElementById('ceoUpdateOv');if(old)old.remove();
  var ov=document.createElement('div');ov.id='ceoUpdateOv';
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px';
  var h='<div style="background:#fff;border-radius:16px;width:680px;max-width:95vw;max-height:90vh;overflow-y:auto;box-shadow:0 25px 60px rgba(0,0,0,0.3)" onclick="event.stopPropagation()">';
  h+='<div style="padding:16px 20px;background:linear-gradient(135deg,#7c3aed,#5b21b6);border-radius:16px 16px 0 0;display:flex;justify-content:space-between;align-items:center">';
  h+='<div><div style="color:#fff;font-size:15px;font-weight:800">👤 Cập Nhật Người Vi Phạm — '+(item.order_code||'#'+item.id)+'</div>';
  h+='<div style="color:#c4b5fd;font-size:11px;margin-top:2px">Nội dung: '+(item.error_content||'').substring(0,60)+'</div></div>';
  h+='<span onclick="document.getElementById(\'ceoUpdateOv\').remove()" style="color:#fff;font-size:20px;cursor:pointer;opacity:0.8">✕</span></div>';
  h+='<div style="padding:20px">';
  // 👤 Chịu Trách Nhiệm (read-only from template)
  h+=_ceoRespSection(item);
  // ★ Repair order placeholder for NVP modal
  h+='<div id="ceoRepairNVP"><div style="padding:8px;text-align:center;color:#c4b5fd;font-size:11px">⏳ Đang tải đơn sửa...</div></div>';
  // Info section
  h+='<div style="margin-bottom:16px;padding:14px;background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:10px">';
  h+='<div style="font-size:11px;font-weight:800;color:#64748b;text-transform:uppercase;margin-bottom:10px">Thông tin đơn lỗi</div>';
  h+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px"><div><div style="font-size:10px;color:#9ca3af;font-weight:600">Người Vi Phạm</div><div style="font-size:13px;font-weight:700;color:#1e293b">'+(item.violator_name?(item.violator_name.split(',').map(function(n){return n.trim();}).filter(Boolean).join('<br>')):'<span style="color:#dc2626">Chưa chọn</span>')+'</div></div>';
  h+='<div><div style="font-size:10px;color:#9ca3af;font-weight:600">Mã Đơn</div><div style="font-size:13px;font-weight:700;color:#ea580c">'+(item.order_code||'--')+'</div></div></div>';
  h+='<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px"><div><div style="font-size:10px;color:#9ca3af;font-weight:600">Lỗi Thường Gặp</div><div style="font-size:13px;font-weight:700;color:#334155">'+(item.common_error_type||'--')+'</div></div>';
  h+='<div><div style="font-size:10px;color:#9ca3af;font-weight:600">SL Sản Phẩm</div><div style="font-size:13px;font-weight:700;color:#166534">'+(item.production_quantity||'--')+'</div></div>';
  h+='<div><div style="font-size:10px;color:#9ca3af;font-weight:600">SL Lỗi</div><div style="font-size:13px;font-weight:700;color:#dc2626">'+(item.error_quantity||'--')+'</div></div></div></div>';
  // Violation history
  var vName=item.violator_name||'';var vType=item.common_error_type||'';
  if(vName&&vType){
    var _vNamesHist=vName.split(',').map(function(n){return n.trim();}).filter(Boolean);
    var repeats=_ceo.items.filter(function(o){return o.id!==item.id&&o.violator_name===vName&&o.common_error_type===vType;});
    if(repeats.length>0){
      h+='<div style="margin-bottom:14px;padding:12px 14px;background:linear-gradient(135deg,#fef2f2,#fee2e2);border:2px solid #fecaca;border-radius:10px"><div style="font-size:13px;font-weight:800;color:#dc2626;margin-bottom:4px">⚠️ đã vi phạm lỗi "'+vType+'" tổng cộng <span style="font-size:16px;background:#dc2626;color:#fff;padding:1px 8px;border-radius:6px">'+(repeats.length+1)+'</span> lần!</div></div>';
    } else {
      h+='<div style="margin-bottom:14px;padding:10px 14px;background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:8px"><div style="font-size:12px;font-weight:700;color:#16a34a">✅ Lần đầu vi phạm lỗi "'+vType+'"</div>';
      _vNamesHist.forEach(function(pn){h+='<div style="font-size:12px;color:#16a34a;font-weight:600;padding:2px 0">• '+pn+'</div>';});
      h+='</div>';
    }
  }
  // Tổng Tiền Chi Phí SX và Ship Lại
  var _totalCostShip=(Number(item.production_cost)||0)+(Number(item.shipping_cost)||0);
  h+='<div style="margin-bottom:14px"><label style="display:block;font-size:12px;font-weight:700;color:#1d4ed8;margin-bottom:4px">Tổng Tiền Chi Phí SX và Ship Lại</label><div style="position:relative"><input type="text" value="'+(_totalCostShip?_totalCostShip.toLocaleString('de-DE'):'')+'" placeholder="0" style="width:100%;padding:8px 30px 8px 12px;border:1.5px solid #93c5fd;border-radius:8px;font-size:13px;font-weight:700;color:#1d4ed8;background:#eff6ff" readonly><span style="position:absolute;right:10px;top:50%;transform:translateY(-50%);color:#1d4ed8;font-size:12px;font-weight:700">đ</span></div></div>';
  // Tổng Tiền Phạt NVP
  h+='<div style="margin-bottom:14px"><label style="display:block;font-size:12px;font-weight:700;color:#dc2626;margin-bottom:4px">Tổng Tiền Phạt Người Vi Phạm</label><div style="position:relative"><input type="text" id="ceoU_penaltytotal" value="'+(Number(item.penalty_total)?Number(item.penalty_total).toLocaleString('de-DE'):'')+'" placeholder="0" style="width:100%;padding:8px 30px 8px 12px;border:1.5px solid #fca5a5;border-radius:8px;font-size:13px;font-weight:700;color:#dc2626;background:#fef2f2" readonly><span style="position:absolute;right:10px;top:50%;transform:translateY(-50%);color:#dc2626;font-size:12px;font-weight:700">đ</span></div></div>';
  // Per-person commitment + penalty
  var _nvpNames=(item.violator_name||'').split(',').map(function(n){return n.trim();}).filter(Boolean);
  var _nvpCommitMap={};var _nvpPenaltyMap={};
  if(item.violator_commitment){var _cLines=item.violator_commitment.split('\n');var _curName='';_cLines.forEach(function(line){var m=line.match(/^\[(.+?)\]:\s*(.*)/);if(m){_curName=m[1];_nvpCommitMap[_curName]=(m[2]||'');}else if(_curName){_nvpCommitMap[_curName]+=(_nvpCommitMap[_curName]?'\n':'')+line;}else if(!_nvpNames.length||_nvpNames.length===1){_nvpCommitMap[_nvpNames[0]||'_default']=((_nvpCommitMap[_nvpNames[0]||'_default']||'')+((_nvpCommitMap[_nvpNames[0]||'_default'])?'\n':'')+line);}});}
  if(item.penalty_per_person){try{_nvpPenaltyMap=typeof item.penalty_per_person==='string'?JSON.parse(item.penalty_per_person):item.penalty_per_person;}catch(e){}}
  h+='<div style="margin-bottom:14px"><label style="display:block;font-size:12px;font-weight:700;color:#334155;margin-bottom:8px">Cam Kết Người Vi Phạm <span style="color:#dc2626">*</span> <span style="color:#9ca3af;font-size:10px">(Enter = thêm dòng mới có số)</span></label>';
  _nvpNames.forEach(function(name,idx){
    var val=_nvpCommitMap[name]||'1. ';var pVal=_nvpPenaltyMap[name]||'';
    h+='<div style="margin-bottom:10px;padding:10px 12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px">';
    h+='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><div style="font-size:11px;font-weight:700;color:#7c3aed">📌 '+name+'</div>';
    h+='<div style="display:flex;align-items:center;gap:4px"><span style="font-size:10px;font-weight:600;color:#dc2626">💰 Tiền phạt:</span><div style="position:relative"><input type="text" id="ceoU_penalty_'+idx+'" value="'+(Number(pVal)?Number(pVal).toLocaleString('de-DE'):'')+'" placeholder="0" oninput="_ceoFmtMoney(this);_ceoCalcNVPTotal()" style="width:120px;padding:4px 24px 4px 8px;border:1.5px solid #fca5a5;border-radius:6px;font-size:12px;font-weight:700;background:#fef2f2;color:#dc2626"><span style="position:absolute;right:6px;top:50%;transform:translateY(-50%);color:#9ca3af;font-size:10px">đ</span></div></div></div>';
    h+='<textarea id="ceoU_commit_'+idx+'" rows="2" onkeydown="_ceoAutoNumber(event,this)" style="width:100%;padding:6px 10px;border:1.5px solid #d1d5db;border-radius:6px;font-size:12px;resize:vertical;line-height:1.5">'+val+'</textarea></div>';
  });
  if(!_nvpNames.length){h+='<textarea id="ceoU_commit_0" rows="4" onkeydown="_ceoAutoNumber(event,this)" style="width:100%;padding:8px 12px;border:1.5px solid #d1d5db;border-radius:8px;font-size:13px;resize:vertical;line-height:1.6">'+(item.violator_commitment||'1. ')+'</textarea>';}
  h+='</div>';
  h+='<input type="hidden" id="ceoU_nvpCount" value="'+_nvpNames.length+'">';
  h+='<input type="hidden" id="ceoU_nvpNames" value="'+_nvpNames.join('|||')+'">';
  // Đã Phạt
  h+='<div style="margin-bottom:14px"><label style="display:block;font-size:12px;font-weight:700;color:#334155;margin-bottom:4px">Đã Phạt <span style="color:#9ca3af;font-size:10px">(chọn tháng)</span></label>';
  h+='<select id="ceoU_nvp_pmonth" style="width:100%;padding:8px 12px;border:1.5px solid #d1d5db;border-radius:8px;font-size:13px;background:#fff">';
  h+='<option value="">-- Chưa phạt --</option>';
  for(var _m=1;_m<=12;_m++){h+='<option value="Tháng '+_m+'"'+(item.penalty_month==='Tháng '+_m?' selected':'')+'>Tháng '+_m+'</option>';}
  h+='</select></div>';
  h+='<div style="display:flex;gap:8px"><button onclick="_ceoSubmitNVP('+item.id+')" style="padding:10px 28px;background:linear-gradient(135deg,#7c3aed,#5b21b6);color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer">💾 Lưu NVP</button>';
  h+='<button onclick="document.getElementById(\'ceoUpdateOv\').remove()" style="padding:10px 20px;background:#f1f5f9;color:#64748b;border:none;border-radius:10px;font-size:13px;cursor:pointer">Hủy</button></div>';
  h+='</div></div>';
  ov.innerHTML=h;document.body.appendChild(ov);
  // ★ Load repair orders async
  if(item.order_code) _ceoLoadRepairOrders(item.order_code, 'ceoRepairNVP');
}


// ===== MANAGE EXTERNAL VIOLATORS (Giám Đốc only) =====
async function _ceoOpenExtViolators(){
  var items=[];
  try{var d=await apiCall('/api/customer-errors/external-violators');items=d.items||[];}catch(e){}
  _ceo.extViolators=items;
  var ov=document.createElement('div');ov.id='ceoExtViolOv';
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
  var h='<div style="background:#fff;border-radius:16px;width:500px;max-width:95vw;max-height:80vh;overflow:hidden;box-shadow:0 25px 60px rgba(0,0,0,0.3)" onclick="event.stopPropagation()">';
  h+='<div style="padding:16px 20px;background:linear-gradient(135deg,#16a34a,#15803d);border-radius:16px 16px 0 0;display:flex;justify-content:space-between;align-items:center">';
  h+='<div style="color:#fff;font-size:15px;font-weight:800">🏭 Quản Lý Bên Gia Công</div>';
  h+='<span onclick="document.getElementById(\'ceoExtViolOv\').remove()" style="color:#fff;font-size:20px;cursor:pointer;opacity:0.8">✕</span></div>';
  h+='<div style="padding:16px 20px">';
  h+='<div style="display:flex;gap:8px;margin-bottom:14px"><input type="text" id="ceoExtV_name" placeholder="Nhập tên bên gia công..." style="flex:1;padding:8px 12px;border:1.5px solid #d1d5db;border-radius:8px;font-size:13px">';
  h+='<button onclick="_ceoAddExtViolator()" style="padding:8px 16px;background:#16a34a;color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap">➕ Thêm</button></div>';
  h+='<div id="ceoExtV_list" style="max-height:400px;overflow-y:auto">';
  if(!items.length){h+='<div style="text-align:center;padding:20px;color:#9ca3af;font-size:13px">Chưa có bên gia công nào</div>';}
  items.forEach(function(v){
    h+='<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;border-bottom:1px solid #f1f5f9">';
    h+='<span style="font-weight:600;color:#1e293b;font-size:13px">🏭 '+v.name+'</span>';
    h+='<button onclick="_ceoDelExtViolator('+v.id+')" style="padding:4px 10px;background:#fef2f2;color:#dc2626;border:1px solid #fecaca;border-radius:6px;font-size:11px;cursor:pointer;font-weight:600">🗑️ Xóa</button>';
    h+='</div>';
  });
  h+='</div></div></div>';
  ov.innerHTML=h;document.body.appendChild(ov);
  ov.onclick=function(e){if(e.target===ov)ov.remove();};
}
async function _ceoAddExtViolator(){
  var inp=document.getElementById('ceoExtV_name');if(!inp)return;
  var name=inp.value.trim();if(!name){showToast('Vui lòng nhập tên','error');return;}
  try{
    var r=await apiCall('/api/customer-errors/external-violators','POST',{name:name});
    if(r.error){showToast(r.error,'error');return;}
    showToast('✅ Đã thêm: '+name);
    document.getElementById('ceoExtViolOv').remove();
    _ceoOpenExtViolators();
  }catch(e){showToast('Lỗi: '+e.message,'error');}
}
async function _ceoDelExtViolator(id){
  if(!confirm('Xóa bên gia công này?'))return;
  try{
    await apiCall('/api/customer-errors/external-violators/'+id,'DELETE');
    showToast('Đã xóa');
    document.getElementById('ceoExtViolOv').remove();
    _ceoOpenExtViolators();
  }catch(e){showToast('Lỗi: '+e.message,'error');}
}

// ===== MULTI-SELECT VIOLATOR — Chips + Dropdown =====
function _ceoRenderViolatorChips(){
  var c=document.getElementById('ceoU_violatorChips');if(!c)return;
  if(!_ceo._selectedViolators.length){c.innerHTML='';return;}
  var h='';_ceo._selectedViolators.forEach(function(name,idx){
    h+='<span style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;background:linear-gradient(135deg,#fff7ed,#ffedd5);border:1px solid #fb923c;border-radius:20px;font-size:12px;font-weight:600;color:#c2410c">';
    h+=name;
    h+='<span onclick="_ceoRemoveViolator('+idx+')" style="cursor:pointer;font-size:14px;color:#dc2626;margin-left:2px;line-height:1" title="Xóa">&times;</span></span>';
  });
  c.innerHTML=h;
}
function _ceoRemoveViolator(idx){
  _ceo._selectedViolators.splice(idx,1);
  _ceoRenderViolatorChips();
}
function _ceoShowAllUsers(){
  var dd=document.getElementById('ceoU_userDropdown');if(!dd)return;
  var search=(document.getElementById('ceoU_violator_search').value||'').toLowerCase().trim();
  var selected=_ceo._selectedViolators||[];
  var users=_ceo.allUsers.filter(function(u){
    var n=(u.full_name||'').trim();
    if(selected.indexOf(n)!==-1)return false;
    if(!search)return true;
    return n.toLowerCase().indexOf(search)!==-1;
  });
  var extUsers=(_ceo.extViolators||[]).filter(function(ev){
    if(selected.indexOf(ev.name)!==-1)return false;
    if(!search)return true;
    return ev.name.toLowerCase().indexOf(search)!==-1;
  });
  var h='';
  if(extUsers.length){h+='<div style="padding:4px 12px;font-size:10px;font-weight:700;color:#16a34a;background:#f0fdf4;border-bottom:1px solid #e5e7eb">🏭 BÊN GIA CÔNG</div>';}
  extUsers.forEach(function(ev){
    h+='<div onclick="_ceoSelectUser(\''+ev.name.replace(/'/g,"\\\\'")+'\')" style="padding:8px 12px;cursor:pointer;font-size:13px;border-bottom:1px solid #f1f5f9;transition:background .1s" onmouseover="this.style.background=\'#f0fdf4\'" onmouseout="this.style.background=\'\'">';
    h+='<span style="font-weight:600;color:#16a34a">'+ev.name+'</span> <span style="font-size:10px;color:#9ca3af">🏭 gia công</span></div>';
  });
  if(users.length&&(extUsers.length||!search)){h+='<div style="padding:4px 12px;font-size:10px;font-weight:700;color:#1d4ed8;background:#eff6ff;border-bottom:1px solid #e5e7eb">👤 NHÂN VIÊN</div>';}
  users.forEach(function(u){
    h+='<div onclick="_ceoSelectUser(\''+((u.full_name||'').replace(/'/g,"\\'"))+'\')" style="padding:8px 12px;cursor:pointer;font-size:13px;border-bottom:1px solid #f1f5f9;transition:background .1s" onmouseover="this.style.background=\'#fff7ed\'" onmouseout="this.style.background=\'\'">';
    h+='<span style="font-weight:600;color:#1e293b">'+(u.full_name||'')+'</span>'+(u.department?' <span style="font-size:10px;color:#9ca3af">· '+u.department+'</span>':'')+'</div>';
  });
  if(!h){h='<div style="padding:10px;color:#9ca3af;font-size:12px;text-align:center">Đã chọn hết</div>';}
  dd.innerHTML=h;dd.style.display='block';
}
function _ceoFilterUsers(){_ceoShowAllUsers();}
function _ceoSelectUser(name){
  if(!_ceo._selectedViolators)_ceo._selectedViolators=[];
  if(_ceo._selectedViolators.indexOf(name)===-1)_ceo._selectedViolators.push(name);
  _ceoRenderViolatorChips();
  var inp=document.getElementById('ceoU_violator_search');if(inp)inp.value='';
  var dd=document.getElementById('ceoU_userDropdown');if(dd)dd.style.display='none';
}

// ===== CALC FUNCTIONS =====
function _ceoPhatCalcSX(){
  var ids=['ceoU_cut','ceoU_print','ceoU_press','ceoU_sew','ceoU_collar','ceoU_matother','ceoU_costother','ceoU_discount'];
  var total=0;ids.forEach(function(id){var el=document.getElementById(id);if(el){var raw=(el.value||'0').replace(/\./g,'').replace(/[^\d]/g,'');total+=Number(raw)||0;}});
  var d=document.getElementById('ceoU_prodcost_display');if(d)d.textContent=total?total.toLocaleString('de-DE')+'đ':'0đ';
}
function _ceoPhatCalcShip(){
  var ids=['ceoU_shipreturn','ceoU_shipdelivery','ceoU_shipother'];
  var total=0;ids.forEach(function(id){var el=document.getElementById(id);if(el){var raw=(el.value||'0').replace(/\./g,'').replace(/[^\d]/g,'');total+=Number(raw)||0;}});
  var d=document.getElementById('ceoU_shipcost_display');if(d)d.textContent=total?total.toLocaleString('de-DE')+'đ':'0đ';
}

// ===== SUBMIT FUNCTIONS =====
async function _ceoSubmitQLX(id){
  var violatorNames=(_ceo._selectedViolators||[]).join(', ');
  var fields={common_error_type:document.getElementById('ceoU_errtype').value,sale_resolution:document.getElementById('ceoU_saleRes').value.trim(),violator_name:violatorNames};
  if(!fields.common_error_type){showToast('Vui lòng chọn Lỗi Thường Gặp','error');return;}
  if(!fields.sale_resolution||fields.sale_resolution==='1. '){showToast('Vui lòng nhập Cách Xử Lý Lỗi QLX','error');return;}
  if(!fields.violator_name){showToast('Vui lòng chọn Người Vi Phạm','error');return;}
  try{await apiCall('/api/customer-errors/'+id+'/qlx-update','PATCH',fields);showToast('✅ Đã cập nhật QLX!');var _ov=document.getElementById('ceoUpdateOv');if(_ov)_ov.remove();var _dm=document.getElementById('ceoDetailModal');if(_dm)_dm.remove();_ceoLoadData().then(function(){_ceoViewDetail(id);});}catch(e){showToast('Lỗi: '+e.message,'error');}
}
async function _ceoSubmitPhat(id){
  var gv=function(eid){return Number((document.getElementById(eid).value||'0').replace(/[^\d]/g,''))||0;};
  var cost_cut=gv('ceoU_cut'),cost_print=gv('ceoU_print'),cost_press=gv('ceoU_press'),cost_sew=gv('ceoU_sew');
  var cost_collar=gv('ceoU_collar'),cost_material_other=gv('ceoU_matother'),cost_other=gv('ceoU_costother'),cost_discount=gv('ceoU_discount');
  var ship_return=gv('ceoU_shipreturn'),ship_delivery=gv('ceoU_shipdelivery'),ship_other=gv('ceoU_shipother');
  var production_cost=cost_cut+cost_print+cost_press+cost_sew+cost_collar+cost_material_other+cost_other+cost_discount;
  var shipping_cost=ship_return+ship_delivery+ship_other;
  // Validate: must fill at least 1 SX field AND 1 Ship field
  var _hasVal=function(ids){for(var i=0;i<ids.length;i++){var el=document.getElementById(ids[i]);if(el&&el.value.trim()!=='')return true;}return false;};
  if(!_hasVal(['ceoU_cut','ceoU_print','ceoU_press','ceoU_sew','ceoU_collar','ceoU_matother','ceoU_costother','ceoU_discount'])){showToast('⚠️ Vui lòng nhập ít nhất 1 mục Chi Phí SX (dù là 0)','error');return;}
  if(!_hasVal(['ceoU_shipreturn','ceoU_shipdelivery','ceoU_shipother'])){showToast('⚠️ Vui lòng nhập ít nhất 1 mục Phí Ship (dù là 0)','error');return;}
  var fields={cost_cut:cost_cut,cost_print:cost_print,cost_press:cost_press,cost_sew:cost_sew,cost_collar:cost_collar,cost_material_other:cost_material_other,cost_other:cost_other,cost_discount:cost_discount,ship_return:ship_return,ship_delivery:ship_delivery,ship_other:ship_other,production_cost:production_cost,shipping_cost:shipping_cost,phat_updated_at:new Date().toISOString()};
  try{var keys=Object.keys(fields);for(var i=0;i<keys.length;i++){var k=keys[i],v=fields[k];if(v!==''&&v!==null)await apiCall('/api/customer-errors/'+id+'/field','PATCH',{field:k,value:v});}showToast('✅ Đã cập nhật Phạt!');var _ov=document.getElementById('ceoUpdateOv');if(_ov)_ov.remove();var _dm=document.getElementById('ceoDetailModal');if(_dm)_dm.remove();_ceoLoadData().then(function(){_ceoViewDetail(id);});}catch(e){showToast('Lỗi: '+e.message,'error');}
}
async function _ceoSubmitNVP(id){
  // Collect per-person penalty amounts
  var nvpNamesStr=document.getElementById('ceoU_nvpNames')?document.getElementById('ceoU_nvpNames').value:'';
  var nvpNames=nvpNamesStr?nvpNamesStr.split('|||'):[];
  var penaltyPerPerson={};
  var penaltyTotal=0;
  for(var pi=0;pi<nvpNames.length;pi++){
    var pEl=document.getElementById('ceoU_penalty_'+pi);
    var pAmt=pEl?Number((pEl.value||'0').replace(/[^\d]/g,'')):0;
    penaltyPerPerson[nvpNames[pi]]=pAmt;
    penaltyTotal+=pAmt;
  }
  // Collect per-person commitments
  var commitment='';
  if(nvpNames.length>1){
    for(var ci=0;ci<nvpNames.length;ci++){
      var ta=document.getElementById('ceoU_commit_'+ci);
      var val=ta?ta.value.trim():'';
      if(!val||val==='1.'||val==='1. '){showToast('Vui l\u00f2ng nh\u1eadp Cam K\u1ebft cho "'+nvpNames[ci]+'"','error');if(ta){ta.style.border='2px solid #dc2626';ta.focus();}return;}
      commitment+='['+nvpNames[ci]+']: '+val+'\n';
    }
    commitment=commitment.trim();
  } else {
    var ta0=document.getElementById('ceoU_commit_0');
    commitment=ta0?ta0.value.trim():'';
    if(!commitment||commitment==='1. '){showToast('Vui l\u00f2ng nh\u1eadp Cam K\u1ebft Ng\u01b0\u1eddi Vi Ph\u1ea1m','error');return;}
  }
  var pmonth=document.getElementById('ceoU_nvp_pmonth')?document.getElementById('ceoU_nvp_pmonth').value:'';
  if(!pmonth){showToast('Vui lòng chọn Đã Phạt tháng mấy','error');return;}
  var fields={violator_commitment:commitment,penalty_total:penaltyTotal,penalty_per_person:JSON.stringify(penaltyPerPerson),penalty_month:pmonth};
  try{var keys=Object.keys(fields);for(var i=0;i<keys.length;i++){var k=keys[i],v=fields[k];if(v!==''&&v!==null)await apiCall('/api/customer-errors/'+id+'/field','PATCH',{field:k,value:v});}showToast('\u2705 \u0110\u00e3 c\u1eadp nh\u1eadt NVP!');var _ov=document.getElementById('ceoUpdateOv');if(_ov)_ov.remove();var _dm=document.getElementById('ceoDetailModal');if(_dm)_dm.remove();_ceoLoadData().then(function(){_ceoViewDetail(id);});}catch(e){showToast('L\u1ed7i: '+e.message,'error');}
}

// ===== FORMAT MONEY — dấu chấm hàng nghìn =====
function _ceoFmtMoney(el){
  var v=el.value.replace(/[^\d]/g,'');
  el.value=v?Number(v).toLocaleString('de-DE'):'';
}

// ===== CALC NVP TOTAL from per-person penalties =====
function _ceoCalcNVPTotal(){
  var nvpNamesStr=document.getElementById('ceoU_nvpNames')?document.getElementById('ceoU_nvpNames').value:'';
  var nvpNames=nvpNamesStr?nvpNamesStr.split('|||'):[];
  var total=0;
  for(var i=0;i<nvpNames.length;i++){
    var el=document.getElementById('ceoU_penalty_'+i);
    if(el){var raw=(el.value||'0').replace(/\./g,'').replace(/[^\d]/g,'');total+=Number(raw)||0;}
  }
  var d=document.getElementById('ceoU_penaltytotal');
  if(d)d.value=total?total.toLocaleString('de-DE'):'';
}

// ===== AUTO-NUMBER TEXTAREA =====
function _ceoAutoNumber(e,ta){
  if(e.key==='Enter'){
    e.preventDefault();
    var val=ta.value;
    var lines=val.split('\n');
    var lastLine=lines[lines.length-1];
    var m=lastLine.match(/^(\d+)\./);
    var nextNum=m?parseInt(m[1])+1:lines.length+1;
    ta.value=val+'\n'+nextNum+'. ';
  }
}

// ===== CARD CLICK = FILTER + TOGGLE =====
function _ceoCardClick(filterName, dropId){
  _ceo.filter = (_ceo.filter === filterName) ? null : filterName;
  _ceoRenderTable();
  if (_ceo.filter === filterName) {
    var dd = document.getElementById(dropId);
    if (dd) dd.style.display = "block";
  }
}
function _ceoToggleCardDrop(id){
  var dd=document.getElementById(id);if(!dd)return;
  var allDrops=['ceoDropXL','ceoDropPhat','ceoDropDone'];
  allDrops.forEach(function(d){if(d!==id){var el=document.getElementById(d);if(el)el.style.display='none';}});
  dd.style.display=dd.style.display==='none'?'block':'none';
}
document.addEventListener("click",function(e){
  if(!e.target.closest('#ceoCardXL')&&!e.target.closest('#ceoCardPhat')&&!e.target.closest('#ceoCardDone')){
    var d1=document.getElementById('ceoDropXL'),d2=document.getElementById('ceoDropPhat'),d3=document.getElementById('ceoDropDone');
    if(d1)d1.style.display='none';if(d2)d2.style.display='none';if(d3)d3.style.display='none';
  }
});

// ===== REPAIR ORDER DETAILS — Shared builder =====
function _ceoBuildRepairHTML(repairOrders) {
    if (!repairOrders || !repairOrders.length) {
        return '<div style="margin-bottom:14px;padding:14px;background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:10px">' +
            '<div style="font-size:12px;font-weight:800;color:#6d28d9;margin-bottom:4px">\u{1F527} \u0110\u01A1n S\u1EEDa</div>' +
            '<div style="text-align:center;padding:8px;color:#9ca3af;font-size:12px;font-style:italic">Ch\u01B0a c\u00F3 \u0111\u01A1n s\u1EEDa</div></div>';
    }
    var h = '';
    repairOrders.forEach(function(ro) {
        var fmtM = function(v) { return Number(v||0) > 0 ? Number(v).toLocaleString('vi-VN') + '\u0111' : '0\u0111'; };
        var totalItems = (ro.items || []).reduce(function(s, i) { return s + Number(i.item_total || 0); }, 0);
        var totalQty = (ro.items || []).reduce(function(s, i) { return s + Number(i.quantity || 0); }, 0);
        h += '<div style="margin-bottom:14px;border:2px solid #7c3aed;border-radius:12px;overflow:hidden">';
        h += '<div style="padding:10px 14px;background:linear-gradient(135deg,#7c3aed,#5b21b6);display:flex;justify-content:space-between;align-items:center">';
        h += '<div style="display:flex;align-items:center;gap:8px"><span style="font-size:16px">\u{1F527}</span>';
        h += '<div><div style="font-size:13px;font-weight:800;color:#fff">\u0110\u01A0N S\u1EECA \u2014 ' + (ro.order_code || '\u2014') + '</div>';
        h += '<div style="font-size:10px;color:#c4b5fd">' + (ro.category_name || '') + (ro.order_date ? ' \u00B7 ' + new Date(ro.order_date).toLocaleDateString('vi-VN') : '') + '</div></div></div>';
        h += '<div style="padding:4px 12px;background:rgba(255,255,255,0.2);border-radius:8px;font-size:14px;font-weight:900;color:#fff">' + fmtM(ro.total_amount) + '</div></div>';
        if (ro.items && ro.items.length) {
            h += '<div style="padding:12px 14px">';
            h += '<table style="width:100%;border-collapse:collapse;font-size:11px">';
            h += '<thead><tr style="background:#1e293b;border-bottom:2px solid #334155">';
            ['Loại','Sản Phẩm','Chất Liệu','Màu','SL','Đơn Giá','Thành Tiền'].forEach(function(c) {
                h += '<th style="padding:6px 4px;text-align:left;font-size:10px;font-weight:700;color:#fff;white-space:nowrap">' + c + '</th>';
            });
            h += '</tr></thead><tbody>';
            ro.items.forEach(function(it) {
                h += '<tr style="border-bottom:1px solid #f1f5f9">';
                h += '<td style="padding:5px 4px;font-size:11px"><span style="padding:2px 6px;background:#ede9fe;border-radius:4px;font-weight:600;color:#6d28d9;font-size:10px">' + (it.sale_type || 'Bản') + '</span></td>';
                h += '<td style="padding:5px 4px;font-weight:600;color:#1e293b">' + (it.product_name || '\u2014') + '</td>';
                h += '<td style="padding:5px 4px;color:#64748b">' + (it.material_name || '\u2014') + '</td>';
                h += '<td style="padding:5px 4px;color:#64748b">' + (it.color_name || '\u2014') + '</td>';
                h += '<td style="padding:5px 4px;font-weight:700;color:#1e293b;text-align:center">' + (it.quantity || 0) + '</td>';
                h += '<td style="padding:5px 4px;color:#1e293b">' + fmtM(it.unit_price) + '</td>';
                h += '<td style="padding:5px 4px;font-weight:700;color:#6d28d9">' + fmtM(it.item_total) + '</td>';
                h += '</tr>';
            });
            h += '</tbody></table>';
            h += '<div style="margin-top:8px;display:flex;gap:10px;flex-wrap:wrap">';
            h += '<div style="padding:6px 12px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;font-size:11px"><b style="color:#166534">T\u1ED5ng SL:</b> <span style="font-weight:800;color:#166534">' + totalQty + '</span></div>';
            h += '<div style="padding:6px 12px;background:#f5f3ff;border:1px solid #e9d5ff;border-radius:6px;font-size:11px"><b style="color:#6d28d9">T\u1ED5ng ti\u1EC1n:</b> <span style="font-weight:800;color:#6d28d9">' + fmtM(totalItems) + '</span></div>';
            if (Number(ro.vat_amount)) h += '<div style="padding:6px 12px;background:#fefce8;border:1px solid #fde68a;border-radius:6px;font-size:11px"><b style="color:#92400e">VAT:</b> <span style="font-weight:800;color:#92400e">' + fmtM(ro.vat_amount) + '</span></div>';
            if (Number(ro.deposit_amount)) h += '<div style="padding:6px 12px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;font-size:11px"><b style="color:#1d4ed8">\u0110\u00E3 c\u1ECDc:</b> <span style="font-weight:800;color:#1d4ed8">' + fmtM(ro.deposit_amount) + '</span></div>';
            h += '</div></div>';
        } else {
            h += '<div style="padding:12px;text-align:center;color:#9ca3af;font-size:12px">Ch\u01B0a c\u00F3 phi\u1EBFu</div>';
        }
        h += '</div>';
    });
    return h;
}

async function _ceoLoadRepairOrders(orderCode, containerId) {
    if (!orderCode) return;
    try {
        var data = await apiCall('/api/customer-errors/repair-orders/' + encodeURIComponent(orderCode));
        var container = document.getElementById(containerId);
        if (container) container.innerHTML = _ceoBuildRepairHTML(data.orders || []);
    } catch(e) { console.error('[CEO] Repair orders load error:', e); }
}

// ===== CHỊU TRÁCH NHIỆM — Read-only from common error template =====
function _ceoRespSection(item){
  if(!item||!item.common_error_type)return '';
  var tpl=null;
  for(var i=0;i<(_ceo.commonErrors||[]).length;i++){
    if(_ceo.commonErrors[i].error_name===item.common_error_type){tpl=_ceo.commonErrors[i];break;}
  }
  if(!tpl)return '';
  var resp=[];
  try{resp=typeof tpl.responsibility==='string'?JSON.parse(tpl.responsibility||'[]'):(tpl.responsibility||[]);}catch(e){}
  if(!resp.length)return '';
  var h='<div style="margin-bottom:14px">';
  h+='<div style="font-size:12px;font-weight:800;color:#1e293b;margin-bottom:6px;display:flex;align-items:center;gap:6px">👤 Chịu Trách Nhiệm</div>';
  h+='<div style="padding:10px 14px;background:#f0fdfa;border-radius:8px;border:1px solid #99f6e4">';
  resp.forEach(function(r){
    var barW=Math.min(r.percent,100);
    h+='<div style="display:flex;align-items:center;gap:10px;padding:5px 0;border-bottom:1px solid rgba(204,251,241,0.2)">';
    h+='<div style="min-width:100px;font-size:12px;font-weight:700;color:#0e7490">'+(r.name||'—')+'</div>';
    h+='<div style="flex:1;height:6px;background:#e5e7eb;border-radius:3px;overflow:hidden"><div style="height:100%;width:'+barW+'%;background:linear-gradient(90deg,#0891b2,#06b6d4);border-radius:3px"></div></div>';
    h+='<div style="min-width:50px;text-align:right;font-size:12px;font-weight:800;color:#0891b2">'+r.percent+'%</div>';
    h+='</div>';
  });
  h+='</div></div>';
  return h;
}

// ===== GUIDE SECTION — Read-only template guide context =====
function _ceoBuildGuideSection(errorName) {
  if (!errorName) return '';
  var tpl = (_ceo.commonErrors || []).find(function(x) { return x.error_name === errorName; });
  if (!tpl) return '';
  
  var h = '<div style="margin-bottom:14px;padding:12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px">';
  h += '<div style="font-size:11px;font-weight:800;color:#475569;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px">💡 Gợi ý xử lý mẫu:</div>';
  
  var subSec = function(icon, label, content, color, bg, border) {
    if (!content) return '';
    var trimmed = content.trim();
    if (trimmed === '1.' || trimmed === '1. ' || trimmed === '') return '';
    var formatted = trimmed.split('\n').map(function(l) { return '<div style="padding:1px 0">' + l + '</div>'; }).join('');
    return '<div style="margin-bottom:8px">' +
      '<div style="font-size:11px;font-weight:700;color:' + color + ';margin-bottom:3px;display:flex;align-items:center;gap:4px">' + icon + ' ' + label + '</div>' +
      '<div style="padding:6px 10px;background:' + bg + ';border:1px solid ' + border + ';border-radius:6px;font-size:12px;color:#334155;line-height:1.4">' + formatted + '</div>' +
    '</div>';
  };
  
  h += subSec('🔧', 'Cách Khắc Phục / Xử Lý Lỗi', tpl.fix_guide, '#0ea5e9', '#f0f9ff', '#e0f2fe');
  h += subSec('💬', 'Hướng Dẫn Sale Tư Vấn', tpl.sale_guide, '#7c3aed', '#f5f3ff', '#ede9fe');
  h += subSec('🏭', 'Cam Kết Quản Lý Xưởng', tpl.commit_factory, '#ea580c', '#fff7ed', '#ffedd5');
  h += subSec('⚠️', 'Cam Kết Bộ Phận Lỗi', tpl.commit_department, '#b45309', '#fefbeb', '#fef3c7');
  
  h += '</div>';
  return h;
}

