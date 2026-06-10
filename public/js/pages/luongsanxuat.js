// ========== LƯƠNG SẢN XUẤT — Desktop SPA ==========
var _lsx = {
    records: [],
    tree: null,
    filter: {
        year: null,
        month: null,
        dept: null,
        worker_id: null,
        contractor_id: null,
        status: '' // '', 'approved', 'pending'
    },
    search: '',
    is_manager: false
};
var _lsxOpen = {};

function renderLuongSanXuatPage(content) {
    if (!content) content = document.getElementById('contentArea');
    if (!content) return;

    if (!document.getElementById('_lsxS')) {
        var st = document.createElement('style');
        st.id = '_lsxS';
        st.textContent = `
            .lsx-wrap { display: flex; height: calc(100vh - 60px); overflow: hidden; }
            .lsx-sb { width: 290px; min-width: 290px; background: #fff; border-right: 1px solid var(--gray-200); overflow-y: auto; display: flex; flex-direction: column; }
            .lsx-main { flex: 1; min-width: 0; display: flex; flex-direction: column; overflow-y: auto; padding: 16px; }
            .lsx-main > * { flex-shrink: 0; }
            .lsx-sb-title { font-size: 13px; font-weight: 800; padding: 16px; border-bottom: 1px solid var(--gray-200); text-align: center; color: #0d9488; letter-spacing: 0.5px; }
            .lsx-sb-tree { flex: 1; overflow-y: auto; }
            .lsx-sb-total { background: linear-gradient(135deg, #0d9488, #14b8a6); color: #fff; padding: 12px 16px; font-size: 13px; font-weight: 800; display: flex; justify-content: space-between; cursor: pointer; transition: opacity 0.15s; }
            .lsx-sb-total:hover { opacity: 0.9; }
            .lsx-sb-year { padding: 8px 16px; font-weight: 800; font-size: 12px; color: var(--navy); cursor: pointer; display: flex; justify-content: space-between; background: #f8fafc; border-bottom: 1px solid var(--gray-200); }
            .lsx-sb-dept { padding: 6px 16px 6px 28px; font-size: 11px; font-weight: 700; cursor: pointer; display: flex; justify-content: space-between; border-bottom: 1px solid #f0f0f0; color: #0d9488; }
            .lsx-sb-dept:hover { background: #f0fdfa; }
            .lsx-sb-dept.active { background: #ccfbf1; font-weight: 800; }
            .lsx-sb-worker { padding: 5px 16px 5px 42px; font-size: 10px; font-weight: 600; cursor: pointer; display: flex; justify-content: space-between; border-bottom: 1px solid #fafafa; color: #64748b; }
            .lsx-sb-worker:hover { background: #f8fafc; }
            .lsx-sb-worker.active { background: #e2e8f0; color: #0f172a; font-weight: 800; }
            .lsx-sb-month { padding: 4px 16px 4px 56px; font-size: 9.5px; font-weight: 600; cursor: pointer; display: flex; justify-content: space-between; border-bottom: 1px solid #fcfcfc; color: #475569; }
            .lsx-sb-month:hover { background: #f0fdfa; }
            .lsx-sb-month.active { background: #ccfbf1; color: #0d9488; font-weight: 800; }
            .lsx-ib { width: 26px; height: 26px; border-radius: 6px; border: 1.5px solid #e2e8f0; background: #fff; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; transition: all 0.15s; margin: 0 1px; }
            .lsx-ib:hover { transform: scale(1.15); box-shadow: 0 2px 8px rgba(0,0,0,0.12); }
            .lsx-ib.on-sal { background: #fef3c7; border-color: #f59e0b; }
            .lsx-ib.on-approved { background: #ccfbf1; border-color: #14b8a6; }
            .lsx-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; text-transform: uppercase; }
            .lsx-badge.cut { background: #ffedd5; color: #ea580c; border: 1px solid #fed7aa; }
            .lsx-badge.press { background: #f3e8ff; color: #7e22ce; border: 1px solid #e9d5ff; }
            .lsx-badge.sew { background: #ccfbf1; color: #0f766e; border: 1px solid #99f6e4; }
            .lsx-edit-input { width: 80px; padding: 2px 4px; font-size: 11px; border: 1px solid #cbd5e1; border-radius: 4px; text-align: right; outline: none; }
            .lsx-edit-input:focus { border-color: #14b8a6; box-shadow: 0 0 0 2px rgba(20,184,166,0.2); }
            .lsx-cell-editable { cursor: pointer; text-decoration: underline dashed #94a3b8; transition: background 0.15s; }
            .lsx-cell-editable:hover { background: #f8fafc; }
            .lsx-card-stat { flex: 1; min-width: 120px; border-radius: 12px; padding: 14px 20px; color: #fff; box-shadow: 0 4px 15px rgba(0,0,0,0.06); }
            @media(max-width: 768px) { .lsx-sb { display: none; } }

            .bpc-modal-overlay{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(15,23,42,0.6);backdrop-filter:blur(6px);z-index:9999;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .25s ease}
            .bpc-modal-overlay.show{opacity:1}
            .bpc-modal{background:#fff;border-radius:16px;width:460px;max-width:92vw;box-shadow:0 25px 60px rgba(0,0,0,0.25);transform:scale(0.85);transition:transform .3s cubic-bezier(0.34,1.56,0.64,1);overflow:hidden}
            .bpc-modal-overlay.show .bpc-modal{transform:scale(1)}
            .bpc-modal-header{background:linear-gradient(135deg,#059669,#10b981);color:#fff;padding:18px 24px;display:flex;align-items:center;gap:12px}
            .bpc-modal-header .m-icon{font-size:28px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.2))}
            .bpc-modal-header .m-title{font-size:16px;font-weight:800;letter-spacing:0.3px;font-family:Inter,system-ui,sans-serif}
            .bpc-modal-header .m-sub{font-size:11px;opacity:0.85;margin-top:2px}
            .bpc-modal-body{padding:20px 24px}
            .bpc-modal-row{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f1f5f9;font-family:Inter,system-ui,sans-serif}
            .bpc-modal-row:last-child{border-bottom:none}
            .bpc-modal-lbl{font-size:12px;color:#64748b;font-weight:600}
            .bpc-modal-val{font-size:13px;color:#1e293b;font-weight:700;text-align:right;max-width:60%}
            .bpc-modal-phoi{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:10px 14px;margin-top:10px}
            .bpc-modal-phoi-title{font-size:10px;font-weight:700;color:#059669;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px}
            .bpc-modal-phoi-item{display:flex;justify-content:space-between;align-items:center;padding:4px 0;font-size:12px}
            .bpc-modal-phoi-item .p-name{color:#1e293b;font-weight:600;flex:1}
            .bpc-modal-phoi-item .p-mat{color:#64748b;font-size:11px}
            .bpc-modal-actions{display:flex;gap:10px;padding:16px 24px;border-top:1px solid #f1f5f9}
            .bpc-modal-btn{flex:1;padding:12px;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;font-family:Inter,system-ui,sans-serif;transition:all .15s}
            .bpc-modal-btn.confirm{background:linear-gradient(135deg,#059669,#10b981);color:#fff;box-shadow:0 4px 15px rgba(16,185,129,0.3)}
            .bpc-modal-btn.confirm:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(16,185,129,0.4)}
            .bpc-modal-btn.cancel{background:#f1f5f9;color:#475569}
            .bpc-modal-btn.cancel:hover{background:#e2e8f0}
            .bpc-detail-card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:14px;margin-bottom:16px}
            .bpc-detail-section-title{font-size:11px;font-weight:800;color:#6366f1;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;display:flex;align-items:center;gap:6px}
            .bpe-detail-thumb{width:80px;height:80px;object-fit:cover;border-radius:8px;border:2px solid #e2e8f0;cursor:pointer;transition:transform .2s,border-color .2s}
            .bpe-detail-thumb:hover{transform:scale(1.05);border-color:#6366f1}
        `;
        document.head.appendChild(st);
    }

    content.innerHTML = `
        <div class="lsx-wrap">
            <div class="lsx-sb" id="lsxSb">
                <div style="padding:20px;text-align:center;color:var(--gray-400);font-size:12px">⏳ Đang tải...</div>
            </div>
            <div class="lsx-main">
                <div style="display:flex;gap:12px;margin-bottom:12px;flex-wrap:wrap;align-items:center">
                    <div style="display:flex;flex-direction:column;gap:8px;align-items:flex-start">
                        <div id="lsxInfo" style="font-size:12px"></div>
                        <input id="lsxSearch" autocomplete="off" placeholder="🔍 Tìm SP, mã đơn, nhân viên..." style="padding:6px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:12px;width:240px;outline:none">
                    </div>
                    <div id="lsxStats" style="display:flex;gap:12px;flex:1;justify-content:center"></div>
                    <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
                        <select id="lsxYearFilter" style="padding:6px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:12px;outline:none" onchange="_lsxChangeYear(this.value)">
                            <option value="">Năm: Tất cả</option>
                        </select>
                        <select id="lsxMonthFilter" style="padding:6px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:12px;outline:none" onchange="_lsxChangeMonth(this.value)">
                            <option value="">Tháng: Tất cả</option>
                            <option value="1">Tháng 01</option>
                            <option value="2">Tháng 02</option>
                            <option value="3">Tháng 03</option>
                            <option value="4">Tháng 04</option>
                            <option value="5">Tháng 05</option>
                            <option value="6">Tháng 06</option>
                            <option value="7">Tháng 07</option>
                            <option value="8">Tháng 08</option>
                            <option value="9">Tháng 09</option>
                            <option value="10">Tháng 10</option>
                            <option value="11">Tháng 11</option>
                            <option value="12">Tháng 12</option>
                        </select>
                        <select id="lsxStatusFilter" style="padding:6px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:12px;outline:none" onchange="_lsxChangeStatus(this.value)">
                            <option value="">Status: Tất cả</option>
                            <option value="pending">Chưa duyệt</option>
                            <option value="approved">Đã duyệt</option>
                        </select>
                    </div>
                </div>
                <div class="card">
                    <div class="card-body" style="overflow-x:auto;padding:8px">
                        <table class="table" style="font-size:11px;white-space:nowrap" id="lsxTable">
                            <thead>
                                <tr style="background:var(--gray-800)">
                                    <th style="width:50px">STT</th>
                                    <th>Ngày Làm</th>
                                    <th>Bộ Phận</th>
                                    <th>Nhân Viên</th>
                                    <th>Mã Đơn</th>
                                    <th style="text-align:center">SL Đơn</th>
                                    <th style="text-align:center">SL Cắt</th>
                                    <th>Tên Sản Phẩm</th>
                                    <th style="text-align:right">Đơn Giá (đ)</th>
                                    <th style="text-align:right">Thành Tiền (đ)</th>
                                    <th style="text-align:center">
                                        Kiểm Tra
                                        <br>
                                        <button id="lsxBtnApproveAll" class="btn btn-xs" onclick="_lsxApproveAllVisible()" style="padding:2px 6px;font-size:9px;margin-top:2px;background:#0d9488;color:#fff;border:none;border-radius:4px;cursor:pointer;font-weight:800;display:none;">Duyệt hết</button>
                                    </th>
                                    <th style="text-align:right;font-weight:bold;color:#fff">Cộng dồn (đ)</th>
                                    <th>Lịch Sử Cập Nhật</th>
                                </tr>
                            </thead>
                            <tbody id="lsxTb">
                                <tr><td colspan="13" style="text-align:center;padding:40px">⏳ Đang tải bản ghi...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    `;

    _lsx.search = '';
    var searchEl = document.getElementById('lsxSearch');
    if (searchEl) searchEl.value = '';

    var _t;
    document.getElementById('lsxSearch').addEventListener('input', function() {
        clearTimeout(_t);
        _t = setTimeout(function() {
            _lsx.search = document.getElementById('lsxSearch').value || '';
            _lsxRenderTable();
        }, 300);
    });

    _lsxLoadAll();
}

function _lsxEnforceRestrictedFilter() {
    var isRestricted = !_lsx.is_manager && !(window._currentUser && ['quan_ly', 'truong_phong'].includes(window._currentUser.role));
    if (isRestricted && window._currentUser) {
        _lsx.filter.worker_id = window._currentUser.id;
        _lsx.filter.contractor_id = null;
    }
}

async function _lsxLoadAll() {
    try {
        try {
            var posRes = await apiCall('/api/pressing/positions');
            window._bpePositions = (posRes.positions || []).filter(p => p.is_active);
        } catch(e) {
            window._bpePositions = [];
        }

        var res = await apiCall('/api/production-salary/tree');
        _lsx.tree = res.tree;
        _lsx.is_manager = res.is_manager || false;
        
        _lsxEnforceRestrictedFilter();
        
        // If restricted, default to the latest year and department
        var isRestricted = !_lsx.is_manager && !(window._currentUser && ['quan_ly', 'truong_phong'].includes(window._currentUser.role));
        if (isRestricted && _lsx.tree && _lsx.tree.length > 0) {
            var latestYear = _lsx.tree[0];
            _lsx.filter.year = latestYear.year;
            if (latestYear.depts && latestYear.depts.length > 0) {
                _lsx.filter.dept = latestYear.depts[0].dept;
            }
        }
        
        // Pre-open the latest year and its departments by default on first load
        if (Object.keys(_lsxOpen).length === 0 && _lsx.tree && _lsx.tree.length > 0) {
            var latestYear = _lsx.tree[0];
            _lsxOpen['y_' + latestYear.year] = true;
            if (latestYear.depts) {
                latestYear.depts.forEach(function(dp) {
                    _lsxOpen[`d_${latestYear.year}_${dp.dept}`] = true;
                    // Pre-open their own worker node so they see themselves highlighted
                    if (isRestricted && window._currentUser) {
                        _lsxOpen[`w_${latestYear.year}_${dp.dept}_${window._currentUser.id}_false`] = true;
                    }
                });
            }
        }
        
        // Populate Year dropdown dynamically
        var yEl = document.getElementById('lsxYearFilter');
        if (yEl && _lsx.tree) {
            var selectedY = _lsx.filter.year || '';
            var h = '<option value="">Năm: Tất cả</option>';
            _lsx.tree.forEach(function(yr) {
                h += `<option value="${yr.year}">Năm ${yr.year}</option>`;
            });
            yEl.innerHTML = h;
            yEl.value = selectedY;
        }

        // Render left sidebar tree
        _lsxRenderSb();
        
        // Render stats boxes
        _lsxRenderStats(res.stats);
        
        await _lsxLoadRecs();
    } catch(e) {
        console.error('[LSX]', e);
        showToast('Không thể tải cây dữ liệu', 'error');
    }
}

function _lsxRenderStats(stats) {
    var sc = document.getElementById('lsxStats');
    if (!sc) return;
    var s = stats || { total: 0, approved: 0, pending: 0, count: 0 };
    sc.innerHTML = `
        <div class="lsx-card-stat" style="background:linear-gradient(135deg,#1e293b,#0f172a)">
            <div style="font-size:9px;font-weight:700;opacity:.8;letter-spacing:1px;margin-bottom:2px">📦 TỔNG LƯƠNG</div>
            <div style="font-size:15px;font-weight:900">${_lsxFN(s.total)} đ</div>
            <div style="font-size:9px;opacity:.7;margin-top:2px">${s.count} đơn</div>
        </div>
        <div class="lsx-card-stat" style="background:linear-gradient(135deg,#10b981,#059669)">
            <div style="font-size:9px;font-weight:700;opacity:.8;letter-spacing:1px;margin-bottom:2px">✅ ĐÃ DUYỆT</div>
            <div style="font-size:15px;font-weight:900">${_lsxFN(s.approved)} đ</div>
        </div>
        <div class="lsx-card-stat" style="background:linear-gradient(135deg,#f59e0b,#d97706)">
            <div style="font-size:9px;font-weight:700;opacity:.8;letter-spacing:1px;margin-bottom:2px">⏳ CHƯA DUYỆT</div>
            <div style="font-size:15px;font-weight:900">${_lsxFN(s.pending)} đ</div>
        </div>
    `;
}

function _lsxRenderSb() {
    var sb = document.getElementById('lsxSb');
    if (!sb || !_lsx.tree) return;
    var t = _lsx.tree, f = _lsx.filter;
    
    var h = '<div class="lsx-sb-title">──── 💰 Lương Sản Xuất ────</div>';
    h += `<div class="lsx-sb-total" onclick="_lsxFilter()"><span>📦 Tất cả đơn</span><span>${_lsxFN(t.reduce((s, y) => s + y.total_salary, 0))}đ</span></div>`;
    h += '<div class="lsx-sb-tree">';

    t.forEach(function(yr) {
        var yo = !!_lsxOpen['y_' + yr.year];
        h += `<div class="lsx-sb-year" onclick="_lsxFilter(${yr.year})">`
            + `<span><span onclick="event.stopPropagation(); _lsxTgl('y_${yr.year}')" style="cursor:pointer; padding-right:6px; display:inline-block;">${yo ? '▼' : '▶'}</span>📆 Năm ${yr.year}</span>`
            + `<span style="background:linear-gradient(135deg,#0d9488,#14b8a6);color:#fff;padding:1px 7px;border-radius:10px;font-size:9px">${_lsxFN(yr.total_salary)}</span>`
            + `</div>`;
            
        if (yo && yr.depts) {
            yr.depts.forEach(function(dp) {
                var dk = `d_${yr.year}_${dp.dept}`;
                var do2 = !!_lsxOpen[dk];
                var dpActive = f.year == yr.year && f.dept == dp.dept && !f.worker_id && !f.contractor_id;
                
                var dName = dp.dept === 'cutting' ? '✂️ Cắt' : (dp.dept === 'pressing' ? '🔥 Ép' : '🧵 May');
                
                h += `<div class="lsx-sb-dept${dpActive ? ' active' : ''}" onclick="event.stopPropagation(); _lsxFilter(${yr.year}, '${dp.dept}')">`
                    + `<span><span onclick="event.stopPropagation(); _lsxTgl('${dk}')" style="cursor:pointer; padding-right:6px; display:inline-block;">${do2 ? '▼' : '▶'}</span>${dName}</span>`
                    + `<span>${_lsxFN(dp.total_salary)}</span>`
                    + `</div>`;
                    
                if (do2 && dp.workers) {
                    dp.workers.forEach(function(wk) {
                        var wkKey = `w_${yr.year}_${dp.dept}_${wk.id}_${wk.is_contractor}`;
                        var wActive = f.year == yr.year && f.dept == dp.dept && (wk.is_contractor ? f.contractor_id == wk.id : f.worker_id == wk.id);
                        var wo = !!_lsxOpen[wkKey];
                        
                        var wPrefix = wk.is_contractor ? '🏭 ' : (dp.dept === 'sewing' ? '👥 ' : '👤 ');
                        
                        h += `<div class="lsx-sb-worker${wActive ? ' active' : ''}" onclick="event.stopPropagation(); _lsxFilter(${yr.year}, '${dp.dept}', ${wk.is_contractor ? null : wk.id}, ${wk.is_contractor ? wk.id : null})">`
                            + `<span><span onclick="event.stopPropagation(); _lsxTgl('${wkKey}')" style="cursor:pointer; padding-right:6px; display:inline-block;">${wo ? '▼' : '▶'}</span>${wPrefix}${wk.name}</span>`
                            + `<span>${_lsxFN(wk.total_salary)}</span>`
                            + `</div>`;
                            
                        if (wo && wk.months) {
                            wk.months.forEach(function(mo) {
                                var mActive = f.year == yr.year && f.month == mo.month && f.dept == dp.dept && (wk.is_contractor ? f.contractor_id == wk.id : f.worker_id == wk.id);
                                h += `<div class="lsx-sb-month${mActive ? ' active' : ''}" onclick="event.stopPropagation(); _lsxFilter(${yr.year}, '${dp.dept}', ${wk.is_contractor ? null : wk.id}, ${wk.is_contractor ? wk.id : null}, ${mo.month})">`
                                    + `<span>🗓️ Tháng ${String(mo.month).padStart(2, '0')}</span>`
                                    + `<span>${_lsxFN(mo.total_salary)}</span>`
                                    + `</div>`;
                            });
                        }
                    });
                }
            });
        }
    });
    h += '</div>';
    sb.innerHTML = h;
}

function _lsxTgl(k) {
    _lsxOpen[k] = !_lsxOpen[k];
    _lsxRenderSb();
}

function _lsxFilter(yr, dept, workerId, contractorId, month) {
    _lsx.filter.year = yr || null;
    _lsx.filter.dept = dept || null;
    _lsx.filter.worker_id = workerId || null;
    _lsx.filter.contractor_id = contractorId || null;
    _lsx.filter.month = month || null;
    
    _lsxEnforceRestrictedFilter();
    
    _lsxRenderSb();
    _lsxLoadRecs();
}

function _lsxChangeStatus(st) {
    _lsx.filter.status = st || '';
    _lsxEnforceRestrictedFilter();
    _lsxLoadRecs();
}

function _lsxChangeYear(val) {
    _lsx.filter.year = val ? Number(val) : null;
    _lsxEnforceRestrictedFilter();
    _lsxRenderSb();
    _lsxLoadRecs();
}

function _lsxChangeMonth(val) {
    _lsx.filter.month = val ? Number(val) : null;
    _lsxEnforceRestrictedFilter();
    _lsxRenderSb();
    _lsxLoadRecs();
}

async function _lsxLoadRecs() {
    _lsxEnforceRestrictedFilter();
    var f = _lsx.filter;
    
    // Sync dropdown values
    var yEl = document.getElementById('lsxYearFilter');
    if (yEl) yEl.value = f.year || '';
    var mEl = document.getElementById('lsxMonthFilter');
    if (mEl) mEl.value = f.month || '';
    var sEl = document.getElementById('lsxStatusFilter');
    if (sEl) sEl.value = f.status || '';

    var qs = '?_=1';
    if (f.year) qs += '&year=' + f.year;
    if (f.month) qs += '&month=' + f.month;
    if (f.dept) qs += '&dept=' + f.dept;
    if (f.worker_id) qs += '&worker_id=' + f.worker_id;
    if (f.contractor_id) qs += '&contractor_id=' + f.contractor_id;
    if (f.status) qs += '&status=' + f.status;

    try {
        var res = await apiCall('/api/production-salary/records' + qs);
        _lsx.records = res.records || [];
        _lsxRenderTable();
    } catch(e) {
        console.error('[LSX]', e);
        showToast('Không thể tải danh sách bản ghi', 'error');
    }
}

function _lsxFD(d) {
    if (!d) return '—';
    try {
        var p = d.split('T')[0].split('-');
        return p[2] + '/' + p[1] + '/' + p[0];
    } catch(e) {
        return d;
    }
}

function _lsxFormatWorkDate(r) {
    if (!r.is_completed) return '—';
    if (!r.completion_time) return '—';
    try {
        var dObj = new Date(r.completion_time);
        var formatter = new Intl.DateTimeFormat('vi-VN', {
            timeZone: 'Asia/Ho_Chi_Minh',
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: '2-digit',
            hour12: false
        });
        var parts = formatter.formatToParts(dObj);
        var hour = '', minute = '', day = '', month = '';
        for (var i = 0; i < parts.length; i++) {
            if (parts[i].type === 'hour') hour = parts[i].value;
            else if (parts[i].type === 'minute') minute = parts[i].value;
            else if (parts[i].type === 'day') day = parts[i].value;
            else if (parts[i].type === 'month') month = parts[i].value;
        }
        return hour + ':' + minute + ' ' + day + '/' + month;
    } catch(e) {
        return '—';
    }
}

function _lsxFN(n) {
    if (!n && n !== 0) return '—';
    return Number(n).toLocaleString('vi-VN');
}

function _lsxGetContractorStyle(id) {
    if (!id) return 'background:#f4f4f5;color:#3f3f46;border:1px solid #e4e4e7';
    var palettes = [
        { bg: '#f3e8ff', text: '#7e22ce', border: '#d8b4fe' }, // Purple
        { bg: '#fffbeb', text: '#b45309', border: '#fde68a' }, // Amber
        { bg: '#ecfdf5', text: '#047857', border: '#a7f3d0' }, // Emerald
        { bg: '#fff1f2', text: '#be123c', border: '#ffe4e6' }, // Rose
        { bg: '#eef2ff', text: '#4338ca', border: '#e0e7ff' }, // Indigo
        { bg: '#fdf2f8', text: '#be185d', border: '#fce7f3' }, // Pink
        { bg: '#ecfeff', text: '#0e7490', border: '#cffafe' }, // Cyan
        { bg: '#fff7ed', text: '#c2410c', border: '#ffedd5' }, // Orange
        { bg: '#f0fdf4', text: '#166534', border: '#dcfce7' }, // Light green
        { bg: '#faf5ff', text: '#6b21a8', border: '#f3e8ff' }, // Violet
        { bg: '#f5f5f4', text: '#44403c', border: '#e7e5e4' }  // Stone
    ];
    var str = String(id);
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    var index = Math.abs(hash) % palettes.length;
    var p = palettes[index];
    return 'background:' + p.bg + ';color:' + p.text + ';border:1px solid ' + p.border;
}

function _lsxGetTeamStyle(id) {
    if (!id) return 'background:#fee2e2;color:#b91c1c;border:1px solid #fecaca';
    var palettes = [
        { bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe' }, // Blue
        { bg: '#fdf2f8', text: '#9d174d', border: '#fbcfe8' }, // Pink
        { bg: '#f5f3ff', text: '#5b21b6', border: '#ddd6fe' }, // Purple
        { bg: '#ecfdf5', text: '#065f46', border: '#a7f3d0' }, // Emerald
        { bg: '#fffbeb', text: '#92400e', border: '#fde68a' }, // Amber
        { bg: '#fff1f2', text: '#9f1239', border: '#fecdd3' }, // Rose
        { bg: '#f0fdf4', text: '#166534', border: '#bbf7d0' }, // Green
        { bg: '#faf5ff', text: '#6b21a8', border: '#e9d5ff' }, // Violet
        { bg: '#f0f9ff', text: '#0369a1', border: '#bae6fd' }, // Cyan
        { bg: '#fff7ed', text: '#9a3412', border: '#ffedd5' }  // Orange
    ];
    var str = 'team_' + id;
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    var index = Math.abs(hash) % palettes.length;
    var p = palettes[index];
    return 'background:' + p.bg + ';color:' + p.text + ';border:1px solid ' + p.border;
}

function _lsxGetHeaderHTML() {
    var showApproveAll = _lsx.is_manager && _lsx.records.some(function(r) { return !r.is_approved; });
    var btnStyle = showApproveAll ? 'inline-block' : 'none';
    
    if (_lsx.filter.dept === 'pressing') {
        var posHeaders = (window._bpePositions || []).map(function(pos) {
            return `<th style="text-align:center;background:#0d9488;cursor:help" title="${pos.display_name}" onclick="showToast('Vị trí: ' + this.title)">${pos.short_name || pos.display_name}</th>`;
        }).join('');

        return `
            <tr style="background:var(--gray-800)">
                <th style="width:50px">STT</th>
                <th>Ngày Làm</th>
                <th>Bộ Phận</th>
                <th>Nhân Viên</th>
                <th>Tên Sản Phẩm</th>
                <th style="text-align:center">SL Đơn</th>
                <th style="text-align:center">SL Ép</th>
                ${posHeaders}
                <th style="text-align:right">Thành Tiền (đ)</th>
                <th style="text-align:center">
                    Kiểm Tra
                    <br>
                    <button id="lsxBtnApproveAll" class="btn btn-xs" onclick="_lsxApproveAllVisible()" style="padding:2px 6px;font-size:9px;margin-top:2px;background:#0d9488;color:#fff;border:none;border-radius:4px;cursor:pointer;font-weight:800;display:${btnStyle};">Duyệt hết</button>
                </th>
                <th style="text-align:right;font-weight:bold;color:#fff">Cộng dồn (đ)</th>
                <th>Cập Nhật</th>
            </tr>
        `;
    }
    
    if (_lsx.filter.dept === 'sewing') {
        var isContractor = !!_lsx.filter.contractor_id;
        return `
            <tr style="background:var(--gray-800)">
                <th style="width:50px">STT</th>
                <th>Ngày May HT</th>
                <th>NV May</th>
                <th>Tên SP / Phối</th>
                <th style="text-align:center">SL (Đơn / May)</th>
                <th style="text-align:right">Giá (Gốc / KTra)</th>
                ${!isContractor ? '<th style="text-align:right">Giá ( CPM/ KTra )</th>' : ''}
                <th>May Thiếu</th>
                <th>Thiếu KT May</th>
                <th style="text-align:right">Lương Thợ</th>
                ${!isContractor ? '<th style="text-align:right">Lương CPM</th>' : ''}
                <th style="text-align:right;font-weight:bold;color:#fff">Cộng Dồn Thợ</th>
                ${!isContractor ? '<th style="text-align:right;font-weight:bold;color:#fff">Cộng Dồn CPM</th>' : ''}
                <th style="text-align:center">
                    Kiểm Tra
                    <br>
                    <button id="lsxBtnApproveAll" class="btn btn-xs" onclick="_lsxApproveAllVisible()" style="padding:2px 6px;font-size:9px;margin-top:2px;background:#0d9488;color:#fff;border:none;border-radius:4px;cursor:pointer;font-weight:800;display:${btnStyle};">Duyệt hết</button>
                </th>
                <th>Lịch Sử CN</th>
            </tr>
        `;
    }
    
    return `
        <tr style="background:var(--gray-800)">
            <th style="width:50px">STT</th>
            <th>Ngày Làm</th>
            <th>Bộ Phận</th>
            <th>Nhân Viên</th>
            <th>Mã Đơn</th>
            <th style="text-align:center">SL Đơn</th>
            <th style="text-align:center">SL Cắt</th>
            <th>Tên Sản Phẩm</th>
            <th style="text-align:right">Đơn Giá (đ)</th>
            <th style="text-align:right">Thành Tiền (đ)</th>
            <th style="text-align:center">
                Kiểm Tra
                <br>
                <button id="lsxBtnApproveAll" class="btn btn-xs" onclick="_lsxApproveAllVisible()" style="padding:2px 6px;font-size:9px;margin-top:2px;background:#0d9488;color:#fff;border:none;border-radius:4px;cursor:pointer;font-weight:800;display:${btnStyle};">Duyệt hết</button>
            </th>
            <th style="text-align:right;font-weight:bold;color:#fff">Cộng dồn (đ)</th>
            <th>Lịch Sử Cập Nhật</th>
        </tr>
    `;
}

function _lsxFormatPressingPos(qty, price) {
    if (!qty) return `<span style="color:#94a3b8;font-size:10px">—</span>`;
    if (!price || Number(price) === 0) {
        return `
            <div style="text-align:center;line-height:1.2">
                <span style="font-weight:700;color:#64748b">${qty}</span>
            </div>
        `;
    }
    var total = qty * price;
    return `
        <div style="text-align:center;line-height:1.2">
            <span style="font-weight:700;color:#1e293b">${qty}</span>
            <span style="color:#64748b;font-size:9px">x${price}</span>
            <div style="font-weight:800;color:#0d9488;font-size:9.5px">${Number(total).toLocaleString('vi-VN')}</div>
        </div>
    `;
}

function _lsxRenderTable() {
    var all = _lsx.records.slice();
    if (_lsx.search) {
        var q = _lsx.search.toLowerCase();
        all = all.filter(function(r) {
            return (r.product_name || '').toLowerCase().indexOf(q) >= 0 
                || (r.order_code || '').toLowerCase().indexOf(q) >= 0
                || (r.worker_name || '').toLowerCase().indexOf(q) >= 0;
        });
    }

    // Pre-calculate / override salary for sewing records so that all calculations (including cumulative sums) are correct
    all.forEach(function(r) {
        if (r.dept === 'sewing') {
            r.salary = (Number(r.quantity) || 0) * (Number(r.checked_price) || 0);

            // Compute Lương CPM
            var gcCheckedPrice = 0;
            if (!r.contractor_id) {
                var gcBasePrice = Number(r.sample_processing_price) || 0;
                try {
                    var orderTechs = typeof r.order_sewing_techniques === 'string' ? JSON.parse(r.order_sewing_techniques) : (r.order_sewing_techniques || []);
                    if (Array.isArray(orderTechs)) {
                        orderTechs.forEach(function(t) {
                            gcBasePrice += (Number(t.pp) || 0) * (Number(t.qty) || 1);
                        });
                    }
                } catch (e) {}

                var checkedIds = [];
                try {
                    checkedIds = typeof r.checked_techniques === 'string' ? JSON.parse(r.checked_techniques) : (r.checked_techniques || []);
                } catch (e) {}

                if (Array.isArray(checkedIds) && checkedIds.length > 0) {
                    var allTechs = [];
                    try {
                        var tsamTechs = typeof r.sample_sewing_tech === 'string' ? JSON.parse(r.sample_sewing_tech) : (r.sample_sewing_tech || []);
                        if (Array.isArray(tsamTechs)) allTechs = allTechs.concat(tsamTechs);
                    } catch (e) {}
                    try {
                        var orderTechs2 = typeof r.order_sewing_techniques === 'string' ? JSON.parse(r.order_sewing_techniques) : (r.order_sewing_techniques || []);
                        if (Array.isArray(orderTechs2)) allTechs = allTechs.concat(orderTechs2);
                    } catch (e) {}

                    var seenIds = new Set();
                    var matchedPP = 0;
                    allTechs.forEach(function(t) {
                        var tid = Number(t.id);
                        if (t && t.id && checkedIds.indexOf(tid) >= 0 && !seenIds.has(tid)) {
                            seenIds.add(tid);
                            matchedPP += (Number(t.pp) || 0) * (Number(t.qty) || 1);
                        }
                    });
                    gcCheckedPrice = matchedPP;
                } else {
                    gcCheckedPrice = gcBasePrice;
                }
            }
            r.cpm_salary = r.contractor_id ? 0 : (Number(r.quantity) || 0) * gcCheckedPrice;
            r.gc_checked_price = gcCheckedPrice;
        }
    });

    // Dynamically render the table header based on active department filter
    var tableEl = document.getElementById('lsxTable');
    if (tableEl) {
        var theadEl = tableEl.querySelector('thead');
        if (theadEl) {
            theadEl.innerHTML = _lsxGetHeaderHTML();
        }
    }

    var tb = document.getElementById('lsxTb');
    if (!tb) return;
    
    if (!all.length) {
        var colSpan = _lsx.filter.dept === 'pressing' ? (11 + (window._bpePositions || []).length) : (_lsx.filter.dept === 'sewing' ? (_lsx.filter.contractor_id ? 12 : 15) : 13);
        tb.innerHTML = '<tr><td colspan="' + colSpan + '"><div class="empty-state"><div class="icon">💰</div><h3>Không có bản ghi lương nào</h3></div></td></tr>';
        _lsxRenderInfo(0);
        return;
    }

    // Compute cumulative sum from bottom to top (chronological order)
    var cumulative = [];
    var cumulativeTho = [];
    var cumulativeCPM = [];
    var runningSum = 0;
    var runningSumTho = 0;
    var runningSumCPM = 0;
    for (var idx = all.length - 1; idx >= 0; idx--) {
        var r = all[idx];
        if (r.is_approved) {
            runningSum += Number(r.salary) || 0;
        }
        cumulative[idx] = runningSum;

        if (r.dept === 'sewing') {
            if (r.is_approved) {
                runningSumTho += Number(r.salary) || 0;
                runningSumCPM += Number(r.cpm_salary) || 0;
            }
            cumulativeTho[idx] = runningSumTho;
            cumulativeCPM[idx] = runningSumCPM;
        }
    }

    tb.innerHTML = all.map(function(r, i) {
        var deptBadge = '';
        if (r.dept === 'cutting') deptBadge = '<span class="lsx-badge cut">Cắt</span>';
        else if (r.dept === 'pressing') deptBadge = '<span class="lsx-badge press">Ép</span>';
        else if (r.dept === 'sewing') deptBadge = '<span class="lsx-badge sew">May</span>';

        var wPrefix = r.contractor_id ? '🏭 ' : (r.dept === 'sewing' ? '👥 ' : '👤 ');
        var workerName = r.contractor_id ? (r.contractor_name || 'Gia công') : (r.worker_name || '—');

        var isAppr = !!r.is_approved;
        var checkIcon = isAppr ? '💰' : '⬜';
        var checkCls = isAppr ? 'lsx-ib on-approved' : 'lsx-ib';
        var checkAction = _lsx.is_manager ? `onclick="_lsxToggleAppr(${r.id}, '${r.dept}')"` : 'disabled';

        var lastUpd = '—';
        if (r.last_update_at) {
            var timeStr = '';
            try {
                var dObj = new Date(r.last_update_at);
                timeStr = String(dObj.getHours()).padStart(2, '0') + ':' + String(dObj.getMinutes()).padStart(2, '0') + ' ' + String(dObj.getDate()).padStart(2,'0') + '/' + String(dObj.getMonth()+1).padStart(2,'0');
            } catch(e) {}
            lastUpd = `<span style="font-size:10px">${timeStr}</span>`;
            if (r.last_update_by) {
                lastUpd += `<br><span style="color:#0d9488;font-size:9.5px;font-weight:700">${r.last_update_by}</span>`;
            }
        }

        var priceCell = `<td style="text-align:right;font-weight:600">${_lsxFN(r.unit_price)}</td>`;
        var salCell = `<td style="text-align:right;font-weight:700;color:#f59e0b">${_lsxFN(r.salary)}</td>`;

        var orderQty = r.order_quantity !== undefined ? r.order_quantity : (r.quantity || 0);

        var codeCell = r.order_code || '—';
        if (r.dept === 'cutting' && r.id) {
            codeCell = `<span style="cursor:pointer; text-decoration:underline; color:#2563eb;" onclick="_lsxOpenCuttingDetail(${r.id})">${codeCell}</span>`;
        } else if (r.dept === 'pressing' && r.id) {
            codeCell = `<span style="cursor:pointer; text-decoration:underline; color:#2563eb;" onclick="_lsxOpenPressingDetail(${r.id})">${codeCell}</span>`;
        }
        if (r.cut_warning && r.cut_warning.indexOf('Cắt bù') >= 0) {
            codeCell = `<span class="lsx-badge cut" style="margin-right: 6px; background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; font-size: 9px; padding: 1px 4px; border-radius: 3px; text-transform: none;">Cắt bù</span>` + codeCell;
        }

        var displayName = r.product_name || '—';
        var match = displayName.match(/^(.*?\s*[-—]\s*Phiếu\s+\d+)/i);
        if (match) {
            displayName = match[1];
        }

        var isPhoi = false;
        if (r.dept === 'cutting' && r.product_name) {
            var match = r.product_name.match(/— P(\d+)/);
            if (match && parseInt(match[1]) > 1) isPhoi = true;
        }
        var qtyColor = isPhoi ? '#94a3b8' : '#64748b';
        var cutColor = isPhoi ? '#2dd4bf' : '#0d9488';

        if (_lsx.filter.dept === 'pressing') {
            return `<tr>`
                + `<td style="text-align:center;font-weight:700;color:#94a3b8">${i + 1}</td>`
                + `<td style="font-size:10px">${_lsxFormatWorkDate(r)}</td>`
                + `<td>${deptBadge}</td>`
                + `<td style="font-weight:600;color:#0f172a">${wPrefix}${workerName}</td>`
                + `<td style="font-weight:600;color:#334155;max-width:180px;overflow:hidden;text-overflow:ellipsis" title="${r.product_name || ''}"><span style="cursor:pointer; text-decoration:underline; color:#2563eb;" onclick="_lsxOpenPressingDetail(${r.id})">${displayName}</span></td>`
                + `<td style="text-align:center;font-weight:700;color:${qtyColor}">${_lsxFormatOrderQty(orderQty, r.product_name, r.cutting_category, r.dept)}</td>`
                + `<td style="text-align:center;font-weight:700;color:${cutColor}">${_lsxFormatOrderQty(r.quantity, r.product_name, r.cutting_category, r.dept)}</td>`
                + (window._bpePositions || []).map(function(pos) {
                    var qtyCol = pos.key_code;
                    var prcCol = qtyCol.startsWith('pos_') && !['pos_chest_arm', 'pos_back_belly', 'pos_protective', 'pos_packaging', 'pos_other'].includes(qtyCol)
                        ? 'price_' + qtyCol
                        : qtyCol.replace('pos_', 'price_');
                    var qty = r[qtyCol];
                    var price = r[prcCol];
                    return `<td style="background:#f0fdf4">${_lsxFormatPressingPos(qty, price)}</td>`;
                }).join('')
                + salCell
                + `<td style="text-align:center"><button class="${checkCls}" ${checkAction} title="Duyệt lương">${checkIcon}</button></td>`
                + `<td style="text-align:right;font-weight:800;color:#0f766e;background:#f0fdfa">${_lsxFN(cumulative[i])}</td>`
                + `<td style="font-size:9.5px;color:#64748b">${lastUpd}</td>`
                + `</tr>`;
        }

        if (_lsx.filter.dept === 'sewing') {
            var doneDateHtml = '—';
            if (r.done_date) {
                doneDateHtml = `<span style="padding:4px 8px;background:#f0fdf4;color:#166534;border:1px solid #bbf7d0;border-radius:6px;font-size:10.5px;font-weight:800;display:inline-block;white-space:nowrap">${_lsxFormatDoneDate(r.done_date)}</span>`;
            }

            var nvMayHtml = '—';
            if (r.contractor_id) {
                var contractorLabel = r.contractor_name ? '🏭 ' + r.contractor_name : '🏭 Gia công';
                var contractorColor = _lsxGetContractorStyle(r.contractor_id);
                nvMayHtml = `<span class="badge" style="${contractorColor};padding:4px 8px;border-radius:6px;font-weight:800">${contractorLabel}</span>`;
            } else {
                var badgeColor = _lsxGetTeamStyle(r.worker_id);
                var teamLabel = r.worker_name ? r.worker_name : '❌ Chưa Phân Tổ';
                teamLabel = teamLabel.replace('Team May', 'TM');
                nvMayHtml = `<span class="badge" style="${badgeColor};padding:4px 8px;border-radius:6px;font-weight:800">${teamLabel}</span>`;
            }

            var priority = (r.shipping_priority || 'CHUẨN').toUpperCase();
            var priBadge = '';
            if (priority === 'GẤP') {
                priBadge = '<span style="margin-right: 6px; background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; font-size: 9px; padding: 1px 4px; border-radius: 3px; font-weight: bold; display: inline-block; vertical-align: middle;">Gấp</span>';
            } else if (priority === 'GỬI') {
                priBadge = '<span style="margin-right: 6px; background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; font-size: 9px; padding: 1px 4px; border-radius: 3px; font-weight: bold; display: inline-block; vertical-align: middle;">Gửi</span>';
            }
            var dispName = _lsxDisplayProdName(r);
            var prodPhieuHtml = `<span style="font-weight:600;color:#1e293b">${priBadge}${dispName}</span>`;

            var cskhHtml = `<span style="font-size:10px;color:#475569;font-weight:600">${r.cskh_name || '—'}</span>`;
            var slText = '<span style="color:#2563eb;font-weight:700" title="SL Thực Tế">' + (r.order_quantity || r.quantity) + '</span> / <span style="color:#0d9488;font-weight:700" title="SL May">' + _lsxFormatOrderQty(r.quantity, r.product_name, r.cutting_category, 'sewing') + '</span>';

            var priceText = '<span style="color:#475569" title="Giá Gốc">' + _lsxFN(r.base_price) + '</span> / <span style="color:#dc2626;font-weight:700" title="Giá KTra">' + _lsxFN(r.checked_price) + '</span>';

            var gcCheckedPrice = 0;
            var gcPriceHtml = '<span style="color:#94a3b8">—</span>';
            if (!r.contractor_id) {
                var gcBasePrice = Number(r.sample_processing_price) || 0;
                try {
                    var orderTechs = typeof r.order_sewing_techniques === 'string' ? JSON.parse(r.order_sewing_techniques) : (r.order_sewing_techniques || []);
                    if (Array.isArray(orderTechs)) {
                        orderTechs.forEach(function(t) {
                            gcBasePrice += (Number(t.pp) || 0) * (Number(t.qty) || 1);
                        });
                    }
                } catch (e) {}

                gcCheckedPrice = 0;
                var checkedIds = [];
                try {
                    checkedIds = typeof r.checked_techniques === 'string' ? JSON.parse(r.checked_techniques) : (r.checked_techniques || []);
                } catch (e) {}

                if (Array.isArray(checkedIds) && checkedIds.length > 0) {
                    var allTechs = [];
                    try {
                        var tsamTechs = typeof r.sample_sewing_tech === 'string' ? JSON.parse(r.sample_sewing_tech) : (r.sample_sewing_tech || []);
                        if (Array.isArray(tsamTechs)) allTechs = allTechs.concat(tsamTechs);
                    } catch (e) {}
                    try {
                        var orderTechs = typeof r.order_sewing_techniques === 'string' ? JSON.parse(r.order_sewing_techniques) : (r.order_sewing_techniques || []);
                        if (Array.isArray(orderTechs)) allTechs = allTechs.concat(orderTechs);
                    } catch (e) {}

                    var seenIds = new Set();
                    var matchedPP = 0;
                    allTechs.forEach(function(t) {
                        var tid = Number(t.id);
                        if (t && t.id && checkedIds.indexOf(tid) >= 0 && !seenIds.has(tid)) {
                            seenIds.add(tid);
                            matchedPP += (Number(t.pp) || 0) * (Number(t.qty) || 1);
                        }
                    });
                    gcCheckedPrice = matchedPP;
                } else {
                    gcCheckedPrice = gcBasePrice;
                }

                gcPriceHtml = '<span style="color:#475569" title="Giá Gia Công Gốc">' + _lsxFN(gcBasePrice) + '</span> / <span style="color:#2563eb;font-weight:700" title="Giá Gia Công KTra">' + _lsxFN(gcCheckedPrice) + '</span>';
            }

            var missingHtml = '—';
            var hasNotes = r.qc_missing_notes && r.qc_missing_notes !== '—';
            var images = [];
            try {
                images = JSON.parse(r.qc_evidence_images || '[]');
            } catch (e) {}
            var hasImages = images && images.length > 0;

            if (hasNotes || hasImages) {
                var parts = [];
                if (hasNotes) {
                    var noteText = r.qc_missing_notes;
                    if (noteText.toLowerCase().startsWith('may thiếu:')) {
                        noteText = noteText.substring('may thiếu:'.length).trim();
                    }
                    parts.push(`<div style="font-size:10px;color:#ef4444;font-weight:600">${noteText}</div>`);
                }
                if (hasImages) {
                    var imgHtmls = images.map(function(src) {
                        return `<img src="${src}" style="width:32px;height:32px;object-fit:cover;border-radius:4px;margin-right:2px;cursor:pointer;border:1px solid #cbd5e1" onclick="_lsxViewImage('${src}')" title="Xem ảnh đầy đủ">`;
                    }).join('');
                    parts.push(`<div style="margin-top:4px;line-height:0">${imgHtmls}</div>`);
                }
                missingHtml = parts.join('');
            }

            var thieuKyThuatHtml = '—';
            if (r.notes && r.notes.startsWith('[THIẾU GIÁ CHI TIẾT]')) {
                var detailStr = r.notes.replace('[THIẾU GIÁ CHI TIẾT]', '').trim();
                var words = (detailStr || '').split(/\s+/);
                var chunked = [];
                for (var wIdx = 0; wIdx < words.length; wIdx += 3) {
                    chunked.push(words.slice(wIdx, wIdx + 3).join(' '));
                }
                var formattedStr = chunked.join('<br>');
                thieuKyThuatHtml = `<div style="font-size:10.5px;font-weight:600;line-height:1.3">${formattedStr || 'Thiếu KT'}</div>`;
            }

            var salCell = `<td style="text-align:right;font-weight:700;color:#1e293b">${r.is_approved ? _lsxFN(r.salary) : '—'}</td>`;

            var cpmSalCell = '<td style="text-align:right;font-size:11px;color:#94a3b8">—</td>';
            if (!r.contractor_id) {
                cpmSalCell = `<td style="text-align:right;font-weight:700;color:#2563eb">${r.is_approved ? _lsxFN(r.cpm_salary) : '—'}</td>`;
            }

            var cumThoCell = `<td style="text-align:right;font-weight:800;color:#d97706;background:#fffbeb">${r.is_approved ? _lsxFN(cumulativeTho[i]) : '—'}</td>`;
            var cumCPMCell = `<td style="text-align:right;font-weight:800;color:#1d4ed8;background:#eff6ff">${r.is_approved ? _lsxFN(cumulativeCPM[i]) : '—'}</td>`;

            var isContractor = !!_lsx.filter.contractor_id;
            return `<tr>`
                + `<td style="text-align:center;font-weight:700;color:#94a3b8">${i + 1}</td>`
                + `<td style="font-size:10px;text-align:center;color:#94a3b8">—</td>`
                + `<td>${nvMayHtml}</td>`
                + `<td style="max-width:180px;overflow:hidden;text-overflow:ellipsis" title="${r.product_name || ''}">${prodPhieuHtml}</td>`
                + `<td style="text-align:center;font-size:11px">${slText}</td>`
                + `<td style="text-align:right;font-size:11px">${priceText}</td>`
                + (!isContractor ? `<td style="text-align:right;font-size:11px">${gcPriceHtml}</td>` : '')
                + `<td>${missingHtml}</td>`
                + `<td style="text-align:center">${thieuKyThuatHtml}</td>`
                + salCell
                + (!isContractor ? cpmSalCell : '')
                + cumThoCell
                + (!isContractor ? cumCPMCell : '')
                + `<td style="text-align:center"><button class="${checkCls}" ${checkAction} title="Duyệt lương">${checkIcon}</button></td>`
                + `<td style="font-size:9.5px;color:#64748b">${lastUpd}</td>`
                + `</tr>`;
        }

        var prodCell = displayName;
        if (r.dept === 'pressing' && r.id) {
            prodCell = `<span style="cursor:pointer; text-decoration:underline; color:#2563eb;" onclick="_lsxOpenPressingDetail(${r.id})">${displayName}</span>`;
        }

        return `<tr>`
            + `<td style="text-align:center;font-weight:700;color:#94a3b8">${i + 1}</td>`
            + `<td style="font-size:10px">${_lsxFormatWorkDate(r)}</td>`
            + `<td>${deptBadge}</td>`
            + `<td style="font-weight:600;color:#0f172a">${wPrefix}${workerName}</td>`
            + `<td style="font-weight:700;color:#1e3a8a">${codeCell}</td>`
            + `<td style="text-align:center;font-weight:700;color:${qtyColor}">${_lsxFormatOrderQty(orderQty, r.product_name, r.cutting_category, r.dept)}</td>`
            + `<td style="text-align:center;font-weight:700;color:${cutColor}">${_lsxFormatOrderQty(r.quantity, r.product_name, r.cutting_category, r.dept)}</td>`
            + `<td style="font-weight:600;color:#334155;max-width:180px;overflow:hidden;text-overflow:ellipsis" title="${r.product_name || ''}">${prodCell}</td>`
            + priceCell
            + salCell
            + `<td style="text-align:center"><button class="${checkCls}" ${checkAction} title="Duyệt lương">${checkIcon}</button></td>`
            + `<td style="text-align:right;font-weight:800;color:#0f766e;background:#f0fdfa">${r.is_approved ? _lsxFN(cumulative[i]) : '—'}</td>`
            + `<td style="font-size:9.5px;color:#64748b">${lastUpd}</td>`
            + `</tr>`;
    }).join('');

    // Show/hide bulk approve button
    var showApproveAll = _lsx.is_manager && all.some(function(r) { return !r.is_approved; });
    var btnApproveAll = document.getElementById('lsxBtnApproveAll');
    if (btnApproveAll) {
        btnApproveAll.style.display = showApproveAll ? 'inline-block' : 'none';
    }

    _lsxRenderInfo(all.length);
}

function _lsxRenderInfo(count) {
    var el = document.getElementById('lsxInfo');
    if (!el) return;
    
    var parts = ['💰 Lương Sản Xuất'];
    var f = _lsx.filter;
    if (f.year) parts.push(`📆 ${f.year}`);
    if (f.month) parts.push(`🗓️ T${f.month}`);
    if (f.dept) {
        var dName = f.dept === 'cutting' ? 'Cắt' : (f.dept === 'pressing' ? 'Ép' : 'May');
        parts.push(`Bộ phận: ${dName}`);
    }
    
    el.innerHTML = `<div style="display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,#0d9488,#14b8a6);color:#fff;padding:6px 18px;border-radius:8px;font-size:13px;font-weight:700">`
        + `${parts.join(' <span style="opacity:0.5;margin:0 6px">•</span> ')} — <span style="color:#99f6e4;font-weight:900">${count}</span> bản ghi`
        + `</div>`;
}

async function _lsxToggleAppr(id, dept) {
    try {
        var res = await apiCall(`/api/production-salary/toggle/${dept}/${id}`, 'POST');
        showToast('Cập nhật trạng thái duyệt thành công');
        // Reload all to refresh aggregates & tree sums
        await _lsxLoadAll();
    } catch(e) {
        console.error(e);
        showToast(e.message || 'Lỗi khi cập nhật trạng thái', 'error');
    }
}

function _lsxStartEdit(id, dept, field, currentVal, cell) {
    // Check if there is already an active input
    if (cell.querySelector('input')) return;

    var input = document.createElement('input');
    input.type = 'number';
    input.className = 'lsx-edit-input';
    input.value = currentVal;
    
    cell.innerHTML = '';
    cell.appendChild(input);
    input.focus();
    input.select();

    var finished = false;
    async function commitEdit() {
        if (finished) return;
        finished = true;
        
        var newVal = Number(input.value) || 0;
        if (newVal === currentVal) {
            cell.innerHTML = _lsxFN(currentVal);
            return;
        }

        try {
            var body = {};
            body[field] = newVal;
            
            var res = await apiCall(`/api/production-salary/record/${dept}/${id}`, 'PUT', body);
            showToast('Đã lưu thay đổi');
            await _lsxLoadAll();
        } catch(e) {
            console.error(e);
            showToast(e.message || 'Lỗi khi lưu dữ liệu', 'error');
            cell.innerHTML = _lsxFN(currentVal);
        }
    }

    input.onblur = commitEdit;
    input.onkeydown = function(e) {
        if (e.key === 'Enter') {
            input.blur();
        } else if (e.key === 'Escape') {
            finished = true;
            cell.innerHTML = _lsxFN(currentVal);
        }
    };
}

function _lsxChangeYear(val) {
    _lsx.filter.year = val ? Number(val) : null;
    _lsxRenderSb();
    _lsxLoadRecs();
}

function _lsxChangeMonth(val) {
    _lsx.filter.month = val ? Number(val) : null;
    _lsxRenderSb();
    _lsxLoadRecs();
}

async function _lsxApproveAllVisible() {
    var unapproved = _lsx.records.slice();
    if (_lsx.search) {
        var q = _lsx.search.toLowerCase();
        unapproved = unapproved.filter(function(r) {
            return (r.product_name || '').toLowerCase().indexOf(q) >= 0 
                || (r.order_code || '').toLowerCase().indexOf(q) >= 0
                || (r.worker_name || '').toLowerCase().indexOf(q) >= 0;
        });
    }
    unapproved = unapproved.filter(function(r) { return !r.is_approved; });

    if (!unapproved.length) {
        showToast('Không có bản ghi nào cần duyệt', 'info');
        return;
    }

    if (!confirm('Bạn có chắc chắn muốn duyệt tất cả ' + unapproved.length + ' bản ghi đang hiển thị?')) {
        return;
    }

    try {
        var payload = {
            records: unapproved.map(function(r) {
                return { id: r.id, dept: r.dept };
            })
        };
        await apiCall('/api/production-salary/approve-bulk', 'POST', payload);
        showToast('Đã duyệt thành công ' + unapproved.length + ' bản ghi');
        await _lsxLoadAll();
    } catch(e) {
        console.error(e);
        showToast(e.message || 'Lỗi khi duyệt hàng loạt', 'error');
    }
}

function _lsxFormatOrderQty(qty, prodName, category, dept) {
    if (!qty && qty !== 0) return '0';
    if (dept === 'cutting' || dept === 'sewing') {
        var isPhoi = false;
        if (prodName) {
            var match = prodName.match(/— P(\d+)/);
            if (match && parseInt(match[1]) > 1) isPhoi = true;
        }
        if (isPhoi) {
            return qty.toLocaleString('vi-VN') + ' Phối';
        } else {
            var catName = category || 'Áo';
            return qty.toLocaleString('vi-VN') + ' ' + catName;
        }
    }
    return qty.toLocaleString('vi-VN');
}

function _lsxProgress(exp, done) {
    if (!exp) return '<span class="bpm-progress" style="background:#f1f5f9;color:#94a3b8;padding:2px 8px;border-radius:10px;font-size:9.5px;font-weight:800;display:inline-block">—</span>';
    try {
        var expD = _lsxGetDatePart(exp);
        if (!expD) return '<span class="bpm-progress" style="background:#f1f5f9;color:#94a3b8;padding:2px 8px;border-radius:10px;font-size:9.5px;font-weight:800;display:inline-block">—</span>';
        
        if (done) {
            var doneD = _lsxGetDatePart(done);
            if (!doneD) return '<span class="bpm-progress" style="background:#f1f5f9;color:#94a3b8;padding:2px 8px;border-radius:10px;font-size:9.5px;font-weight:800;display:inline-block">—</span>';
            
            var diff = Math.round((doneD - expD) / 86400000);
            if (diff < 0) {
                return '<span class="bpm-progress" style="background:#d1fae5;color:#059669;padding:2px 8px;border-radius:10px;font-size:9.5px;font-weight:800;display:inline-block">⚡ Nhanh ' + Math.abs(diff) + ' ngày</span>';
            }
            if (diff === 0) {
                return '<span class="bpm-progress" style="background:#dbeafe;color:#2563eb;padding:2px 8px;border-radius:10px;font-size:9.5px;font-weight:800;display:inline-block">✅ Ra kịp hàng</span>';
            }
            return '<span class="bpm-progress" style="background:#fee2e2;color:#dc2626;padding:2px 8px;border-radius:10px;font-size:9.5px;font-weight:800;display:inline-block">🔴 Chậm ' + diff + ' ngày</span>';
        }
        
        var today = _lsxGetDatePart();
        var diff2 = Math.round((expD - today) / 86400000);
        if (diff2 > 0) {
            return '<span class="bpm-progress" style="background:#dbeafe;color:#2563eb;padding:2px 8px;border-radius:10px;font-size:9.5px;font-weight:800;display:inline-block">⏳ Còn ' + diff2 + ' ngày</span>';
        }
        if (diff2 === 0) {
            return '<span class="bpm-progress" style="background:#fef3c7;color:#d97706;padding:2px 8px;border-radius:10px;font-size:9.5px;font-weight:800;display:inline-block">⏳ Ra kịp hàng</span>';
        }
        return '<span class="bpm-progress" style="background:#fee2e2;color:#dc2626;padding:2px 8px;border-radius:10px;font-size:9.5px;font-weight:800;display:inline-block">🔥 Chậm ' + Math.abs(diff2) + ' ngày</span>';
    } catch (e) {
        return '<span class="bpm-progress" style="background:#f1f5f9;color:#94a3b8;padding:2px 8px;border-radius:10px;font-size:9.5px;font-weight:800;display:inline-block">—</span>';
    }
}

function _lsxGetDatePart(d) {
    try {
        var dateStr = '';
        if (typeof vnISOStr === 'function') {
            dateStr = vnISOStr(d).split('T')[0];
        } else {
            var dateObj = d ? new Date(d) : new Date();
            dateStr = dateObj.toISOString().split('T')[0];
        }
        var parts = dateStr.split('-');
        return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 0, 0, 0, 0);
    } catch(e) {
        return null;
    }
}

function _lsxFormatDoneDate(d) {
    if (!d) return '—';
    try {
        var dObj = new Date(d);
        var formatter = new Intl.DateTimeFormat('vi-VN', {
            timeZone: 'Asia/Ho_Chi_Minh',
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: '2-digit',
            hour12: false
        });
        var parts = formatter.formatToParts(dObj);
        var hour = '', minute = '', day = '', month = '';
        for (var i = 0; i < parts.length; i++) {
            if (parts[i].type === 'hour') hour = parts[i].value;
            else if (parts[i].type === 'minute') minute = parts[i].value;
            else if (parts[i].type === 'day') day = parts[i].value;
            else if (parts[i].type === 'month') month = parts[i].value;
        }
        return hour + ':' + minute + ' ' + day + '/' + month;
    } catch(e) {
        return '—';
    }
}

function _lsxDisplayProdName(r) {
    if (!r) return '—';
    var name = r.cut_product_name || r.product_name || r.order_code || '—';
    return name.replace(/\s*—\s*P\d+\s*(—|$)/gi, function(match, p1) {
        return p1 === '—' ? ' — ' : '';
    }).trim();
}

function _lsxViewImage(src) {
    var overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.backgroundColor = 'rgba(0,0,0,0.85)';
    overlay.style.zIndex = '999999';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.cursor = 'zoom-out';

    var img = document.createElement('img');
    img.src = src;
    img.style.maxWidth = '90%';
    img.style.maxHeight = '90%';
    img.style.objectFit = 'contain';
    img.style.borderRadius = '8px';
    img.style.boxShadow = '0 10px 25px rgba(0,0,0,0.5)';
    img.style.cursor = 'default';

    var closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.style.position = 'absolute';
    closeBtn.style.top = '20px';
    closeBtn.style.right = '20px';
    closeBtn.style.background = 'rgba(255,255,255,0.2)';
    closeBtn.style.color = '#fff';
    closeBtn.style.border = 'none';
    closeBtn.style.borderRadius = '50%';
    closeBtn.style.width = '44px';
    closeBtn.style.height = '44px';
    closeBtn.style.fontSize = '30px';
    closeBtn.style.fontWeight = 'bold';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.display = 'flex';
    closeBtn.style.alignItems = 'center';
    closeBtn.style.justifyContent = 'center';
    closeBtn.style.lineHeight = '1';
    closeBtn.style.transition = 'background 0.2s';
    closeBtn.onmouseenter = function() { closeBtn.style.background = 'rgba(255,255,255,0.4)'; };
    closeBtn.onmouseleave = function() { closeBtn.style.background = 'rgba(255,255,255,0.2)'; };

    overlay.appendChild(img);
    overlay.appendChild(closeBtn);

    overlay.onclick = function() {
        overlay.remove();
    };
    img.onclick = function(e) {
        e.stopPropagation();
    };
    closeBtn.onclick = function(e) {
        e.stopPropagation();
        overlay.remove();
    };

    document.body.appendChild(overlay);
}

// ========== DETAIL MODAL: Xem chi tiết đơn cắt từ Lương Sản Xuất ==========
async function _lsxOpenCuttingDetail(recordId) {
    if (window._lsxDetailBusy) return;
    window._lsxDetailBusy = true;
    try {
        var res = await apiCall('/api/cutting/records/' + recordId);
        var r = res.record;
        if (!r) return;
        var rolls = [];
        try { rolls = typeof r.selected_roll_ids === 'string' ? JSON.parse(r.selected_roll_ids) : (r.selected_roll_ids || []); } catch(e) {}
        var statusTxt = r.is_cut_done ? '✅ Đã cắt xong' : r.is_cutting ? '✂️ Đang cắt' : '📋 Chờ cắt';
        var statusBg = r.is_cut_done ? '#059669' : r.is_cutting ? '#dc2626' : '#6366f1';
        var h = '<div class="bpc-modal-overlay" id="_lsxDetailModal" onclick="if(event.target===this)this.classList.remove(\'show\'),setTimeout(function(){document.getElementById(\'_lsxDetailModal\').remove()},300)">';
        h += '<div class="bpc-modal" style="width:540px">';
        h += '<div class="bpc-modal-header" style="background:linear-gradient(135deg,'+statusBg+','+statusBg+'cc)"><div class="m-icon">📋</div><div><div class="m-title">CHI TIẾT ĐƠN CẮT</div><div class="m-sub">' + statusTxt + '</div></div></div>';
        h += '<div class="bpc-modal-body" style="max-height:65vh;overflow-y:auto">';
        // Order info
        h += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">📋 Tên SP</span><span class="bpc-modal-val" style="font-size:12px">' + (r.product_name||r.order_code||'—') + '</span></div>';
        h += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">🧵 Chất liệu</span><span class="bpc-modal-val"><span style="background:#fef3c7;color:#92400e;padding:2px 10px;border-radius:6px;font-size:12px;font-weight:700">' + (r.material_name||'—') + '</span></span></div>';
        h += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">🎨 Màu</span><span class="bpc-modal-val"><span style="background:#1e293b;color:#fff;padding:2px 10px;border-radius:6px;font-size:12px;font-weight:700">' + (r.fabric_color||'—') + '</span></span></div>';
        h += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">🏷️ Sản Phẩm Cắt</span><span class="bpc-modal-val"><span style="background:#dbeafe;color:#1d4ed8;padding:2px 10px;border-radius:6px;font-size:12px;font-weight:700">' + (r.cutting_category||'—') + '</span></span></div>';
        h += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">👤 NV Cắt</span><span class="bpc-modal-val" style="color:#059669">' + (r.cutter_name||'—') + '</span></div>';
        h += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">📅 Ngày cắt</span><span class="bpc-modal-val">' + (r.cut_date ? _lsxDetailFmtDate(r.cut_date) : '—') + '</span></div>';
        h += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">📦 SL Đơn</span><span class="bpc-modal-val" style="color:#0369a1;font-size:15px">' + _lsxDetailFormatOrderQty(r.order_quantity, r.product_name, r.cutting_category) + '</span></div>';

        // Wash reported details
        if (r.wash_reported) {
            h += '<div style="border-top:2px solid #e2e8f0;margin:12px 0;padding-top:12px">';
            h += '<div style="font-size:11px;font-weight:800;color:#6366f1;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">🫧 CHI TIẾT GIẶT VẢI</div>';
            var washTimeStr = r.wash_reported_at ? (typeof vnFormat === 'function' ? vnFormat(r.wash_reported_at) : _lsxDetailFmtDate(r.wash_reported_at)) : '—';
            h += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">📅 Thời gian báo giặt</span><span class="bpc-modal-val">' + washTimeStr + '</span></div>';
            h += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">👤 Người báo giặt</span><span class="bpc-modal-val" style="color:#6366f1">' + (r.wash_reported_by_name || '—') + '</span></div>';
            
            var washItems = [];
            try { washItems = typeof r.wash_items === 'string' ? JSON.parse(r.wash_items) : (r.wash_items || []); } catch(e) {}
            if (Array.isArray(washItems) && washItems.length > 0) {
                h += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">👕 Bộ phận cần giặt</span><span class="bpc-modal-val">';
                washItems.forEach(function(item) {
                    h += '<span style="background:#e0e7ff;color:#4338ca;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;margin-left:4px;display:inline-block">' + item + '</span>';
                });
                h += '</span></div>';
            }
            h += '</div>';
        }

        // Error reported details
        if (r.error_reported) {
            h += '<div style="border-top:2px solid #e2e8f0;margin:12px 0;padding-top:12px">';
            h += '<div style="font-size:11px;font-weight:800;color:#dc2626;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">🚨 CHI TIẾT BÁO LỖI</div>';
            var errDateStr = r.error_reported_at ? (typeof vnFormat === 'function' ? vnFormat(r.error_reported_at) : _lsxDetailFmtDate(r.error_reported_at)) : (r.error_report_date ? _lsxDetailFmtDate(r.error_report_date) : '—');
            h += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">📅 Thời gian báo lỗi</span><span class="bpc-modal-val">' + errDateStr + '</span></div>';
            h += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">👤 Người báo lỗi</span><span class="bpc-modal-val" style="color:#dc2626">' + (r.error_reporter_name || '—') + '</span></div>';
            if (r.error_common_type) {
                h += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">⚠️ Loại lỗi</span><span class="bpc-modal-val" style="color:#d97706">' + r.error_common_type + '</span></div>';
            }
            h += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">📦 Số lượng lỗi</span><span class="bpc-modal-val" style="color:#dc2626;font-weight:800">' + (r.error_quantity_reported || 0) + ' sp</span></div>';
            h += '<div style="margin-top:6px;padding:8px 12px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;font-size:12px">';
            h += '<span style="font-weight:700;color:#991b1b">📝 Nội dung lỗi:</span>';
            h += '<div style="white-space:pre-wrap;color:#374151;margin-top:4px;font-weight:500;text-align:left">' + (r.error_content_reported || '—') + '</div>';
            h += '</div>';

            var errImages = [];
            try { errImages = typeof r.error_images_json === 'string' ? JSON.parse(r.error_images_json) : (r.error_images_json || []); } catch(e) {}
            if (Array.isArray(errImages) && errImages.length > 0) {
                h += '<div style="margin-top:8px;">';
                h += '<div style="font-size:10px;font-weight:700;color:#64748b;margin-bottom:4px;text-align:left">📷 Hình ảnh lỗi:</div>';
                h += '<div style="display:flex;flex-wrap:wrap;gap:8px">';
                errImages.forEach(function(imgUrl) {
                    h += '<img src="' + imgUrl + '" style="width:80px;height:80px;object-fit:cover;border-radius:6px;border:1px solid #e2e8f0;cursor:pointer" onclick="window.open(\'' + imgUrl + '\',\'_blank\')">';
                });
                h += '</div>';
                h += '</div>';
            }
            h += '</div>';
        }
        // Selected rolls
        h += '<div style="border-top:2px solid #e2e8f0;margin:12px 0;padding-top:12px"><div style="font-size:11px;font-weight:800;color:#059669;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">📦 CÂY VẢI ĐÃ CHỌN (' + rolls.length + ')</div>';
        if (rolls.length) {
            rolls.forEach(function(rl, idx) {
                h += '<div style="padding:8px 14px;border:1.5px solid #f1f5f9;border-radius:10px;margin-bottom:6px;font-size:13px;font-weight:600;color:#1e293b">' + (rl.label || rl.roll_code || 'Cây '+(idx+1)) + '</div>';
            });
        } else {
            h += '<div style="text-align:center;padding:12px;color:#94a3b8;font-size:12px">Chưa có dữ liệu cây vải</div>';
        }
        h += '</div>';
        // Kg stats
        h += '<div style="border-top:2px solid #e2e8f0;margin:12px 0;padding-top:12px">';
        h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">';
        h += '<div style="background:#fef3c7;padding:10px;border-radius:10px;text-align:center"><div style="font-size:9px;font-weight:700;color:#92400e">⚖️ KG ĐẦU</div><div style="font-size:18px;font-weight:900;color:#b45309">' + _lsxDetailFmtKg(r.kg_start) + '</div></div>';
        h += '<div style="background:#fee2e2;padding:10px;border-radius:10px;text-align:center"><div style="font-size:9px;font-weight:700;color:#991b1b">⚖️ KG CUỐI</div><div style="font-size:18px;font-weight:900;color:#dc2626">' + _lsxDetailFmtKg(r.kg_end) + '</div></div>';
        h += '<div style="background:#dcfce7;padding:10px;border-radius:10px;text-align:center"><div style="font-size:9px;font-weight:700;color:#166534">✂️ KG CẮT</div><div style="font-size:18px;font-weight:900;color:#059669">' + _lsxDetailFmtKg(r.kg_cut) + '</div></div>';
        h += '<div style="background:#dbeafe;padding:10px;border-radius:10px;text-align:center"><div style="font-size:9px;font-weight:700;color:#1e40af">📦 SL CẮT</div><div style="font-size:18px;font-weight:900;color:#2563eb">' + (r.cut_quantity||'—') + '</div></div>';
        h += '</div></div>';
        // Ratio
        if (r.cut_ratio) {
            var rc = '#3b82f6';
            var tr = Number(r.target_cut_ratio) || 0;
            if (tr > 0) {
                rc = Number(r.cut_ratio) >= tr ? '#059669' : '#dc2626';
            }
            h += '<div style="border-top:2px solid #e2e8f0;margin:12px 0;padding-top:12px">';
            h += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">📊 Định Lượng Thực Tế</span><span class="bpc-modal-val" style="color:'+rc+';font-size:18px">' + r.cut_ratio + ' sp/' + (r.fabric_unit || 'kg') + '</span></div>';
            if (tr > 0) {
                h += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">⚖️ Định Lượng Cắt Yêu Cầu</span><span class="bpc-modal-val" style="color:#059669;font-weight:700">' + tr + ' sp/' + (r.fabric_unit || 'kg') + '</span></div>';
            }
            if (r.ratio_reason) h += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">📝 Lý do sai định lượng :</span><span class="bpc-modal-val" style="font-size:11px;color:#64748b;white-space:pre-wrap">' + r.ratio_reason + '</span></div>';
            if (r.has_ratio_image) {
                h += '<div id="_lsxRatioImgContainer" style="margin-top: 10px; border-top: 1px dashed #e2e8f0; padding-top: 10px;">';
                h += '<div style="font-size:11px;font-weight:800;color:#94a3b8;margin-bottom:6px">🖼️ HÌNH ẢNH CHỨNG MINH SAI:</div>';
                h += '<div style="text-align:center;color:#94a3b8;font-size:12px;padding:20px" class="bpc-img-placeholder">⏳ Đang tải ảnh chứng minh sai...</div>';
                h += '</div>';
            }
            h += '</div>';
        }
        // Warning + shared
        if (r.cut_warning) h += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">⚠️ Cảnh Báo</span><span class="bpc-modal-val" style="color:#dc2626">' + r.cut_warning + '</span></div>';
        if (r.cut_shared) h += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">🔄 Cắt Chung</span><span class="bpc-modal-val" style="color:#6366f1;white-space:pre-line;line-height:1.5;font-size:10px">' + r.cut_shared + '</span></div>';
        h += '</div>';
        // Close button
        h += '<div style="padding:12px 24px;border-top:1px solid #f1f5f9;text-align:center"><button class="bpc-modal-btn cancel" style="width:100%" onclick="var m=document.getElementById(\'_lsxDetailModal\');if(m){m.classList.remove(\'show\');setTimeout(function(){m.remove()},300)}">Đóng</button></div>';
        h += '</div></div>';
        document.body.insertAdjacentHTML('beforeend', h);
        requestAnimationFrame(function() { document.getElementById('_lsxDetailModal').classList.add('show'); });

        // Background fetch image
        if (r.has_ratio_image) {
            apiCall('/api/cutting/records/' + recordId + '/image').then(function(imgRes) {
                var imgContainer = document.getElementById('_lsxRatioImgContainer');
                if (imgContainer && imgRes && imgRes.ratio_image) {
                    var placeholder = imgContainer.querySelector('.bpc-img-placeholder');
                    if (placeholder) placeholder.remove();
                    var imgHtml = '<div style="text-align:center"><img src="' + imgRes.ratio_image + '" style="max-width:100%;max-height:250px;border-radius:8px;border:1px solid #e2e8f0"></div>';
                    imgContainer.insertAdjacentHTML('beforeend', imgHtml);
                }
            }).catch(function(err) {
                console.error('[LSX] Lazy load image error:', err);
                var placeholder = document.querySelector('#_lsxRatioImgContainer .bpc-img-placeholder');
                if (placeholder) placeholder.textContent = '❌ Lỗi tải ảnh';
            });
        }
    } catch(e) {
        console.error('[LSX] Load detail error:', e);
        alert('Không thể tải chi tiết đơn cắt. Lỗi: ' + e.message);
    } finally {
        window._lsxDetailBusy = false;
    }
}

function _lsxDetailFmtDate(d) {
    if (!d) return '—';
    try {
        var p = d.split('T')[0].split('-');
        return p[2] + '/' + p[1] + '/' + p[0];
    } catch(e) {
        return d;
    }
}

function _lsxDetailFmtKg(val) {
    if (val === null || val === undefined || val === '' || val === '—') return '—';
    var str = String(val).replace(',', '.');
    var num = Number(str);
    if (isNaN(num)) return val;
    var parts = str.split('.');
    if (parts.length > 1 && parts[1].length > 0) {
        return parts[0] + '.' + parts[1].substring(0, 1);
    }
    return parts[0];
}

function _lsxDetailFormatOrderQty(qty, productName, cuttingCategory) {
    if (qty === null || qty === undefined || qty === '' || qty === '—') return '—';
    var phoiInItem = 1;
    if (productName) {
        var match = productName.match(/— P(\d+)/);
        if (match) phoiInItem = parseInt(match[1]);
    }
    if (phoiInItem === 1) {
        var suffix = cuttingCategory ? (' ' + cuttingCategory) : '';
        return qty + suffix;
    } else {
        return qty + ' Phối';
    }
}

// ========== DETAIL MODAL: Xem chi tiết đơn ép từ Lương Sản Xuất ==========
async function _lsxOpenPressingDetail(recordId) {
    if (window._lsxDetailBusy) return;
    window._lsxDetailBusy = true;
    try {
        var res = await apiCall('/api/pressing/records/' + recordId);
        var r = res.record;
        if (!r) return;

        var old = document.getElementById('_bpeDetailModal'); if (old) old.remove();

        var matColor = (r.material_name || '—') + ' · ' + (r.fabric_color || '—');
        var statusTxt = r.is_reported ? '✅ Đã báo cáo' : '⏳ Chờ báo cáo';
        var statusBg = r.is_reported ? '#059669' : '#ea580c';

        var h = '<div class="bpc-modal-overlay" id="_bpeDetailModal" onclick="if(event.target===this)this.classList.remove(\'show\'),setTimeout(function(){document.getElementById(\'_bpeDetailModal\').remove()},300)">';
        h += '<div class="bpc-modal" style="width:560px; max-height:95vh; overflow-y:auto; display:flex; flex-direction:column;">';
        h += '<div class="bpc-modal-header" style="background:linear-gradient(135deg,' + statusBg + ',' + statusBg + 'cc)"><div class="m-icon">📋</div><div><div class="m-title">CHI TIẾT PHIẾU ÉP</div><div class="m-sub">' + statusTxt + '</div></div></div>';
        h += '<div class="bpc-modal-body" style="overflow-y:auto; flex:1; padding:16px 20px; font-size:12px;">';

        // Info grid
        h += '<div style="background:#f8fafc; border-radius:8px; padding:12px; margin-bottom:16px; border:1px solid #e2e8f0; display:grid; grid-template-columns:1fr 1fr; gap:8px;">';
        h += '<div>👕 <strong>Sản phẩm:</strong> <span>' + (r.product_name || '—') + '</span></div>';
        h += '<div>🎨 <strong>Chất liệu/Màu:</strong> <span>' + matColor + '</span></div>';
        h += '<div>👤 <strong>CSKH:</strong> <span>' + (r.cskh_name || '—') + '</span></div>';
        h += '<div>📦 <strong>SL Cắt:</strong> <span style="color:#0369a1; font-weight:700;">' + (r.order_quantity || 0) + ' sp</span></div>';
        h += '<div>🔥 <strong>NV Ép:</strong> <span>' + (r.presser_name || '—') + '</span></div>';
        h += '<div>📅 <strong>Ngày Ép:</strong> <span>' + (r.reported_at ? (typeof vnFormat === 'function' ? vnFormat(r.reported_at) : _lsxDetailFmtDate(r.reported_at)) : '—') + '</span></div>';
        if (r.print_types) {
            h += '<div style="grid-column: span 2; display:flex; align-items:center; flex-wrap:wrap;">🖨️ <strong>Trạng thái in:</strong> ' + _lsxGetPrintStatusHtml(r) + '</div>';
        }
        h += '</div>';

        // Detailed positions
        h += '<div class="bpc-detail-card" style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:14px; margin-bottom:16px; border-left:4px solid #6366f1;">';
        h += '<div class="bpc-detail-section-title" style="font-size:11px; font-weight:800; color:#6366f1; text-transform:uppercase; letter-spacing:1px; margin-bottom:10px; display:flex; align-items:center; gap:6px;">🧩 CHI TIẾT CÁC VỊ TRÍ ÉP</div>';
        (window._bpePositions || []).forEach(function(pos) {
            var val = Number(r[pos.key_code]) || 0;
            var prcCol = pos.key_code.startsWith('pos_') && !['pos_chest_arm', 'pos_back_belly', 'pos_protective', 'pos_packaging', 'pos_other'].includes(pos.key_code)
                ? 'price_' + pos.key_code
                : pos.key_code.replace('pos_', 'price_');
            var price = Number(r[prcCol]) || 0;
            var cost = val * price;

            h += '<div class="bpc-modal-row">';
            h += '<span class="bpc-modal-lbl">' + pos.display_name + '</span>';
            h += '<div class="bpc-modal-val" style="color:#4f46e5;font-weight:700;white-space:nowrap;">';
            h += val + ' sp';
            if (!r.is_unpressed) {
                h += ' <span style="color:#94a3b8;margin:0 4px;font-size:11px;font-weight:normal;">x</span>';
                h += ' <span style="color:#64748b;font-size:11px;font-weight:normal;">' + _lsxFN(price) + 'đ</span>';
                h += ' <span style="color:#94a3b8;margin:0 4px;font-size:11px;font-weight:normal;">=</span>';
                h += ' <span style="color:#059669;font-weight:800;font-size:12px;">' + _lsxFN(cost) + 'đ</span>';
            }
            h += '</div></div>';
        });
        h += '</div>';

        // Quantities & Salary
        h += '<div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:16px; margin-top:16px;">';
        h += '<div style="background:#f0fdf4; padding:10px; border-radius:10px; text-align:center; border:1px solid #bbf7d0;"><div style="font-size:9px; font-weight:700; color:#166534">🔥 TỔNG SL ÉP THỰC TẾ</div><div style="font-size:18px; font-weight:900; color:#15803d">' + (r.press_quantity || 0) + ' sp</div></div>';
        h += '<div style="background:#fff7ed; padding:10px; border-radius:10px; text-align:center; border:1px solid #ffedd5;"><div style="font-size:9px; font-weight:700; color:#c2410c">💰 LƯƠNG ÉP</div><div style="font-size:18px; font-weight:900; color:#ea580c">' + _lsxFN(r.press_salary || r.salary || 0) + ' đ</div></div>';
        h += '</div>';

        // Images & Notes
        h += '<div class="bpc-detail-card" style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:14px; margin-bottom:16px; border-left:4px solid #8b5cf6;">';
        h += '<div class="bpc-detail-section-title" style="font-size:11px; font-weight:800; color:#8b5cf6; text-transform:uppercase; letter-spacing:1px; margin-bottom:10px; display:flex; align-items:center; gap:6px;">📝 BÁO CÁO CỦA NHÂN VIÊN</div>';
        h += '<div class="bpc-modal-row" style="flex-direction:column; align-items:flex-start; border-bottom:none; padding:4px 0;"><span class="bpc-modal-lbl" style="margin-bottom:6px;">💬 Ghi chú ép:</span><span class="bpc-modal-val" style="text-align:left; max-width:100%; white-space:pre-wrap; color:#334155; font-weight:500; font-size:12px; background:#fff; padding:8px 12px; border:1px solid #e2e8f0; border-radius:8px; width:100%; min-height:40px; box-sizing:border-box;">' + (r.notes || '—') + '</span></div>';
        
        var imgs = [];
        try { imgs = typeof r.press_images === 'string' ? JSON.parse(r.press_images) : (r.press_images || []); } catch(e) {}
        if (Array.isArray(imgs) && imgs.length > 0) {
            h += '<div style="margin-top:12px;">';
            h += '<div class="bpc-modal-lbl" style="margin-bottom:8px;">📸 Hình ảnh ép thực tế:</div>';
            h += '<div style="display:flex; flex-wrap:wrap; gap:10px">';
            imgs.forEach(function(imgUrl) {
                h += '<img src="' + imgUrl + '" class="bpe-detail-thumb" onclick="window.open(\'' + imgUrl.replace(/'/g, "\\'") + '\',\'_blank\')">';
            });
            h += '</div>';
            h += '</div>';
        }
        h += '</div>';

        h += '</div>'; // End body

        // Footer actions
        h += '<div style="padding:12px 24px; border-top:1px solid #f1f5f9; text-align:center">';
        h += '<button class="bpc-modal-btn cancel" style="width:100%" onclick="var m=document.getElementById(\'_bpeDetailModal\');if(m){m.classList.remove(\'show\');setTimeout(function(){m.remove()},300)}">Đóng</button>';
        h += '</div>';

        h += '</div></div>';

        document.body.insertAdjacentHTML('beforeend', h);
        setTimeout(function() {
            var m = document.getElementById('_bpeDetailModal');
            if (m) m.classList.add('show');
        }, 50);

    } catch(e) {
        console.error(e);
        alert('Lỗi tải thông tin phiếu ép');
    } finally {
        window._lsxDetailBusy = false;
    }
}

function _lsxGetPrintStatusHtml(r) {
    var printTypes = r.print_types || '';
    var pendingPrintTypes = r.pending_print_types || '';
    
    if (!printTypes) return '';
    
    var types = printTypes.split(', ').map(function(t) { return t.trim(); });
    var pending = pendingPrintTypes ? pendingPrintTypes.split(', ').map(function(t) { return t.trim(); }) : [];
    
    var badges = [];
    
    if (types.indexOf('IN PET') >= 0) {
        if (pending.indexOf('IN PET') >= 0) {
            badges.push('<span style="margin-left: 6px; background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: bold; display: inline-block; vertical-align: middle;">Chưa In Pet</span>');
        } else {
            badges.push('<span style="margin-left: 6px; background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: bold; display: inline-block; vertical-align: middle;">Đã In Pet</span>');
        }
    }
    
    if (types.indexOf('IN DECAL') >= 0) {
        if (pending.indexOf('IN DECAL') >= 0) {
            badges.push('<span style="margin-left: 6px; background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: bold; display: inline-block; vertical-align: middle;">Chưa In Decal</span>');
        } else {
            badges.push('<span style="margin-left: 6px; background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: bold; display: inline-block; vertical-align: middle;">Đã In Decal</span>');
        }
    }
    
    return badges.join('');
}
