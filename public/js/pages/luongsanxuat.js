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
    is_manager: false,
    is_approve_allowed: false,
    selectedRecords: [],
    lastSelectedIndex: undefined
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

            .lsx-row-selected {
                background-color: #f0fdf4 !important;
                border-left: 4px solid #10b981 !important;
            }
            .lsx-row-selected td {
                font-weight: 800 !important;
            }
            .lsx-floating-bar {
                position: fixed;
                bottom: 24px;
                left: 50%;
                transform: translateX(-50%) translateY(120px);
                background: rgba(15, 23, 42, 0.95);
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.1);
                color: #fff;
                padding: 12px 24px;
                border-radius: 50px;
                display: flex;
                align-items: center;
                gap: 16px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                z-index: 10000;
                transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            }
            .lsx-floating-bar.show {
                transform: translateX(-50%) translateY(0);
            }
            .lsx-floating-btn {
                padding: 6px 16px;
                border: none;
                border-radius: 30px;
                font-size: 12px;
                font-weight: 700;
                cursor: pointer;
                transition: all 0.2s;
                display: inline-flex;
                align-items: center;
                gap: 6px;
            }
            .lsx-floating-btn.approve {
                background: linear-gradient(135deg, #10b981, #059669);
                color: #fff;
                box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
            }
            .lsx-floating-btn.approve:hover {
                transform: translateY(-1px);
                box-shadow: 0 6px 16px rgba(16, 185, 129, 0.3);
            }
            .lsx-floating-btn.unapprove {
                background: linear-gradient(135deg, #f59e0b, #d97706);
                color: #fff;
                box-shadow: 0 4px 12px rgba(245, 158, 11, 0.2);
            }
            .lsx-floating-btn.unapprove:hover {
                transform: translateY(-1px);
                box-shadow: 0 6px 16px rgba(245, 158, 11, 0.3);
            }
            .lsx-floating-btn.cancel {
                background: transparent;
                border: 1px solid rgba(255, 255, 255, 0.4);
                color: rgba(255, 255, 255, 0.8);
            }
            .lsx-floating-btn.cancel:hover {
                background: rgba(255, 255, 255, 0.1);
                color: #fff;
            }
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
            _lsx.selectedRecords = [];
            _lsx.lastSelectedIndex = undefined;
            _lsxUpdateFloatingBar();
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
        _lsx.is_sewing_manager = res.is_sewing_manager || false;
        _lsx.is_approve_allowed = res.is_approve_allowed || false;
        
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
    
    if (s.isSewing) {
        var isContractor = !!_lsx.filter.contractor_id;
        if (isContractor) {
            sc.innerHTML = `
                <div class="lsx-card-stat" style="background:linear-gradient(135deg,#1e293b,#0f172a)">
                    <div style="font-size:9px;font-weight:700;opacity:.8;letter-spacing:1px;margin-bottom:2px">📦 CỘNG DỒN GIA CÔNG</div>
                    <div style="font-size:15px;font-weight:900">${_lsxFN(s.sewingTho)} đ</div>
                    <div style="font-size:9px;opacity:.7;margin-top:2px">${s.approvedCount || 0} đơn đã duyệt</div>
                </div>
            `;
        } else {
            sc.innerHTML = `
                <div class="lsx-card-stat" style="background:linear-gradient(135deg,#1e293b,#0f172a)">
                    <div style="font-size:9px;font-weight:700;opacity:.8;letter-spacing:1px;margin-bottom:2px">📦 CỘNG DỒN THỢ</div>
                    <div style="font-size:15px;font-weight:900">${_lsxFN(s.sewingTho)} đ</div>
                    <div style="font-size:9px;opacity:.7;margin-top:2px">${s.approvedCount || 0} đơn đã duyệt</div>
                </div>
                <div class="lsx-card-stat" style="background:linear-gradient(135deg,#10b981,#059669)">
                    <div style="font-size:9px;font-weight:700;opacity:.8;letter-spacing:1px;margin-bottom:2px">✅ CỘNG DỒN CPM</div>
                    <div style="font-size:15px;font-weight:900">${_lsxFN(s.sewingCPM)} đ</div>
                    <div style="font-size:9px;opacity:.7;margin-top:2px">${s.approvedCount || 0} đơn đã duyệt</div>
                </div>
            `;
        }
    } else if (s.isPressing) {
        sc.innerHTML = `
            <div class="lsx-card-stat" style="background:linear-gradient(135deg,#10b981,#059669)">
                <div style="font-size:9px;font-weight:700;opacity:.8;letter-spacing:1px;margin-bottom:2px">✅ TỔNG LƯƠNG ÉP ĐÃ DUYỆT</div>
                <div style="font-size:15px;font-weight:900">${_lsxFN(s.approved)} đ</div>
                <div style="font-size:9px;opacity:.7;margin-top:2px">${s.approvedCount || 0} đơn đã duyệt</div>
            </div>
        `;
    } else if (s.isCutting) {
        sc.innerHTML = `
            <div class="lsx-card-stat" style="background:linear-gradient(135deg,#10b981,#059669)">
                <div style="font-size:9px;font-weight:700;opacity:.8;letter-spacing:1px;margin-bottom:2px">✅ TỔNG LƯƠNG CẮT ĐÃ DUYỆT</div>
                <div style="font-size:15px;font-weight:900">${_lsxFN(s.approved)} đ</div>
                <div style="font-size:9px;opacity:.7;margin-top:2px">${s.approvedCount || 0} đơn đã duyệt</div>
            </div>
        `;
    } else {
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
        `;
    }
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
    _lsx.selectedRecords = [];
    _lsx.lastSelectedIndex = undefined;
    _lsxUpdateFloatingBar();
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
        _lsx.is_manager = res.is_manager || false;
        _lsx.is_sewing_manager = res.is_sewing_manager || false;
        _lsx.is_approve_allowed = res.is_approve_allowed || false;
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
    var isAllowedToApprove = !!_lsx.is_approve_allowed;
    var masterCheckHtml = '';
    if (isAllowedToApprove) {
        masterCheckHtml = `
            <div style="margin-top:4px; display:flex; flex-direction:column; align-items:center; gap:2px; user-select:none; white-space:nowrap;">
                <input type="checkbox" id="lsxMasterCheck" onclick="event.stopPropagation(); _lsxToggleSelectAll(this)" style="transform: scale(1.25); cursor: pointer;">
                <span id="lsxMasterCheckText" onclick="var mc=document.getElementById('lsxMasterCheck'); if(mc){mc.checked=!mc.checked; _lsxToggleSelectAll(mc);}" style="font-size: 10px; color: #fff; font-weight: bold; cursor: pointer; display: block; margin-top: 2px;">Chọn tất cả</span>
            </div>
        `;
    } else {
        masterCheckHtml = 'Kiểm Tra';
    }
    
    if (_lsx.filter.dept === 'pressing') {
        var posHeaders = (window._bpePositions || []).map(function(pos) {
            return `<th style="text-align:center;background:#0d9488;cursor:help" title="${pos.display_name}" onclick="showToast('Vị trí: ' + this.title)">${pos.short_name || pos.display_name}</th>`;
        }).join('');

        return `
            <tr style="background:var(--gray-800)">
                <th style="width:50px">STT</th>
                <th>Ép Xong</th>
                <th>Bộ Phận</th>
                <th>Nhân Viên</th>
                <th>Tên Sản Phẩm</th>
                <th style="text-align:center">SL Đơn</th>
                <th style="text-align:center">SL Ép</th>
                ${posHeaders}
                <th style="text-align:right">Lương NV</th>
                <th style="text-align:right;font-weight:bold;color:#fff">Cộng dồn (đ)</th>
                <th style="text-align:center; min-width: 90px; vertical-align: middle;">
                    ${masterCheckHtml}
                </th>
                <th>Cập Nhật</th>
            </tr>
        `;
    }

    if (_lsx.filter.dept === 'cutting') {
        return `
            <tr style="background:var(--gray-800)">
                <th style="width:50px">STT</th>
                <th>Time Cắt Xong</th>
                <th>Bộ Phận</th>
                <th>Nhân Viên</th>
                <th>Mã Đơn</th>
                <th style="text-align:center">SL Đơn</th>
                <th style="text-align:center">SL Cắt</th>
                <th>Tên Sản Phẩm</th>
                <th style="text-align:right">Đơn Giá (đ)</th>
                <th style="text-align:right">Lương NV</th>
                <th style="text-align:right;font-weight:bold;color:#fff">Cộng dồn (đ)</th>
                <th style="text-align:center; min-width: 90px; vertical-align: middle;">
                    ${masterCheckHtml}
                </th>
                <th>Lịch Sử Cập Nhật</th>
            </tr>
        `;
    }
    
    if (_lsx.filter.dept === 'sewing') {
        var isContractor = !!_lsx.filter.contractor_id;
        return `
            <tr style="background:var(--gray-800)">
                <th style="width:50px">STT</th>
                <th>Thời Gian<br>Hoàn Thiện</th>
                <th>NV May</th>
                <th>Tên SP / Phối</th>
                <th style="text-align:center">SL<br>(Đơn / May)</th>
                <th style="text-align:center">Giá<br>(Gốc / KTra)</th>
                ${!isContractor ? '<th style="text-align:center">Giá<br>( CPM/ KTra )</th>' : ''}
                <th>May Thiếu</th>
                <th>Thiếu KT May</th>
                <th style="text-align:right">${isContractor ? 'Lương Gia Công' : 'Lương Thợ'}</th>
                ${!isContractor ? '<th style="text-align:right">Lương CPM</th>' : ''}
                <th style="text-align:right;font-weight:bold;color:#fff">${isContractor ? 'Cộng Dồn Gia Công' : 'Cộng Dồn Thợ'}</th>
                ${!isContractor ? '<th style="text-align:right;font-weight:bold;color:#fff">Cộng Dồn CPM</th>' : ''}
                <th style="text-align:center; min-width: 90px; vertical-align: middle;">
                    ${masterCheckHtml}
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
            <th style="text-align:center; min-width: 90px; vertical-align: middle;">
                ${masterCheckHtml}
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
            r.salary = (Number(r.quantity) || 0) * (Number(r.checked_price || r.base_price) || 0);

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

    // Compute stats and cumulative sums
    var cumulative = [];
    var cumulativeTho = [];
    var cumulativeCPM = [];
    var runningSum = 0;
    var runningSumTho = 0;
    var runningSumCPM = 0;
    var pendingSum = 0;
    var pendingTho = 0;
    var pendingCPM = 0;
    var totalSum = 0;
    var countApproved = 0;
    var countPending = 0;

    for (var idx = all.length - 1; idx >= 0; idx--) {
        var r = all[idx];
        totalSum += Number(r.salary) || 0;
        if (r.is_approved) {
            runningSum += Number(r.salary) || 0;
            countApproved++;
        } else {
            pendingSum += Number(r.salary) || 0;
            countPending++;
        }
        cumulative[idx] = runningSum;

        if (r.dept === 'sewing') {
            if (r.is_approved) {
                runningSumTho += Number(r.salary) || 0;
                runningSumCPM += Number(r.cpm_salary) || 0;
            } else {
                pendingTho += Number(r.salary) || 0;
                pendingCPM += Number(r.cpm_salary) || 0;
            }
            cumulativeTho[idx] = runningSumTho;
            cumulativeCPM[idx] = runningSumCPM;
        }
    }

    // Call dynamic stats render
    _lsxRenderStats({
        total: totalSum,
        approved: runningSum,
        pending: pendingSum,
        count: all.length,
        isSewing: _lsx.filter.dept === 'sewing',
        isPressing: _lsx.filter.dept === 'pressing',
        isCutting: _lsx.filter.dept === 'cutting',
        sewingTho: runningSumTho,
        sewingCPM: runningSumCPM,
        sewingPendingTho: pendingTho,
        sewingPendingCPM: pendingCPM,
        approvedCount: countApproved,
        pendingCount: countPending
    });

    if (!all.length) {
        var colSpan = _lsx.filter.dept === 'pressing' ? (11 + (window._bpePositions || []).length) : (_lsx.filter.dept === 'sewing' ? (_lsx.filter.contractor_id ? 12 : 15) : 13);
        tb.innerHTML = '<tr><td colspan="' + colSpan + '"><div class="empty-state"><div class="icon">💰</div><h3>Không có bản ghi lương nào</h3></div></td></tr>';
        _lsxRenderInfo(0);
        return;
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
        
        var isAllowedToApprove = !!_lsx.is_approve_allowed;
        var checkAction = isAllowedToApprove ? `onclick="_lsxToggleAppr(${r.id}, '${r.dept}')"` : 'disabled';

        var isSel = isAllowedToApprove && _lsx.selectedRecords && _lsx.selectedRecords.some(function(sel) { return sel.id === r.id && sel.dept === r.dept; });
        var trClass = isSel ? ' class="lsx-row-selected"' : '';
        var trAttrs = `data-row-id="${r.id}" data-row-dept="${r.dept}" data-row-index="${i}" onclick="_lsxOnRowClick(this, event)" style="cursor: pointer;"`;

        var checkCellContent = '';
        if (isAllowedToApprove) {
            checkCellContent = `
                <div style="display:inline-flex; align-items:center; gap:8px;" onclick="event.stopPropagation();">
                    <input type="checkbox" class="lsx-row-check" data-id="${r.id}" data-dept="${r.dept}" data-approved="${isAppr}" ${isSel ? 'checked' : ''} style="transform: scale(1.25); cursor: pointer;" onclick="event.stopPropagation(); _lsxOnRowCheckClick(this, event)">
                    <button class="${checkCls}" ${checkAction} title="Duyệt lương" style="vertical-align: middle; padding: 2px 4px; font-size: 11px;">${checkIcon}</button>
                </div>
            `;
        } else {
            checkCellContent = `<button class="${checkCls}" disabled title="Không có quyền duyệt lương">${checkIcon}</button>`;
        }

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
            return `<tr${trClass} ${trAttrs}>`
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
                + `<td style="text-align:right;font-weight:700;color:#f59e0b">${r.is_approved ? _lsxFN(r.salary) : '—'}</td>`
                + `<td style="text-align:right;font-weight:800;color:#0f766e;background:#f0fdfa">${r.is_approved ? _lsxFN(cumulative[i]) : '—'}</td>`
                + `<td style="text-align:center">${checkCellContent}</td>`
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
                    var items = noteText.split(/[,;]/).map(function(item) {
                        return item.trim();
                    }).filter(Boolean);
                    var itemsHtml = items.map(function(item) {
                        return `<div style="font-size:10px;color:#ef4444;font-weight:600;margin-bottom:2px">${item}</div>`;
                    }).join('');
                    parts.push(itemsHtml);
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
            var hasTechNotes = r.notes && r.notes.startsWith('[THIẾU GIÁ CHI TIẾT]');
            var techImages = [];
            try {
                techImages = JSON.parse(r.qc_missing_price_images || '[]');
            } catch (e) {}
            var hasTechImages = techImages && techImages.length > 0;

            if (hasTechNotes || hasTechImages) {
                var techParts = [];
                if (hasTechNotes) {
                    var detailStr = r.notes.replace('[THIẾU GIÁ CHI TIẾT]', '').trim();
                    var words = (detailStr || '').split(/\s+/);
                    var chunked = [];
                    for (var wIdx = 0; wIdx < words.length; wIdx += 3) {
                        chunked.push(words.slice(wIdx, wIdx + 3).join(' '));
                    }
                    var formattedStr = chunked.join('<br>');
                    techParts.push(`<div style="font-size:10.5px;font-weight:600;line-height:1.3">${formattedStr || 'Thiếu KT'}</div>`);
                }
                if (hasTechImages) {
                    var techImgHtmls = techImages.map(function(src) {
                        return `<img src="${src}" style="width:32px;height:32px;object-fit:cover;border-radius:4px;margin-right:2px;cursor:pointer;border:1px solid #cbd5e1" onclick="_lsxViewImage('${src}')" title="Xem ảnh đầy đủ">`;
                    }).join('');
                    techParts.push(`<div style="margin-top:4px;line-height:0">${techImgHtmls}</div>`);
                }
                thieuKyThuatHtml = techParts.join('');
            }

            var salCell = `<td style="text-align:right;font-weight:700;color:#1e293b">${r.is_approved ? _lsxFN(r.salary) : '—'}</td>`;

            var cpmSalCell = '<td style="text-align:right;font-size:11px;color:#94a3b8">—</td>';
            if (!r.contractor_id) {
                cpmSalCell = `<td style="text-align:right;font-weight:700;color:#2563eb">${r.is_approved ? _lsxFN(r.cpm_salary) : '—'}</td>`;
            }

            var cumThoCell = `<td style="text-align:right;font-weight:800;color:#d97706;background:#fffbeb">${r.is_approved ? _lsxFN(cumulativeTho[i]) : '—'}</td>`;
            var cumCPMCell = `<td style="text-align:right;font-weight:800;color:#1d4ed8;background:#eff6ff">${r.is_approved ? _lsxFN(cumulativeCPM[i]) : '—'}</td>`;

            var isContractor = !!_lsx.filter.contractor_id;
            return `<tr${trClass} ${trAttrs}>`
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
                + `<td style="text-align:center">${checkCellContent}</td>`
                + `<td style="font-size:9.5px;color:#64748b">${lastUpd}</td>`
                + `</tr>`;
        }

        if (_lsx.filter.dept === 'cutting') {
            return `<tr${trClass} ${trAttrs}>`
                + `<td style="text-align:center;font-weight:700;color:#94a3b8">${i + 1}</td>`
                + `<td style="font-size:10px">${_lsxFormatWorkDate(r)}</td>`
                + `<td>${deptBadge}</td>`
                + `<td style="font-weight:600;color:#0f172a">${wPrefix}${workerName}</td>`
                + `<td style="font-weight:700;color:#1e3a8a">${codeCell}</td>`
                + `<td style="text-align:center;font-weight:700;color:${qtyColor}">${_lsxFormatOrderQty(orderQty, r.product_name, r.cutting_category, r.dept)}</td>`
                + `<td style="text-align:center;font-weight:700;color:${cutColor}">${_lsxFormatOrderQty(r.quantity, r.product_name, r.cutting_category, r.dept)}</td>`
                + `<td style="font-weight:600;color:#334155;max-width:180px;overflow:hidden;text-overflow:ellipsis" title="${r.product_name || ''}">${displayName}</td>`
                + priceCell
                + `<td style="text-align:right;font-weight:700;color:#f59e0b">${r.is_approved ? _lsxFN(r.salary) : '—'}</td>`
                + `<td style="text-align:right;font-weight:800;color:#0f766e;background:#f0fdfa">${r.is_approved ? _lsxFN(cumulative[i]) : '—'}</td>`
                + `<td style="text-align:center">${checkCellContent}</td>`
                + `<td style="font-size:9.5px;color:#64748b">${lastUpd}</td>`
                + `</tr>`;
        }

        var prodCell = displayName;
        if (r.dept === 'pressing' && r.id) {
            prodCell = `<span style="cursor:pointer; text-decoration:underline; color:#2563eb;" onclick="_lsxOpenPressingDetail(${r.id})">${displayName}</span>`;
        }

        return `<tr${trClass} ${trAttrs}>`
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
            + `<td style="text-align:center">${checkCellContent}</td>`
            + `<td style="text-align:right;font-weight:800;color:#0f766e;background:#f0fdfa">${r.is_approved ? _lsxFN(cumulative[i]) : '—'}</td>`
            + `<td style="font-size:9.5px;color:#64748b">${lastUpd}</td>`
            + `</tr>`;
    }).join('');

    var isAllowed = !!_lsx.is_approve_allowed;
    if (isAllowed) {
        _lsxUpdateMasterCheckboxState();
        _lsxUpdateFloatingBar();
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
    if (dept === 'sewing') {
        _lsxOpenSewingQCModal(id);
        return;
    }
    if (dept === 'pressing') {
        _lsxOpenPressingQCModal(id);
        return;
    }
    if (dept === 'cutting') {
        _lsxOpenCuttingQCModal(id);
        return;
    }
    try {
        var res = await apiCall(`/api/production-salary/toggle/${dept}/${id}`, 'POST');
        if (res && res.error) {
            showToast(res.error, 'error');
            await _lsxLoadAll();
            return;
        }
        showToast('Cập nhật trạng thái duyệt thành công');
        // Reload all to refresh aggregates & tree sums
        await _lsxLoadAll();
    } catch(e) {
        console.error(e);
        showToast(e.message || 'Lỗi khi cập nhật trạng thái', 'error');
        await _lsxLoadAll();
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
            if (res && res.error) {
                showToast(res.error, 'error');
                cell.innerHTML = _lsxFN(currentVal);
                return;
            }
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

    var flagged = unapproved.filter(function(r) {
        return r.dept === 'sewing' && r.notes && r.notes.indexOf('[THIẾU GIÁ CHI TIẾT]') === 0;
    });

    if (flagged.length > 0) {
        var names = flagged.map(function(f) { return (f.order_code || '') + ' (' + (f.product_name || '') + ')'; }).join(', ');
        if (!confirm('Trong danh sách duyệt có ' + flagged.length + ' đơn hàng đang bị báo "Thiếu Kỹ Thuật May":\n' + names + '\n\nBạn có chắc chắn vẫn muốn duyệt hàng loạt cả các đơn này không?')) {
            return;
        }
    } else {
        if (!confirm('Bạn có chắc chắn muốn duyệt tất cả ' + unapproved.length + ' bản ghi đang hiển thị?')) {
            return;
        }
    }

    try {
        var payload = {
            records: unapproved.map(function(r) {
                return { id: r.id, dept: r.dept };
            })
        };
        var res = await apiCall('/api/production-salary/approve-bulk', 'POST', payload);
        if (res && res.error) {
            showToast(res.error, 'error');
            return;
        }
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
        var cutDoneStr = '—';
        if (r.cut_done_at) {
            cutDoneStr = _lsxFormatWorkDate({ is_completed: true, completion_time: r.cut_done_at });
        } else if (r.cut_date) {
            cutDoneStr = _lsxDetailFmtDate(r.cut_date);
        }
        h += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">📅 Cắt Xong</span><span class="bpc-modal-val">' + cutDoneStr + '</span></div>';
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
    if (num === 0) return '—';
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
        h += '<div>📅 <strong>Ép Xong:</strong> <span>' + (r.reported_at ? _lsxFormatWorkDate({ is_completed: true, completion_time: r.reported_at }) : '—') + '</span></div>';
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
    
    if (types.indexOf('IN LỤA') >= 0) {
        if (pending.indexOf('IN LỤA') >= 0) {
            badges.push('<span style="margin-left: 6px; background: #fef3c7; color: #d97706; border: 1px solid #fde68a; font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: bold; display: inline-block; vertical-align: middle;">Chưa In Lụa</span>');
        } else {
            badges.push('<span style="margin-left: 6px; background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: bold; display: inline-block; vertical-align: middle;">Đã In Lụa</span>');
        }
    }
    
    if (types.indexOf('IN KỸ THUẬT SỐ') >= 0) {
        if (pending.indexOf('IN KỸ THUẬT SỐ') >= 0) {
            badges.push('<span style="margin-left: 6px; background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: bold; display: inline-block; vertical-align: middle;">Chưa In KTS</span>');
        } else {
            badges.push('<span style="margin-left: 6px; background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: bold; display: inline-block; vertical-align: middle;">Đã In KTS</span>');
        }
    }
    
    if (types.indexOf('IN CHUYỂN NHIỆT') >= 0) {
        if (pending.indexOf('IN CHUYỂN NHIỆT') >= 0) {
            badges.push('<span style="margin-left: 6px; background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: bold; display: inline-block; vertical-align: middle;">Chưa In CN</span>');
        } else {
            badges.push('<span style="margin-left: 6px; background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: bold; display: inline-block; vertical-align: middle;">Đã In CN</span>');
        }
    }
    
    if (types.indexOf('THÊU') >= 0) {
        if (pending.indexOf('THÊU') >= 0) {
            badges.push('<span style="margin-left: 6px; background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: bold; display: inline-block; vertical-align: middle;">Chưa Thêu</span>');
        } else {
            badges.push('<span style="margin-left: 6px; background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: bold; display: inline-block; vertical-align: middle;">Đã Thêu</span>');
        }
    }
    
    return badges.join('');
}

// ========== BATCH SELECTION & APPROVAL HELPERS ==========

function _lsxOnRowClick(rowEl, event) {
    var isAllowed = !!_lsx.is_approve_allowed;
    if (!isAllowed) return;
    
    // Do not trigger selection when clicking on interactive children
    var tag = event.target.tagName.toLowerCase();
    if (tag === 'input' || tag === 'button' || tag === 'a' || tag === 'img' || (tag === 'span' && event.target.onclick)) {
        return;
    }
    if (event.target.closest('button') || event.target.closest('input') || event.target.closest('a') || event.target.closest('img') || (event.target.closest('span') && event.target.closest('span').onclick)) {
        return;
    }
    
    var chk = rowEl.querySelector('.lsx-row-check');
    if (chk) {
        chk.checked = !chk.checked;
        _lsxOnRowCheckClick(chk, event);
    }
}

function _lsxOnRowCheckClick(chk, event) {
    var isAllowed = !!_lsx.is_approve_allowed;
    if (!isAllowed) return;
    
    var id = Number(chk.getAttribute('data-id'));
    var dept = chk.getAttribute('data-dept');
    var approved = chk.getAttribute('data-approved') === 'true';
    
    // Find index of this item in the currently visible records
    var allVisible = _lsx.records.slice();
    if (_lsx.search) {
        var q = _lsx.search.toLowerCase();
        allVisible = allVisible.filter(function(r) {
            return (r.product_name || '').toLowerCase().indexOf(q) >= 0 
                || (r.order_code || '').toLowerCase().indexOf(q) >= 0
                || (r.worker_name || '').toLowerCase().indexOf(q) >= 0;
        });
    }
    
    var currentIndex = -1;
    for (var idx = 0; idx < allVisible.length; idx++) {
        if (allVisible[idx].id === id && allVisible[idx].dept === dept) {
            currentIndex = idx;
            break;
        }
    }
    
    // Range select with Shift key
    if (event && event.shiftKey && _lsx.lastSelectedIndex !== undefined && currentIndex !== -1) {
        var start = Math.min(_lsx.lastSelectedIndex, currentIndex);
        var end = Math.max(_lsx.lastSelectedIndex, currentIndex);
        
        var shouldSelect = chk.checked;
        
        for (var idx = start; idx <= end; idx++) {
            var item = allVisible[idx];
            var chkEl = document.querySelector(`.lsx-row-check[data-id="${item.id}"][data-dept="${item.dept}"]`);
            if (chkEl) chkEl.checked = shouldSelect;
            
            _lsxUpdateSelectionState(item.id, item.dept, item.is_approved, shouldSelect);
        }
    } else {
        _lsxUpdateSelectionState(id, dept, approved, chk.checked);
        if (chk.checked) {
            _lsx.lastSelectedIndex = currentIndex;
        } else {
            _lsx.lastSelectedIndex = undefined;
        }
    }
    
    // Update visual row highlighting
    var rows = document.querySelectorAll('#lsxTb tr');
    rows.forEach(function(row) {
        var rId = Number(row.getAttribute('data-row-id'));
        var rDept = row.getAttribute('data-row-dept');
        if (rId && rDept) {
            var isSel = _lsx.selectedRecords.some(function(sel) { return sel.id === rId && sel.dept === rDept; });
            if (isSel) {
                row.classList.add('lsx-row-selected');
            } else {
                row.classList.remove('lsx-row-selected');
            }
        }
    });
    
    _lsxUpdateMasterCheckboxState();
    _lsxUpdateFloatingBar();
}

function _lsxUpdateSelectionState(id, dept, is_approved, isSelected) {
    if (isSelected) {
        // Add if not already present
        var exists = _lsx.selectedRecords.some(function(sel) { return sel.id === id && sel.dept === dept; });
        if (!exists) {
            _lsx.selectedRecords.push({ id: id, dept: dept, is_approved: is_approved });
        }
    } else {
        // Remove if present
        _lsx.selectedRecords = _lsx.selectedRecords.filter(function(sel) {
            return !(sel.id === id && sel.dept === dept);
        });
    }
}

function _lsxToggleSelectAll(masterChk) {
    var isAllowed = !!_lsx.is_approve_allowed;
    if (!isAllowed) return;
    
    var allVisible = _lsx.records.slice();
    if (_lsx.search) {
        var q = _lsx.search.toLowerCase();
        allVisible = allVisible.filter(function(r) {
            return (r.product_name || '').toLowerCase().indexOf(q) >= 0 
                || (r.order_code || '').toLowerCase().indexOf(q) >= 0
                || (r.worker_name || '').toLowerCase().indexOf(q) >= 0;
        });
    }
    
    var shouldSelect = masterChk.checked;
    
    // Update label text
    var labelEl = document.getElementById('lsxMasterCheckText');
    if (labelEl) {
        labelEl.textContent = shouldSelect ? 'Bỏ chọn tất cả' : 'Chọn tất cả';
    }
    
    allVisible.forEach(function(item) {
        var chkEl = document.querySelector(`.lsx-row-check[data-id="${item.id}"][data-dept="${item.dept}"]`);
        if (chkEl) chkEl.checked = shouldSelect;
        
        _lsxUpdateSelectionState(item.id, item.dept, item.is_approved, shouldSelect);
    });
    
    // Update visual row highlighting
    var rows = document.querySelectorAll('#lsxTb tr');
    rows.forEach(function(row) {
        var rId = Number(row.getAttribute('data-row-id'));
        var rDept = row.getAttribute('data-row-dept');
        if (rId && rDept) {
            var isSel = _lsx.selectedRecords.some(function(sel) { return sel.id === rId && sel.dept === rDept; });
            if (isSel) {
                row.classList.add('lsx-row-selected');
            } else {
                row.classList.remove('lsx-row-selected');
            }
        }
    });
    
    if (!shouldSelect) {
        _lsx.lastSelectedIndex = undefined;
    }
    
    _lsxUpdateFloatingBar();
}

function _lsxUpdateMasterCheckboxState() {
    var masterChk = document.getElementById('lsxMasterCheck');
    var labelEl = document.getElementById('lsxMasterCheckText');
    if (!masterChk) return;
    
    var allVisible = _lsx.records.slice();
    if (_lsx.search) {
        var q = _lsx.search.toLowerCase();
        allVisible = allVisible.filter(function(r) {
            return (r.product_name || '').toLowerCase().indexOf(q) >= 0 
                || (r.order_code || '').toLowerCase().indexOf(q) >= 0
                || (r.worker_name || '').toLowerCase().indexOf(q) >= 0;
        });
    }
    
    if (allVisible.length === 0) {
        masterChk.checked = false;
        masterChk.indeterminate = false;
        if (labelEl) labelEl.textContent = 'Chọn tất cả';
        return;
    }
    
    var selectedCount = 0;
    allVisible.forEach(function(item) {
        var isSel = _lsx.selectedRecords.some(function(sel) { return sel.id === item.id && sel.dept === item.dept; });
        if (isSel) selectedCount++;
    });
    
    if (selectedCount === 0) {
        masterChk.checked = false;
        masterChk.indeterminate = false;
        if (labelEl) labelEl.textContent = 'Chọn tất cả';
    } else if (selectedCount === allVisible.length) {
        masterChk.checked = true;
        masterChk.indeterminate = false;
        if (labelEl) labelEl.textContent = 'Bỏ chọn tất cả';
    } else {
        masterChk.checked = false;
        masterChk.indeterminate = true;
        if (labelEl) labelEl.textContent = 'Chọn tất cả';
    }
}

function _lsxUpdateFloatingBar() {
    var bar = document.getElementById('lsxFloatingBar');
    
    if (!_lsx.selectedRecords || _lsx.selectedRecords.length === 0) {
        if (bar) {
            bar.classList.remove('show');
            setTimeout(function() {
                if (bar && (!_lsx.selectedRecords || _lsx.selectedRecords.length === 0)) {
                    bar.remove();
                }
            }, 300);
        }
        return;
    }
    
    if (!bar) {
        bar = document.createElement('div');
        bar.id = 'lsxFloatingBar';
        bar.className = 'lsx-floating-bar';
        document.body.appendChild(bar);
    }
    
    var count = _lsx.selectedRecords.length;
    var hasPending = _lsx.selectedRecords.some(function(r) { return !r.is_approved; });
    var hasApproved = _lsx.selectedRecords.some(function(r) { return r.is_approved; });
    
    var approveBtnHtml = '';
    if (hasPending) {
        approveBtnHtml = `
            <button class="lsx-floating-btn approve" onclick="_lsxBulkAction(true)">
                <span>💰</span> Duyệt ${count} dòng
            </button>
        `;
    }
    
    var unapproveBtnHtml = '';
    if (hasApproved) {
        unapproveBtnHtml = `
            <button class="lsx-floating-btn unapprove" onclick="_lsxBulkAction(false)">
                <span>↩️</span> Hủy duyệt ${count} dòng
            </button>
        `;
    }
    
    bar.innerHTML = `
        <span style="font-size: 13px; font-weight: 700; color: #fff;">Đã chọn ${count} bản ghi</span>
        ${approveBtnHtml}
        ${unapproveBtnHtml}
        <button class="lsx-floating-btn cancel" onclick="_lsxClearSelection()">Bỏ chọn</button>
    `;
    
    // Force DOM reflow to trigger CSS entry transition
    bar.offsetHeight;
    bar.classList.add('show');
}

function _lsxClearSelection() {
    _lsx.selectedRecords = [];
    _lsx.lastSelectedIndex = undefined;
    
    // Uncheck all row checkboxes
    var checkElList = document.querySelectorAll('.lsx-row-check');
    checkElList.forEach(function(chk) {
        chk.checked = false;
    });
    
    // Remove selected highlighting from all rows
    var rows = document.querySelectorAll('#lsxTb tr');
    rows.forEach(function(row) {
        row.classList.remove('lsx-row-selected');
    });
    
    _lsxUpdateMasterCheckboxState();
    _lsxUpdateFloatingBar();
}

async function _lsxBulkAction(approve) {
    if (approve && _lsx.filter.dept === 'pressing') {
        _lsxOpenBulkPressingQCModal();
        return;
    }
    if (approve && _lsx.filter.dept === 'cutting') {
        _lsxOpenBulkCuttingQCModal();
        return;
    }
    if (approve && _lsx.filter.dept === 'sewing') {
        var flagged = [];
        _lsx.selectedRecords.forEach(function(sel) {
            var r = _lsx.records.find(function(x) { return x.id === sel.id && x.dept === sel.dept; });
            if (r && r.dept === 'sewing' && !r.is_approved && r.notes && r.notes.indexOf('[THIẾU GIÁ CHI TIẾT]') === 0) {
                flagged.push(r);
            }
        });
        if (flagged.length > 0) {
            var names = flagged.map(function(f) { return (f.order_code || '') + ' (' + (f.product_name || '') + ')'; }).join(', ');
            if (!confirm('Trong danh sách chọn có ' + flagged.length + ' đơn hàng đang bị báo "Thiếu Kỹ Thuật May":\n' + names + '\n\nBạn có chắc chắn vẫn muốn tiếp tục duyệt hàng loạt tất cả không?')) {
                return;
            }
        }
        _lsxOpenBulkSewingQCModal();
        return;
    }
    
    var actionText = approve ? 'duyệt hàng loạt' : 'hủy duyệt hàng loạt';
    if (!confirm(`Bạn có chắc chắn muốn ${actionText} ${_lsx.selectedRecords.length} dòng đã chọn?`)) {
        return;
    }
    
    var targets = _lsx.selectedRecords.map(function(r) {
        return { id: r.id, dept: r.dept };
    });
    
    try {
        showToast('Đang xử lý...', 'info');
        var res = await apiCall('/api/production-salary/approve-bulk', 'POST', {
            records: targets,
            approved: approve
        });
        
        if (res && (res.success || res.count !== undefined)) {
            showToast(`${approve ? 'Duyệt' : 'Hủy duyệt'} thành công!`, 'success');
            _lsx.selectedRecords = [];
            _lsx.lastSelectedIndex = undefined;
            _lsxUpdateFloatingBar();
            await _lsxLoadAll();
        } else {
            showToast((res && res.error) || 'Có lỗi xảy ra', 'error');
        }
    } catch (e) {
        console.error('[LSX Bulk]', e);
        showToast(e.message || 'Không thể thực hiện thao tác hàng loạt', 'error');
    }
}

// ========== SEWING QC MODAL & TECHNIQUES EDITING ==========

function _lsxOpenSewingQCModal(id) {
    var r = _lsx.records.find(function(x) { return x.id === id && x.dept === 'sewing'; });
    if (!r) return;

    // Compile list of available techniques
    var tsamTechs = [];
    try {
        tsamTechs = typeof r.sample_sewing_tech === 'string' ? JSON.parse(r.sample_sewing_tech) : (r.sample_sewing_tech || []);
    } catch (e) {}
    if (!Array.isArray(tsamTechs)) tsamTechs = [];

    var orderTechs = [];
    try {
        orderTechs = typeof r.order_sewing_techniques === 'string' ? JSON.parse(r.order_sewing_techniques) : (r.order_sewing_techniques || []);
    } catch (e) {}
    if (!Array.isArray(orderTechs)) orderTechs = [];

    // Combine unique techniques by ID
    var techniques = [];
    var seenIds = new Set();
    
    function addTechToList(t, isSample) {
        if (!t || !t.id) return;
        var tid = Number(t.id);
        if (!seenIds.has(tid)) {
            seenIds.add(tid);
            techniques.push({
                id: tid,
                name: t.name || '',
                qty: Number(t.qty) || 1,
                fp: Number(t.fp) || 0,
                pp: Number(t.pp) || 0,
                is_sample: isSample
            });
        }
    }

    tsamTechs.forEach(function(t) { addTechToList(t, true); });
    orderTechs.forEach(function(t) { addTechToList(t, false); });

    // Checked technique IDs
    var checkedIds = [];
    try {
        checkedIds = typeof r.checked_techniques === 'string' ? JSON.parse(r.checked_techniques) : (r.checked_techniques || []);
    } catch (e) {}
    if (!Array.isArray(checkedIds)) checkedIds = [];

    var modalId = '_lsxSewingQCModal';
    var existing = document.getElementById(modalId);
    if (existing) existing.remove();

    var h = '<div id="' + modalId + '">';
    h += '<style>';
    h += '#' + modalId + ' { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(15, 23, 42, 0.65); backdrop-filter: blur(8px); z-index: 99999; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.25s ease; }';
    h += '#' + modalId + '.show { opacity: 1; }';
    h += '#' + modalId + ' .bpc-modal { background: #ffffff; border-radius: 20px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); transform: scale(0.9); transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); overflow: hidden; }';
    h += '#' + modalId + '.show .bpc-modal { transform: scale(1); }';
    h += '.lsx-modal-tech-cb { accent-color: #2563eb; }';
    h += '#lsxSewTechBody tr:hover { background-color: #f8fafc; }';
    h += '</style>';
    h += '<div class="bpc-modal" style="width: 700px; max-width: 95vw; max-height: 90vh; display: flex; flex-direction: column;">';
    
    // Header
    h += '<div class="bpc-modal-header" style="background: linear-gradient(135deg, #2563eb, #3b82f6); color: #fff; padding: 18px 24px; display: flex; align-items: center; gap: 12px;">';
    h += '<div class="m-icon" style="font-size:28px;">🔎</div>';
    h += '<div>';
    h += '<div class="m-title" style="font-size:16px; font-weight:800;">Chi Tiết Kiểm Tra & Đơn Giá</div>';
    h += '<div class="m-sub" style="font-size:11px; opacity:0.85; margin-top:2px;">Đơn hàng #' + (r.order_code || '—') + ' — ' + (r.product_name || '—') + '</div>';
    h += '</div>';
    h += '</div>';

    // Body
    h += '<div class="bpc-modal-body" style="padding: 20px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 15px;">';
    
    // Info block
    var assignee = r.contractor_id ? '🏭 Gia công: ' + (r.contractor_name || '') : '👥 Tổ may: ' + (r.worker_name || '');
    h += '<div style="background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 13px; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 10px;">';
    h += '<div><b>Đối tượng:</b> ' + assignee + '</div>';
    h += '<div><b>Số lượng may:</b> <span style="color: #0d9488; font-weight: 700;">' + r.quantity + ' sp</span></div>';
    h += '</div>';

    // QC Missing & Price details sections
    var qcMissingNotes = r.qc_missing_notes || '';
    var qcEvidenceImages = [];
    try {
        qcEvidenceImages = typeof r.qc_evidence_images === 'string' ? JSON.parse(r.qc_evidence_images) : (r.qc_evidence_images || []);
    } catch(e) {}
    if (!Array.isArray(qcEvidenceImages)) qcEvidenceImages = [];

    var hasQCMissing = (qcMissingNotes && qcMissingNotes !== '—') || qcEvidenceImages.length > 0;
    if (hasQCMissing) {
        h += '<div style="border: 1px dashed #fca5a5; background: #fff5f5; border-radius: 12px; padding: 16px; margin-top: 12px; display: flex; flex-direction: column; gap: 10px;">';
        h += '<div style="font-size: 13px; font-weight: 800; color: #ef4444; display: flex; align-items: center; gap: 6px;">⚠️ CHI TIẾT KỸ THUẬT MAY THIẾU</div>';
        if (qcMissingNotes && qcMissingNotes !== '—') {
            h += '<div style="background: #fef2f2; color: #ef4444; border: 1px solid #fca5a5; border-radius: 8px; padding: 10px 12px; font-weight: 600; font-size: 13px; line-height: 1.4;">' + qcMissingNotes + '</div>';
        }
        if (qcEvidenceImages.length > 0) {
            h += '<div>';
            h += '<div style="font-size: 12px; font-weight: 700; color: #ef4444; margin-bottom: 6px;">Ảnh May Thiếu (Chụp Ảnh) *</div>';
            h += '<div style="display: flex; gap: 8px; flex-wrap: wrap;">';
            qcEvidenceImages.forEach(function(imgSrc) {
                h += '<img src="' + imgSrc + '" style="width: 70px; height: 70px; object-fit: cover; border-radius: 6px; border: 1px solid #fca5a5; cursor: pointer; transition: transform 0.15s;" onclick="window.open(\'' + imgSrc + '\', \'_blank\')" title="Xem ảnh đầy đủ" onmouseover="this.style.transform=\'scale(1.05)\'" onmouseout="this.style.transform=\'scale(1)\'">';
            });
            h += '</div>';
            h += '</div>';
        }
        h += '</div>';
    }

    var hasTechNotes = r.notes && r.notes.startsWith('[THIẾU GIÁ CHI TIẾT]');
    var techImages = [];
    try {
        techImages = typeof r.qc_missing_price_images === 'string' ? JSON.parse(r.qc_missing_price_images) : (r.qc_missing_price_images || []);
    } catch(e) {}
    if (!Array.isArray(techImages)) techImages = [];

    if (hasTechNotes || techImages.length > 0) {
        var detailStr = hasTechNotes ? r.notes.replace('[THIẾU GIÁ CHI TIẾT]', '').trim() : '';
        h += '<div style="border: 1px solid #e2e8f0; background: #f8fafc; border-radius: 12px; padding: 16px; margin-top: 12px; display: flex; flex-direction: column; gap: 12px; border-left: 4px solid #ef4444;">';
        h += '<div style="font-size: 13px; font-weight: 800; color: #1e293b; display: flex; align-items: center; gap: 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">⚠️ BÁO LỖI / THIẾU KỸ THUẬT</div>';
        
        // Checkbox row
        h += '<div style="display: flex; align-items: center; gap: 8px;">';
        h += '<input type="checkbox" checked disabled style="width: 18px; height: 18px; accent-color: #ef4444; cursor: not-allowed;">';
        h += '<span style="font-size: 13px; font-weight: 700; color: #ef4444;">Thiếu Kỹ Thuật May</span>';
        h += '</div>';
        
        // Detail row
        if (detailStr) {
            h += '<div>';
            h += '<div style="font-size: 12px; font-weight: 700; color: #ef4444; margin-bottom: 6px;">Chi tiết thiếu kỹ thuật may (Bắt buộc):</div>';
            h += '<div style="background: #fff5f5; color: #b91c1c; border: 1px solid #fca5a5; border-radius: 8px; padding: 10px 12px; font-size: 13px; line-height: 1.4; white-space: pre-wrap; font-weight: 500;">' + detailStr + '</div>';
            h += '</div>';
        }
        
        // Images row
        if (techImages.length > 0) {
            h += '<div style="border: 1px dashed #fca5a5; background: #fff5f5; border-radius: 8px; padding: 12px; margin-top: 6px;">';
            h += '<div style="font-size: 12px; font-weight: 700; color: #ef4444; margin-bottom: 6px;">Ảnh Thiếu Kỹ Thuật (Bắt buộc) *</div>';
            h += '<div style="display: flex; gap: 8px; flex-wrap: wrap;">';
            techImages.forEach(function(imgSrc) {
                h += '<img src="' + imgSrc + '" style="width: 70px; height: 70px; object-fit: cover; border-radius: 6px; border: 1px solid #fca5a5; cursor: pointer; transition: transform 0.15s;" onclick="window.open(\'' + imgSrc + '\', \'_blank\')" title="Xem ảnh đầy đủ" onmouseover="this.style.transform=\'scale(1.05)\'" onmouseout="this.style.transform=\'scale(1)\'">';
            });
            h += '</div>';
            h += '</div>';
        }
        
        h += '</div>';
    }

    if (hasQCMissing || hasTechNotes || techImages.length > 0) {
        h += '<div style="margin-bottom: 12px;"></div>';
    }

    // Techniques Card
    h += '<div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; display: flex; flex-direction: column; gap: 12px; border-left: 4px solid #6366f1;">';
    h += '<div style="font-size: 13px; font-weight: 800; color: #4f46e5; display: flex; align-items: center; gap: 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">✂️ KỸ THUẬT MAY</div>';
    
    h += '<div style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; max-height: 200px; overflow-y: auto;">';
    h += '<table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left;">';
    h += '<thead style="background: #0f172a; font-weight: 700; color: #ffffff; position: sticky; top: 0; z-index: 10;">';
    h += '<tr>';
    h += '<th style="padding: 10px; width: 60px; text-align: center; color: #ffffff;">TÍCH</th>';
    h += '<th style="padding: 10px; color: #ffffff;">KỸ THUẬT</th>';
    h += '<th style="padding: 10px; width: 60px; text-align: center; color: #ffffff;">SL</th>';
    h += '<th style="padding: 10px; text-align: right; width: 120px; color: #10b981;">MAY NHÀ</th>';
    h += '<th style="padding: 10px; text-align: right; width: 120px; color: #3b82f6;">MAY GC</th>';
    h += '</tr>';
    h += '</thead>';
    h += '<tbody id="lsxSewTechBody">';
    h += '</tbody>';
    h += '</table>';
    h += '</div>';

    h += '<div style="background: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; padding: 10px; text-align: center; font-size: 13px; font-weight: 700; color: #1e293b;">';
    h += '💰 Tổng giá may &nbsp;|&nbsp; ';
    h += '<span style="color: #059669;">MAY NHÀ: <strong id="sumFP">0đ</strong></span> &nbsp;•&nbsp; ';
    h += '<span style="color: #2563eb;">MAY GC: <strong id="sumPP">0đ</strong></span>';
    h += '</div>';

    h += '</div>';

    h += '<div style="margin-bottom: 12px;"></div>';

    // Add Technique Form
    h += '<div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 15px; border-radius: 10px; display: flex; flex-direction: column; gap: 10px;">';
    h += '<div style="font-size: 11px; font-weight: 800; color: #166534; text-transform: uppercase; letter-spacing: 0.5px;">➕ Thêm Kỹ Thuật May Mới</div>';
    h += '<div style="display: flex; gap: 8px; flex-wrap: wrap;">';
    h += '<input type="text" id="newTechName" placeholder="Tên kỹ thuật..." style="flex: 2; min-width: 150px; padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;">';
    h += '<input type="number" id="newTechQty" value="1" min="1" placeholder="SL..." disabled style="width: 60px; padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; text-align: center; background-color: #f1f5f9; color: #64748b; cursor: not-allowed;">';
    h += '<input type="number" id="newTechFP" placeholder="Giá Nhà..." style="flex: 1; min-width: 90px; padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; text-align: right;">';
    h += '<input type="number" id="newTechPP" placeholder="Giá GC..." style="flex: 1; min-width: 90px; padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; text-align: right;">';
    h += '<button type="button" onclick="_lsxAddSewingTech(' + id + ')" style="background: #166534; color: #fff; padding: 6px 15px; border: none; border-radius: 6px; font-weight: 700; cursor: pointer; font-size: 13px; transition: background 0.15s;">Thêm</button>';
    h += '</div>';
    h += '<div id="newTechError" style="color: #dc2626; font-size: 11px; font-weight: 600; display: none;"></div>';
    h += '</div>';

    // Summary Totals
    h += '<div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 10px; display: flex; flex-direction: column; gap: 8px; font-size: 14px;">';
    
    h += '<div style="display: flex; justify-content: space-between; font-size: 15px;">';
    h += '<span><b>' + (r.contractor_id ? 'Lương Gia Công:' : 'Lương Thợ (May Nhà):') + '</b></span>';
    h += '<span id="sumSalTho" style="font-weight: 800; color: #166534;">0đ</span>';
    h += '</div>';
    if (!r.contractor_id) {
        h += '<div style="display: flex; justify-content: space-between; font-size: 15px;">';
        h += '<span><b>Lương CPM (May GC):</b></span>';
        h += '<span id="sumSalCPM" style="font-weight: 800; color: #2563eb;">0đ</span>';
        h += '</div>';
    }
    h += '</div>';

    h += '</div>'; // End body

    // Actions
    h += '<div class="bpc-modal-actions" style="display: flex; gap: 10px; padding: 16px 24px; border-top: 1px solid #f1f5f9;">';
    h += '<button class="bpc-modal-btn cancel" onclick="_lsxCloseSewingQCModal()" style="flex: 1; padding: 12px; border: none; border-radius: 10px; font-size: 14px; font-weight: 700; cursor: pointer; transition: all .15s; background: #f1f5f9; color: #475569;">Hủy</button>';
    h += '<button class="bpc-modal-btn confirm" onclick="_lsxSaveAndApproveSewing(' + id + ')" style="flex: 1; padding: 12px; border: none; border-radius: 10px; font-size: 14px; font-weight: 700; cursor: pointer; transition: all .15s; background: linear-gradient(135deg, #2563eb, #3b82f6); color: #fff; box-shadow: 0 4px 15px rgba(37, 99, 235, 0.3);">Lưu & Duyệt Lương</button>';
    h += '</div>';

    h += '</div></div>';

    document.body.insertAdjacentHTML('beforeend', h);
    
    window._lsxCurrentModalRecord = r;
    window._lsxCurrentModalTechs = techniques;
    window._lsxCurrentModalChecked = checkedIds;

    _lsxRenderModalTechs();

    setTimeout(function() {
        var m = document.getElementById(modalId);
        if (m) m.classList.add('show');
    }, 50);
}

function _lsxCloseSewingQCModal() {
    var m = document.getElementById('_lsxSewingQCModal');
    if (m) {
        m.classList.remove('show');
        setTimeout(function() {
            m.remove();
        }, 300);
    }
    delete window._lsxCurrentModalRecord;
    delete window._lsxCurrentModalTechs;
    delete window._lsxCurrentModalChecked;
}

function _lsxRenderModalTechs() {
    var tbody = document.getElementById('lsxSewTechBody');
    if (!tbody) return;

    var techniques = window._lsxCurrentModalTechs || [];
    var checkedIds = window._lsxCurrentModalChecked || [];

    tbody.innerHTML = '';
    if (techniques.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#64748b; padding:15px;">Không có dữ liệu kỹ thuật</td></tr>';
        return;
    }

    techniques.forEach(function(tech) {
        var isChecked = checkedIds.indexOf(tech.id) >= 0;
        var checkedAttr = isChecked ? 'checked' : '';
        var row = document.createElement('tr');
        row.style.borderBottom = '1px solid #f1f5f9';
        
        row.innerHTML = `
            <td style="text-align: center; padding: 10px;">
                <input type="checkbox" class="lsx-modal-tech-cb" data-id="${tech.id}" ${checkedAttr} onchange="_lsxOnModalTechCheckChange(${tech.id}, this.checked)" style="width:18px; height:18px; cursor:pointer;">
            </td>
            <td style="padding: 10px; font-weight: 600; color: #1e293b;">${tech.name || ''}</td>
            <td style="padding: 10px; text-align: center; color: #64748b;">${tech.qty || 1}</td>
            <td style="padding: 10px; text-align: right; color: #166534; font-weight: 600;">${Number(tech.fp || 0).toLocaleString('vi-VN')}đ</td>
            <td style="padding: 10px; text-align: right; color: #2563eb; font-weight: 600;">${Number(tech.pp || 0).toLocaleString('vi-VN')}đ</td>
        `;
        tbody.appendChild(row);
    });

    _lsxRecalcModalTotals();
}

function _lsxOnModalTechCheckChange(id, isChecked) {
    var checkedIds = window._lsxCurrentModalChecked || [];
    var idx = checkedIds.indexOf(id);
    if (isChecked) {
        if (idx === -1) checkedIds.push(id);
    } else {
        if (idx !== -1) checkedIds.splice(idx, 1);
    }
    window._lsxCurrentModalChecked = checkedIds;
    _lsxRecalcModalTotals();
}

function _lsxRecalcModalTotals() {
    var techniques = window._lsxCurrentModalTechs || [];
    var checkedIds = window._lsxCurrentModalChecked || [];
    var r = window._lsxCurrentModalRecord;
    if (!r) return;

    var totalFP = 0;
    var totalPP = 0;

    techniques.forEach(function(tech) {
        if (checkedIds.indexOf(tech.id) >= 0) {
            totalFP += (Number(tech.fp) || 0) * (Number(tech.qty) || 1);
            totalPP += (Number(tech.pp) || 0) * (Number(tech.qty) || 1);
        }
    });

    var quantity = Number(r.quantity) || 0;
    var isContractor = !!r.contractor_id;
    var unitPrice = isContractor ? totalPP : totalFP;
    var totalSalTho = quantity * unitPrice;
    var totalSalCPM = quantity * totalPP;

    var elFP = document.getElementById('sumFP');
    var elPP = document.getElementById('sumPP');
    var elTho = document.getElementById('sumSalTho');
    var elCPM = document.getElementById('sumSalCPM');

    if (elFP) elFP.textContent = totalFP.toLocaleString('vi-VN') + 'đ';
    if (elPP) elPP.textContent = totalPP.toLocaleString('vi-VN') + 'đ';
    if (elTho) elTho.innerHTML = '<span style="color:#64748b; font-size:13px; font-weight:normal;">' + quantity + ' sp x ' + unitPrice.toLocaleString('vi-VN') + 'đ = </span>' + totalSalTho.toLocaleString('vi-VN') + 'đ';
    if (elCPM) elCPM.innerHTML = '<span style="color:#64748b; font-size:13px; font-weight:normal;">' + quantity + ' sp x ' + totalPP.toLocaleString('vi-VN') + 'đ = </span>' + totalSalCPM.toLocaleString('vi-VN') + 'đ';
}

function _lsxAddSewingTech(recordId) {
    var errEl = document.getElementById('newTechError');
    if (errEl) {
        errEl.style.display = 'none';
        errEl.textContent = '';
    }

    var nameEl = document.getElementById('newTechName');
    var qtyEl = document.getElementById('newTechQty');
    var fpEl = document.getElementById('newTechFP');
    var ppEl = document.getElementById('newTechPP');

    var name = nameEl ? nameEl.value.trim() : '';
    var qty = 1;
    var fpRaw = fpEl ? fpEl.value.trim() : '';
    var ppRaw = ppEl ? ppEl.value.trim() : '';

    if (!name) {
        if (errEl) {
            errEl.textContent = 'Vui lòng nhập tên kỹ thuật!';
            errEl.style.display = 'block';
        }
        return;
    }

    if (fpRaw === '' || ppRaw === '') {
        if (errEl) {
            errEl.textContent = 'Bắt buộc phải điền đầy đủ cả giá may nhà và giá may GC!';
            errEl.style.display = 'block';
        }
        return;
    }

    var fp = Number(fpRaw);
    var pp = Number(ppRaw);

    if (isNaN(fp) || fp < 0 || isNaN(pp) || pp < 0) {
        if (errEl) {
            errEl.textContent = 'Đơn giá phải là số lớn hơn hoặc bằng 0!';
            errEl.style.display = 'block';
        }
        return;
    }

    var newId = Date.now();
    var newTech = {
        id: newId,
        name: name,
        qty: qty,
        fp: fp,
        pp: pp,
        is_sample: false
    };

    window._lsxCurrentModalTechs.push(newTech);
    window._lsxCurrentModalChecked.push(newId);

    if (nameEl) nameEl.value = '';
    if (qtyEl) qtyEl.value = '1';
    if (fpEl) fpEl.value = '';
    if (ppEl) ppEl.value = '';

    _lsxRenderModalTechs();
}

async function _lsxSaveAndApproveSewing(id) {
    var r = window._lsxCurrentModalRecord;
    var techniques = window._lsxCurrentModalTechs || [];
    var checkedIds = window._lsxCurrentModalChecked || [];
    if (!r) return;

    var orderTechs = techniques.filter(function(t) { return !t.is_sample; }).map(function(t) {
        return {
            id: t.id,
            name: t.name,
            qty: t.qty,
            fp: t.fp,
            pp: t.pp
        };
    });

    var totalFP = 0;
    var totalPP = 0;
    techniques.forEach(function(t) {
        if (checkedIds.indexOf(t.id) >= 0) {
            totalFP += (Number(t.fp) || 0) * (Number(t.qty) || 1);
            totalPP += (Number(t.pp) || 0) * (Number(t.qty) || 1);
        }
    });

    var isContractor = !!r.contractor_id;
    var checkedPriceVal = isContractor ? totalPP : totalFP;

    try {
        var saveRes = await apiCall('/api/production-salary/sewing/' + id + '/techniques', 'POST', {
            sewing_techniques: orderTechs,
            checked_techniques: checkedIds,
            checked_price: checkedPriceVal
        });

        if (saveRes && saveRes.error) {
            showToast(saveRes.error, 'error');
            return;
        }

        var approveRes = await apiCall('/api/production-salary/toggle/sewing/' + id, 'POST', { approved: true });
        if (approveRes && approveRes.error) {
            showToast(approveRes.error, 'error');
            return;
        }

        showToast('Lưu kỹ thuật và duyệt lương thành công!');
        _lsxCloseSewingQCModal();
        await _lsxLoadAll();
    } catch (e) {
        console.error(e);
        showToast(e.message || 'Lỗi khi thực hiện thao tác', 'error');
    }
}

async function _lsxOpenCuttingQCModal(id) {
    if (window._lsxDetailBusy) return;
    window._lsxDetailBusy = true;
    try {
        var res = await apiCall('/api/cutting/records/' + id);
        var r = res.record;
        if (!r) return;

        var old = document.getElementById('_bpeCuttingQCModal'); if (old) old.remove();

        var matColor = (r.material_name || '—') + ' · ' + (r.fabric_color || '—');
        var statusTxt = r.is_cut_done ? '✅ Đã cắt xong' : r.is_cutting ? '✂️ Đang cắt' : '⏳ Chờ cắt';
        var statusBg = r.is_cut_done ? '#059669' : r.is_cutting ? '#dc2626' : '#6366f1';

        var rolls = [];
        try { rolls = typeof r.selected_roll_ids === 'string' ? JSON.parse(r.selected_roll_ids) : (r.selected_roll_ids || []); } catch(e) {}
        var rollsHtml = '';
        if (rolls.length) {
            rolls.forEach(function(rl, idx) {
                rollsHtml += '<div style="padding:8px 14px;border:1.5px solid #f1f5f9;border-radius:10px;margin-bottom:6px;font-size:13px;font-weight:600;color:#1e293b;text-align:left;">' + (rl.label || rl.roll_code || 'Cây '+(idx+1)) + '</div>';
            });
        } else {
            rollsHtml += '<div style="text-align:center;padding:12px;color:#94a3b8;font-size:12px">Chưa có dữ liệu cây vải</div>';
        }

        var cutDoneStr = '—';
        if (r.cut_done_at) {
            cutDoneStr = _lsxFormatWorkDate({ is_completed: true, completion_time: r.cut_done_at });
        } else if (r.cut_date) {
            cutDoneStr = _lsxDetailFmtDate(r.cut_date);
        }

        var h = '<div class="bpc-modal-overlay" id="_bpeCuttingQCModal" onclick="if(event.target===this)this.classList.remove(\'show\'),setTimeout(function(){document.getElementById(\'_bpeCuttingQCModal\').remove()},300)">';
        h += '<div class="bpc-modal" style="width:560px; max-height:95vh; overflow-y:auto; display:flex; flex-direction:column;">';
        h += '<div class="bpc-modal-header" style="background:linear-gradient(135deg,' + statusBg + ',' + statusBg + 'cc)"><div class="m-icon">📋</div><div><div class="m-title">DUYỆT LƯƠNG ĐƠN CẮT</div><div class="m-sub">' + statusTxt + '</div></div></div>';
        h += '<div class="bpc-modal-body" style="overflow-y:auto; flex:1; padding:16px 20px; font-size:12px;">';

        // Info grid
        h += '<div style="background:#f8fafc; border-radius:8px; padding:12px; margin-bottom:16px; border:1px solid #e2e8f0; display:grid; grid-template-columns:1fr 1fr; gap:8px; text-align:left;">';
        h += '<div>👕 <strong>Sản phẩm:</strong> <span>' + (r.product_name || '—') + '</span></div>';
        h += '<div>🎨 <strong>Chất liệu/Màu:</strong> <span>' + matColor + '</span></div>';
        h += '<div>👤 <strong>CSKH:</strong> <span>' + (r.cskh_name || '—') + '</span></div>';
        h += '<div>🏷️ <strong>Sản Phẩm Cắt:</strong> <span style="background:#dbeafe;color:#1d4ed8;padding:2px 6px;border-radius:4px;font-weight:700;">' + (r.cutting_category || '—') + '</span></div>';
        h += '<div>👤 <strong>NV Cắt:</strong> <span style="color:#059669;font-weight:700;">' + (r.cutter_name || '—') + '</span></div>';
        h += '<div>📅 <strong>Cắt Xong:</strong> <span>' + cutDoneStr + '</span></div>';
        h += '<div style="grid-column: span 2;">📦 <strong>SL Đơn:</strong> <span style="color:#0369a1; font-weight:700;">' + _lsxDetailFormatOrderQty(r.order_quantity, r.product_name, r.cutting_category) + '</span></div>';
        h += '</div>';

        // Shared or Warning
        if (r.cut_warning) {
            h += '<div style="background:#fee2e2; border:1px solid #fca5a5; border-radius:8px; padding:8px 12px; margin-bottom:12px; color:#b91c1c; text-align:left; font-weight:600;">⚠️ Cảnh báo: ' + r.cut_warning + '</div>';
        }
        if (r.cut_shared) {
            h += '<div style="background:#e0e7ff; border:1px solid #c7d2fe; border-radius:8px; padding:8px 12px; margin-bottom:12px; color:#4338ca; text-align:left; font-weight:600;">🔄 Cắt chung: ' + r.cut_shared + '</div>';
        }

        // Selected rolls
        h += '<div style="border:1px solid #e2e8f0; border-radius:12px; padding:14px; margin-bottom:16px; background:#f8fafc; border-left:4px solid #059669;">';
        h += '<div style="font-size:11px; font-weight:800; color:#059669; text-transform:uppercase; letter-spacing:1px; margin-bottom:10px; text-align:left;">📦 CÂY VẢI ĐÃ CHỌN (' + rolls.length + ')</div>';
        h += rollsHtml;
        h += '</div>';

        // Kg stats grid
        h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px;">';
        h += '<div style="background:#fef3c7;padding:10px;border-radius:10px;text-align:center;border:1px solid #fde68a;"><div style="font-size:9px;font-weight:700;color:#92400e">⚖️ KG ĐẦU</div><div style="font-size:18px;font-weight:900;color:#b45309">' + _lsxDetailFmtKg(r.kg_start) + '</div></div>';
        h += '<div style="background:#fee2e2;padding:10px;border-radius:10px;text-align:center;border:1px solid #fca5a5;"><div style="font-size:9px;font-weight:700;color:#991b1b">⚖️ KG CUỐI</div><div style="font-size:18px;font-weight:900;color:#dc2626">' + _lsxDetailFmtKg(r.kg_end) + '</div></div>';
        h += '<div style="background:#dcfce7;padding:10px;border-radius:10px;text-align:center;border:1px solid #bbf7d0;"><div style="font-size:9px;font-weight:700;color:#166534">✂️ KG CẮT</div><div style="font-size:18px;font-weight:900;color:#059669">' + _lsxDetailFmtKg(r.kg_cut) + '</div></div>';
        h += '<div style="background:#dbeafe;padding:10px;border-radius:10px;text-align:center;border:1px solid #bfdbfe;"><div style="font-size:9px;font-weight:700;color:#1e40af">📦 SL CẮT</div><div style="font-size:18px;font-weight:900;color:#2563eb">' + (r.cut_quantity||r.quantity||0) + ' sp</div></div>';
        h += '</div>';

        // Salary Calculation
        var cutQty = r.cut_quantity || r.quantity || 0;
        var uPrice = r.unit_price || 0;
        var salary = r.salary || 0;
        h += '<div style="background:#fff7ed; padding:14px; border-radius:12px; text-align:center; border:1px solid #ffedd5; margin-bottom:16px; box-shadow: 0 4px 15px rgba(234, 88, 12, 0.05);">';
        h += '<div style="font-size:10px; font-weight:800; color:#c2410c; text-transform:uppercase; letter-spacing:1px; margin-bottom:6px;">💰 TỔNG LƯƠNG CẮT</div>';
        h += '<div style="font-size:18px; font-weight:900; color:#ea580c">';
        h += cutQty + ' sp x ' + _lsxFN(uPrice) + 'đ = ' + _lsxFN(salary) + ' đ';
        h += '</div>';
        h += '</div>';

        h += '</div>'; // End body

        // Footer actions
        h += '<div class="bpc-modal-actions" style="display: flex; gap: 10px; padding: 16px 24px; border-top: 1px solid #f1f5f9; background:#fff;">';
        h += '<button class="bpc-modal-btn cancel" style="flex: 1; padding: 12px; border: none; border-radius: 10px; font-size: 14px; font-weight: 700; cursor: pointer; transition: all .15s; background: #f1f5f9; color: #475569;" onclick="var m=document.getElementById(\'_bpeCuttingQCModal\');if(m){m.classList.remove(\'show\');setTimeout(function(){m.remove()},300)}">Hủy</button>';
        if (r.salary_approved) {
            h += '<button class="bpc-modal-btn confirm" style="flex: 1; padding: 12px; border: none; border-radius: 10px; font-size: 14px; font-weight: 700; cursor: pointer; transition: all .15s; background: #dc2626; color: #fff; box-shadow: 0 4px 15px rgba(220, 38, 38, 0.3);" onclick="_lsxSubmitCuttingApprove(' + id + ', false)">HỦY DUYỆT LƯƠNG</button>';
        } else {
            h += '<button class="bpc-modal-btn confirm" style="flex: 1; padding: 12px; border: none; border-radius: 10px; font-size: 14px; font-weight: 700; cursor: pointer; transition: all .15s; background: linear-gradient(135deg, #10b981, #059669); color: #fff; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);" onclick="_lsxSubmitCuttingApprove(' + id + ', true)">DUYỆT LƯƠNG</button>';
        }
        h += '</div>';

        h += '</div></div>';

        document.body.insertAdjacentHTML('beforeend', h);
        setTimeout(function() {
            var m = document.getElementById('_bpeCuttingQCModal');
            if (m) m.classList.add('show');
        }, 50);

    } catch(e) {
        console.error(e);
        alert('Lỗi tải thông tin phiếu cắt');
    } finally {
        window._lsxDetailBusy = false;
    }
}

async function _lsxSubmitCuttingApprove(id, approved) {
    try {
        var res = await apiCall('/api/production-salary/toggle/cutting/' + id, 'POST', { approved: approved });
        if (res && res.error) {
            showToast(res.error, 'error');
            return;
        }
        showToast('Cập nhật trạng thái duyệt thành công');
        var m = document.getElementById('_bpeCuttingQCModal');
        if (m) {
            m.classList.remove('show');
            setTimeout(function() { m.remove(); }, 300);
        }
        await _lsxLoadAll();
    } catch(e) {
        console.error(e);
        showToast(e.message || 'Lỗi khi cập nhật trạng thái', 'error');
    }
}

async function _lsxOpenPressingQCModal(id) {
    if (window._lsxDetailBusy) return;
    window._lsxDetailBusy = true;
    try {
        var res = await apiCall('/api/pressing/records/' + id);
        var r = res.record;
        if (!r) return;

        var old = document.getElementById('_bpeQCModal'); if (old) old.remove();

        var matColor = (r.material_name || '—') + ' · ' + (r.fabric_color || '—');
        var statusTxt = r.is_reported ? '✅ Đã báo cáo' : '⏳ Chờ báo cáo';
        var statusBg = r.is_reported ? '#059669' : '#ea580c';

        var h = '<div class="bpc-modal-overlay" id="_bpeQCModal" onclick="if(event.target===this)this.classList.remove(\'show\'),setTimeout(function(){document.getElementById(\'_bpeQCModal\').remove()},300)">';
        h += '<div class="bpc-modal" style="width:560px; max-height:95vh; overflow-y:auto; display:flex; flex-direction:column;">';
        h += '<div class="bpc-modal-header" style="background:linear-gradient(135deg,' + statusBg + ',' + statusBg + 'cc)"><div class="m-icon">📋</div><div><div class="m-title">DUYỆT LƯƠNG PHIẾU ÉP</div><div class="m-sub">' + statusTxt + '</div></div></div>';
        h += '<div class="bpc-modal-body" style="overflow-y:auto; flex:1; padding:16px 20px; font-size:12px;">';

        // Info grid
        h += '<div style="background:#f8fafc; border-radius:8px; padding:12px; margin-bottom:16px; border:1px solid #e2e8f0; display:grid; grid-template-columns:1fr 1fr; gap:8px;">';
        h += '<div>👕 <strong>Sản phẩm:</strong> <span>' + (r.product_name || '—') + '</span></div>';
        h += '<div>🎨 <strong>Chất liệu/Màu:</strong> <span>' + matColor + '</span></div>';
        h += '<div>👤 <strong>CSKH:</strong> <span>' + (r.cskh_name || '—') + '</span></div>';
        h += '<div>📦 <strong>SL Cắt:</strong> <span style="color:#0369a1; font-weight:700;">' + (r.order_quantity || 0) + ' sp</span></div>';
        h += '<div>🔥 <strong>NV Ép:</strong> <span>' + (r.presser_name || '—') + '</span></div>';
        h += '<div>📅 <strong>Ép Xong:</strong> <span>' + (r.reported_at ? _lsxFormatWorkDate({ is_completed: true, completion_time: r.reported_at }) : '—') + '</span></div>';
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
        h += '<div class="bpc-modal-actions" style="display: flex; gap: 10px; padding: 16px 24px; border-top: 1px solid #f1f5f9;">';
        h += '<button class="bpc-modal-btn cancel" style="flex: 1; padding: 12px; border: none; border-radius: 10px; font-size: 14px; font-weight: 700; cursor: pointer; transition: all .15s; background: #f1f5f9; color: #475569;" onclick="var m=document.getElementById(\'_bpeQCModal\');if(m){m.classList.remove(\'show\');setTimeout(function(){m.remove()},300)}">Hủy</button>';
        
        if (r.salary_approved) {
            h += '<button class="bpc-modal-btn confirm" style="flex: 1; padding: 12px; border: none; border-radius: 10px; font-size: 14px; font-weight: 700; cursor: pointer; transition: all .15s; background: #dc2626; color: #fff; box-shadow: 0 4px 15px rgba(220, 38, 38, 0.3);" onclick="_lsxSubmitPressingApprove(' + id + ', false)">HỦY DUYỆT LƯƠNG</button>';
        } else {
            h += '<button class="bpc-modal-btn confirm" style="flex: 1; padding: 12px; border: none; border-radius: 10px; font-size: 14px; font-weight: 700; cursor: pointer; transition: all .15s; background: linear-gradient(135deg, #10b981, #059669); color: #fff; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);" onclick="_lsxSubmitPressingApprove(' + id + ', true)">DUYỆT LƯƠNG</button>';
        }
        h += '</div>';

        h += '</div></div>';

        document.body.insertAdjacentHTML('beforeend', h);
        setTimeout(function() {
            var m = document.getElementById('_bpeQCModal');
            if (m) m.classList.add('show');
        }, 50);

    } catch(e) {
        console.error(e);
        alert('Lỗi tải thông tin phiếu ép');
    } finally {
        window._lsxDetailBusy = false;
    }
}

async function _lsxSubmitPressingApprove(id, approved) {
    try {
        var res = await apiCall('/api/production-salary/toggle/pressing/' + id, 'POST', { approved: approved });
        if (res && res.error) {
            showToast(res.error, 'error');
            return;
        }
        showToast('Cập nhật trạng thái duyệt thành công');
        var m = document.getElementById('_bpeQCModal');
        if (m) {
            m.classList.remove('show');
            setTimeout(function() { m.remove(); }, 300);
        }
        await _lsxLoadAll();
    } catch(e) {
        console.error(e);
        showToast(e.message || 'Lỗi khi cập nhật trạng thái', 'error');
    }
}

function _lsxOpenBulkPressingQCModal() {
    var records = [];
    _lsx.selectedRecords.forEach(function(sel) {
        var r = _lsx.records.find(function(x) { return x.id === sel.id && x.dept === 'pressing'; });
        if (r) records.push(r);
    });

    if (records.length === 0) {
        showToast('Không tìm thấy dữ liệu các dòng đã chọn', 'error');
        return;
    }

    var old = document.getElementById('_bpeBulkQCModal'); if (old) old.remove();

    var itemRowsHtml = '';
    var grandTotal = 0;

    records.forEach(function(r) {
        var orderCode = r.order_code || '—';
        var prodName = r.product_name || '—';
        var workerName = r.worker_name || '—';
        var salary = Number(r.salary) || 0;
        grandTotal += salary;

        var positionsHtml = '';
        (window._bpePositions || []).forEach(function(pos) {
            var val = Number(r[pos.key_code]) || 0;
            if (val > 0) {
                var prcCol = pos.key_code.startsWith('pos_') && !['pos_chest_arm', 'pos_back_belly', 'pos_protective', 'pos_packaging', 'pos_other'].includes(pos.key_code)
                    ? 'price_' + pos.key_code
                    : pos.key_code.replace('pos_', 'price_');
                var price = Number(r[prcCol]) || 0;
                var cost = val * price;

                positionsHtml += `
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:4px 0; border-bottom:1px dashed #e2e8f0;">
                        <span style="color:#64748b; font-weight:600;">📍 ${pos.display_name}</span>
                        <span style="color:#334155; font-weight:700;">
                            ${val} sp <span style="color:#94a3b8; font-weight:normal; margin:0 2px;">x</span> ${Number(price).toLocaleString('vi-VN')}đ 
                            <span style="color:#94a3b8; font-weight:normal; margin:0 2px;">=</span> 
                            <span style="color:#0d9488; font-weight:800;">${Number(cost).toLocaleString('vi-VN')}đ</span>
                        </span>
                    </div>
                `;
            }
        });

        if (!positionsHtml) {
            positionsHtml = '<div style="color:#94a3b8; font-style:italic; font-size:11px; padding:4px 0;">Không có vị trí ép nào được khai báo</div>';
        }

        itemRowsHtml += `
            <div style="background:#fff; border:1px solid #e2e8f0; border-radius:10px; padding:12px; margin-bottom:12px; box-shadow:0 2px 4px rgba(0,0,0,0.02); text-align:left;">
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e2e8f0; padding-bottom:6px; margin-bottom:8px;">
                    <div style="flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; padding-right:10px;">
                        <span style="background:#e0f2fe; color:#0369a1; padding:2px 6px; border-radius:4px; font-weight:800; font-size:10px; margin-right:6px; display:inline-block; vertical-align:middle;">${orderCode}</span>
                        <span style="color:#1e293b; font-weight:700; font-size:12px; vertical-align:middle;">${prodName}</span>
                    </div>
                    <span style="color:#475569; font-weight:600; font-size:11px; flex-shrink:0;">👤 ${workerName}</span>
                </div>
                
                <div style="background:#f8fafc; border-radius:6px; padding:6px 10px;">
                    ${positionsHtml}
                </div>
                
                <div style="display:flex; justify-content:flex-end; align-items:center; margin-top:8px; font-size:11px;">
                    <span style="color:#64748b; font-weight:600; margin-right:6px;">Lương đơn:</span>
                    <span style="color:#ea580c; font-weight:800; font-size:12.5px;">${Number(salary).toLocaleString('vi-VN')} đ</span>
                </div>
            </div>
        `;
    });

    var h = '<div class="bpc-modal-overlay" id="_bpeBulkQCModal" onclick="if(event.target===this)this.classList.remove(\'show\'),setTimeout(function(){document.getElementById(\'_bpeBulkQCModal\').remove()},300)">';
    h += '<div class="bpc-modal" style="width:620px; max-height:95vh; overflow-y:auto; display:flex; flex-direction:column;">';
    h += '<div class="bpc-modal-header" style="background:linear-gradient(135deg,#10b981,#059669)"><div class="m-icon">📋</div><div><div class="m-title">DUYỆT LƯƠNG HÀNG LOẠT — PHIẾU ÉP</div><div class="m-sub">Chi tiết danh sách các đơn hàng ép được chọn để duyệt lương</div></div></div>';
    h += '<div class="bpc-modal-body" style="overflow-y:auto; flex:1; padding:16px 20px; font-size:12px; background:#f1f5f9;">';

    // Scrollable list container
    h += '<div style="max-height:380px; overflow-y:auto; padding-right:4px; margin-bottom:16px;">';
    h += itemRowsHtml;
    h += '</div>';

    // Grand total section
    h += '<div style="background:#fff; border-radius:10px; padding:14px; border:1px solid #bbf7d0; display:flex; justify-content:space-between; align-items:center; box-shadow:0 4px 15px rgba(16, 185, 129, 0.05); text-align:left;">';
    h += '<div>';
    h += '<div style="font-size:10px; font-weight:800; color:#15803d; text-transform:uppercase; letter-spacing:1px; margin-bottom:2px;">💰 TỔNG LƯƠNG TOÀN BỘ CÁC ĐƠN</div>';
    h += '<div style="font-size:11px; color:#475569; font-weight:500;">Duyệt đồng thời ' + records.length + ' bản ghi đã chọn</div>';
    h += '</div>';
    h += '<div style="font-size:20px; font-weight:900; color:#166534">' + Number(grandTotal).toLocaleString('vi-VN') + ' đ</div>';
    h += '</div>';

    h += '</div>'; // End body

    // Footer actions
    h += '<div class="bpc-modal-actions" style="display: flex; gap: 10px; padding: 16px 24px; border-top: 1px solid #e2e8f0; background:#fff;">';
    h += '<button class="bpc-modal-btn cancel" style="flex: 1; padding: 12px; border: none; border-radius: 10px; font-size: 14px; font-weight: 700; cursor: pointer; transition: all .15s; background: #f1f5f9; color: #475569;" onclick="var m=document.getElementById(\'_bpeBulkQCModal\');if(m){m.classList.remove(\'show\');setTimeout(function(){m.remove()},300)}">Hủy</button>';
    h += '<button class="bpc-modal-btn confirm" style="flex: 1; padding: 12px; border: none; border-radius: 10px; font-size: 14px; font-weight: 700; cursor: pointer; transition: all .15s; background: linear-gradient(135deg, #10b981, #059669); color: #fff; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);" onclick="_lsxSubmitBulkPressingApprove()">XÁC NHẬN DUYỆT</button>';
    h += '</div>';

    h += '</div></div>';

    document.body.insertAdjacentHTML('beforeend', h);
    setTimeout(function() {
        var m = document.getElementById('_bpeBulkQCModal');
        if (m) m.classList.add('show');
    }, 50);
}

async function _lsxSubmitBulkPressingApprove() {
    var targets = _lsx.selectedRecords.map(function(r) {
        return { id: r.id, dept: r.dept };
    });

    try {
        showToast('Đang xử lý...', 'info');
        var res = await apiCall('/api/production-salary/approve-bulk', 'POST', {
            records: targets,
            approved: true
        });
        
        if (res && (res.success || res.count !== undefined)) {
            showToast('Duyệt hàng loạt thành công!', 'success');
            
            // Close the bulk QC modal
            var m = document.getElementById('_bpeBulkQCModal');
            if (m) {
                m.classList.remove('show');
                setTimeout(function() { m.remove(); }, 300);
            }
            
            _lsx.selectedRecords = [];
            _lsx.lastSelectedIndex = undefined;
            _lsxUpdateFloatingBar();
            await _lsxLoadAll();
        } else {
            showToast((res && res.error) || 'Có lỗi xảy ra', 'error');
        }
    } catch (e) {
        console.error(e);
        showToast(e.message || 'Lỗi khi duyệt hàng loạt', 'error');
    }
}

function _lsxOpenBulkCuttingQCModal() {
    var records = [];
    _lsx.selectedRecords.forEach(function(sel) {
        var r = _lsx.records.find(function(x) { return x.id === sel.id && x.dept === 'cutting'; });
        if (r) records.push(r);
    });

    if (records.length === 0) {
        showToast('Không tìm thấy dữ liệu các dòng đã chọn', 'error');
        return;
    }

    var old = document.getElementById('_bpeBulkCuttingQCModal'); if (old) old.remove();

    var itemRowsHtml = '';
    var grandTotal = 0;

    records.forEach(function(r) {
        var orderCode = r.order_code || '—';
        var prodName = r.product_name || '—';
        var workerName = r.worker_name || '—';
        var salary = Number(r.salary) || 0;
        grandTotal += salary;

        // Rolls list
        var rolls = [];
        try { rolls = typeof r.selected_roll_ids === 'string' ? JSON.parse(r.selected_roll_ids) : (r.selected_roll_ids || []); } catch(e) {}
        var rollsHtml = '';
        if (rolls.length) {
            var rollsStr = rolls.map(function(rl, idx) {
                return rl.label || rl.roll_code || 'Cây '+(idx+1);
            }).join(', ');
            rollsHtml = `<div>📦 <strong>Cây vải:</strong> <span style="color:#0f172a; font-weight:600;">${rollsStr}</span></div>`;
        }

        // Details grid for start/end kg, cut qty, etc.
        var detailsHtml = `
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px 12px; font-size:11px; color:#475569; padding:6px 0;">
                ${rollsHtml}
                <div>🏷️ <strong>Sản phẩm cắt:</strong> <span style="color:#0f172a; font-weight:600;">${r.cutting_category || '—'}</span></div>
                <div>⚖️ <strong>Kg đầu:</strong> <span style="color:#b45309; font-weight:700;">${_lsxDetailFmtKg(r.kg_start)}</span></div>
                <div>⚖️ <strong>Kg cuối:</strong> <span style="color:#dc2626; font-weight:700;">${_lsxDetailFmtKg(r.kg_end)}</span></div>
                <div>✂️ <strong>Kg cắt:</strong> <span style="color:#059669; font-weight:700;">${_lsxDetailFmtKg(r.kg_cut)}</span></div>
                <div>📦 <strong>SL cắt:</strong> <span style="color:#2563eb; font-weight:700;">${r.cut_quantity || r.quantity || 0} sp</span></div>
            </div>
        `;

        itemRowsHtml += `
            <div style="background:#fff; border:1px solid #e2e8f0; border-radius:10px; padding:12px; margin-bottom:12px; box-shadow:0 2px 4px rgba(0,0,0,0.02); text-align:left;">
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e2e8f0; padding-bottom:6px; margin-bottom:8px;">
                    <div style="flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; padding-right:10px;">
                        <span style="background:#e0f2fe; color:#0369a1; padding:2px 6px; border-radius:4px; font-weight:800; font-size:10px; margin-right:6px; display:inline-block; vertical-align:middle;">${orderCode}</span>
                        <span style="color:#1e293b; font-weight:700; font-size:12px; vertical-align:middle;">${prodName}</span>
                    </div>
                    <span style="color:#475569; font-weight:600; font-size:11px; flex-shrink:0;">👤 ${workerName}</span>
                </div>
                
                <div style="background:#f8fafc; border-radius:6px; padding:6px 10px;">
                    ${detailsHtml}
                </div>
                
                <div style="display:flex; justify-content:flex-end; align-items:center; margin-top:8px; font-size:11px;">
                    <span style="color:#64748b; font-weight:600; margin-right:6px;">Lương đơn:</span>
                    <span style="color:#ea580c; font-weight:800; font-size:12.5px;">
                        ${r.cut_quantity || r.quantity || 0} sp x ${_lsxFN(r.unit_price || 0)}đ = ${_lsxFN(salary)} đ
                    </span>
                </div>
            </div>
        `;
    });

    var h = '<div class="bpc-modal-overlay" id="_bpeBulkCuttingQCModal" onclick="if(event.target===this)this.classList.remove(\'show\'),setTimeout(function(){document.getElementById(\'_bpeBulkCuttingQCModal\').remove()},300)">';
    h += '<div class="bpc-modal" style="width:620px; max-height:95vh; overflow-y:auto; display:flex; flex-direction:column;">';
    h += '<div class="bpc-modal-header" style="background:linear-gradient(135deg,#10b981,#059669)"><div class="m-icon">📋</div><div><div class="m-title">DUYỆT LƯƠNG HÀNG LOẠT — PHIẾU CẮT</div><div class="m-sub">Chi tiết danh sách các đơn hàng cắt được chọn để duyệt lương</div></div></div>';
    h += '<div class="bpc-modal-body" style="overflow-y:auto; flex:1; padding:16px 20px; font-size:12px; background:#f1f5f9;">';

    // Scrollable list container
    h += '<div style="max-height:380px; overflow-y:auto; padding-right:4px; margin-bottom:16px;">';
    h += itemRowsHtml;
    h += '</div>';

    // Grand total section
    h += '<div style="background:#fff; border-radius:10px; padding:14px; border:1px solid #bbf7d0; display:flex; justify-content:space-between; align-items:center; box-shadow:0 4px 15px rgba(16, 185, 129, 0.05); text-align:left;">';
    h += '<div>';
    h += '<div style="font-size:10px; font-weight:800; color:#15803d; text-transform:uppercase; letter-spacing:1px; margin-bottom:2px;">💰 TỔNG LƯƠNG TOÀN BỘ CÁC ĐƠN</div>';
    h += '<div style="font-size:11px; color:#475569; font-weight:500;">Duyệt đồng thời ' + records.length + ' bản ghi đã chọn</div>';
    h += '</div>';
    h += '<div style="font-size:20px; font-weight:900; color:#166534">' + _lsxFN(grandTotal) + ' đ</div>';
    h += '</div>';

    h += '</div>'; // End body

    // Footer actions
    h += '<div class="bpc-modal-actions" style="display: flex; gap: 10px; padding: 16px 24px; border-top: 1px solid #e2e8f0; background:#fff;">';
    h += '<button class="bpc-modal-btn cancel" style="flex: 1; padding: 12px; border: none; border-radius: 10px; font-size: 14px; font-weight: 700; cursor: pointer; transition: all .15s; background: #f1f5f9; color: #475569;" onclick="var m=document.getElementById(\'_bpeBulkCuttingQCModal\');if(m){m.classList.remove(\'show\');setTimeout(function(){m.remove()},300)}">Hủy</button>';
    h += '<button class="bpc-modal-btn confirm" style="flex: 1; padding: 12px; border: none; border-radius: 10px; font-size: 14px; font-weight: 700; cursor: pointer; transition: all .15s; background: linear-gradient(135deg, #10b981, #059669); color: #fff; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);" onclick="_lsxSubmitBulkCuttingApprove()">XÁC NHẬN DUYỆT</button>';
    h += '</div>';

    h += '</div></div>';

    document.body.insertAdjacentHTML('beforeend', h);
    setTimeout(function() {
        var m = document.getElementById('_bpeBulkCuttingQCModal');
        if (m) m.classList.add('show');
    }, 50);
}

async function _lsxSubmitBulkCuttingApprove() {
    var targets = _lsx.selectedRecords.map(function(r) {
        return { id: r.id, dept: r.dept };
    });

    try {
        showToast('Đang xử lý...', 'info');
        var res = await apiCall('/api/production-salary/approve-bulk', 'POST', {
            records: targets,
            approved: true
        });
        
        if (res && (res.success || res.count !== undefined)) {
            showToast('Duyệt hàng loạt thành công!', 'success');
            
            // Close the bulk QC modal
            var m = document.getElementById('_bpeBulkCuttingQCModal');
            if (m) {
                m.classList.remove('show');
                setTimeout(function() { m.remove(); }, 300);
            }
            
            _lsx.selectedRecords = [];
            _lsx.lastSelectedIndex = undefined;
            _lsxUpdateFloatingBar();
            await _lsxLoadAll();
        } else {
            showToast((res && res.error) || 'Có lỗi xảy ra', 'error');
        }
    } catch (e) {
        console.error(e);
        showToast(e.message || 'Lỗi khi duyệt hàng loạt', 'error');
    }
}

function _lsxOpenBulkSewingQCModal() {
    var records = [];
    _lsx.selectedRecords.forEach(function(sel) {
        var r = _lsx.records.find(function(x) { return x.id === sel.id && x.dept === 'sewing'; });
        if (r) records.push(r);
    });

    if (records.length === 0) {
        showToast('Không tìm thấy dữ liệu các dòng đã chọn', 'error');
        return;
    }

    var old = document.getElementById('_bpeBulkSewingQCModal'); if (old) old.remove();

    var itemRowsHtml = '';
    var totalThoGrand = 0;
    var totalCPMGrand = 0;

    records.forEach(function(r) {
        var orderCode = r.order_code || '—';
        var prodName = r.product_name || '—';
        var isContractor = !!r.contractor_id;
        var assignee = isContractor ? '🏭 ' + (r.contractor_name || 'Gia công') : '👥 ' + (r.worker_name || 'Tổ may');
        var quantity = Number(r.quantity) || 0;

        // Compile list of available techniques
        var tsamTechs = [];
        try {
            tsamTechs = typeof r.sample_sewing_tech === 'string' ? JSON.parse(r.sample_sewing_tech) : (r.sample_sewing_tech || []);
        } catch (e) {}
        if (!Array.isArray(tsamTechs)) tsamTechs = [];

        var orderTechs = [];
        try {
            orderTechs = typeof r.order_sewing_techniques === 'string' ? JSON.parse(r.order_sewing_techniques) : (r.order_sewing_techniques || []);
        } catch (e) {}
        if (!Array.isArray(orderTechs)) orderTechs = [];

        var techniques = [];
        var seenIds = new Set();
        
        function addTechToList(t, isSample) {
            if (!t || !t.id) return;
            var tid = Number(t.id);
            if (!seenIds.has(tid)) {
                seenIds.add(tid);
                techniques.push({
                    id: tid,
                    name: t.name || '',
                    qty: Number(t.qty) || 1,
                    fp: Number(t.fp) || 0,
                    pp: Number(t.pp) || 0,
                    is_sample: isSample
                });
            }
        }

        tsamTechs.forEach(function(t) { addTechToList(t, true); });
        orderTechs.forEach(function(t) { addTechToList(t, false); });

        var checkedIds = [];
        try {
            checkedIds = typeof r.checked_techniques === 'string' ? JSON.parse(r.checked_techniques) : (r.checked_techniques || []);
        } catch (e) {}
        if (!Array.isArray(checkedIds)) checkedIds = [];

        // Compute prices
        var totalFP = 0;
        var totalPP = 0;
        techniques.forEach(function(tech) {
            if (checkedIds.indexOf(tech.id) >= 0) {
                totalFP += (Number(tech.fp) || 0) * (Number(tech.qty) || 1);
                totalPP += (Number(tech.pp) || 0) * (Number(tech.qty) || 1);
            }
        });

        var unitPrice = isContractor ? totalPP : totalFP;
        var salary = quantity * unitPrice;
        var cpmSalary = isContractor ? 0 : (quantity * totalPP);

        totalThoGrand += salary;
        totalCPMGrand += cpmSalary;

        // Techniques rendering
        var techniquesHtml = '';
        if (techniques.length === 0) {
            techniquesHtml = '<div style="color:#94a3b8; font-style:italic; font-size:10.5px; padding:4px 0;">Không có dữ liệu kỹ thuật</div>';
        } else {
            techniques.forEach(function(tech) {
                var isChecked = checkedIds.indexOf(tech.id) >= 0;
                var checkMark = isChecked ? '✅' : '⬜';
                var opacity = isChecked ? 'opacity: 1;' : 'opacity: 0.55; text-decoration: line-through;';
                var qtyStr = tech.qty > 1 ? ` (x${tech.qty})` : '';
                techniquesHtml += `
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:4px 0; border-bottom:1px dashed #e2e8f0; font-size:11px; ${opacity}">
                        <span style="color:#1e293b; font-weight:600;">${checkMark} ${tech.name}${qtyStr}</span>
                        <span style="color:#475569; font-weight:700;">
                            Nhà: ${Number(tech.fp).toLocaleString('vi-VN')}đ | GC/CPM: ${Number(tech.pp).toLocaleString('vi-VN')}đ
                        </span>
                    </div>
                `;
            });
        }

        itemRowsHtml += `
            <div style="background:#fff; border:1px solid #e2e8f0; border-radius:10px; padding:12px; margin-bottom:12px; box-shadow:0 2px 4px rgba(0,0,0,0.02); text-align:left;">
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e2e8f0; padding-bottom:6px; margin-bottom:8px;">
                    <div style="flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; padding-right:10px;">
                        <span style="background:#e0f2fe; color:#0369a1; padding:2px 6px; border-radius:4px; font-weight:800; font-size:10px; margin-right:6px; display:inline-block; vertical-align:middle;">${orderCode}</span>
                        <span style="color:#1e293b; font-weight:700; font-size:12px; vertical-align:middle;">${prodName}</span>
                    </div>
                    <span style="color:#475569; font-weight:600; font-size:11px; flex-shrink:0;">${assignee}</span>
                </div>
                
                <div style="background:#f8fafc; border-radius:6px; padding:6px 10px; margin-bottom:8px;">
                    <div style="font-size:10px; font-weight:800; color:#4f46e5; margin-bottom:6px; text-transform:uppercase; letter-spacing:0.5px;">✂️ Chi tiết các kỹ thuật may & đơn giá:</div>
                    ${techniquesHtml}
                </div>
                
                <div style="display:flex; justify-content:space-between; align-items:center; font-size:11.5px; padding-top:4px;">
                    <span style="color:#64748b; font-weight:600;">Số lượng: <strong style="color:#0f172a;">${quantity} sp</strong></span>
                    <div style="text-align:right; font-weight:700;">
                        <div>
                            <span style="color:#64748b; font-weight:normal;">Lương Thợ (May Nhà):</span>
                            <span style="color:#166534; font-size:12px;">${quantity} sp x ${unitPrice.toLocaleString('vi-VN')}đ = ${Number(salary).toLocaleString('vi-VN')} đ</span>
                        </div>
                        ${!isContractor ? `
                        <div>
                            <span style="color:#64748b; font-weight:normal;">Lương CPM (May GC):</span>
                            <span style="color:#2563eb; font-size:12px;">${quantity} sp x ${totalPP.toLocaleString('vi-VN')}đ = ${Number(cpmSalary).toLocaleString('vi-VN')} đ</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    });

    var h = '<div class="bpc-modal-overlay" id="_bpeBulkSewingQCModal" onclick="if(event.target===this)this.classList.remove(\'show\'),setTimeout(function(){document.getElementById(\'_bpeBulkSewingQCModal\').remove()},300)">';
    h += '<div class="bpc-modal" style="width:680px; max-height:95vh; overflow-y:auto; display:flex; flex-direction:column;">';
    h += '<div class="bpc-modal-header" style="background:linear-gradient(135deg,#6366f1,#4f46e5)"><div class="m-icon">📋</div><div><div class="m-title">DUYỆT LƯƠNG HÀNG LOẠT — BỘ PHẬN MAY</div><div class="m-sub">Chi tiết danh sách các đơn hàng may được chọn để duyệt lương</div></div></div>';
    h += '<div class="bpc-modal-body" style="overflow-y:auto; flex:1; padding:16px 20px; font-size:12px; background:#f1f5f9;">';

    // Scrollable list container
    h += '<div style="max-height:380px; overflow-y:auto; padding-right:4px; margin-bottom:16px;">';
    h += itemRowsHtml;
    h += '</div>';

    // Grand total section
    h += '<div style="background:#fff; border-radius:10px; padding:14px; border:1px solid #c7d2fe; display:flex; flex-direction:column; gap:8px; box-shadow:0 4px 15px rgba(99, 102, 241, 0.05); text-align:left;">';
    h += '<div>';
    h += '<div style="font-size:10px; font-weight:800; color:#4f46e5; text-transform:uppercase; letter-spacing:1px; margin-bottom:2px;">💰 TỔNG HỢP LƯƠNG TOÀN BỘ CÁC ĐƠN</div>';
    h += '<div style="font-size:11px; color:#475569; font-weight:500;">Duyệt đồng thời ' + records.length + ' bản ghi đã chọn</div>';
    h += '</div>';
    h += '<div style="display:flex; justify-content:space-between; font-size:14px; border-top:1px dashed #e2e8f0; padding-top:8px;">';
    h += '<span><b>Tổng Lương Thợ (May Nhà):</b></span>';
    h += '<span style="font-weight:900; color:#166534; font-size:15px;">' + Number(totalThoGrand).toLocaleString('vi-VN') + ' đ</span>';
    h += '</div>';
    h += '<div style="display:flex; justify-content:space-between; font-size:14px;">';
    h += '<span><b>Tổng Lương CPM (May GC):</b></span>';
    h += '<span style="font-weight:900; color:#2563eb; font-size:15px;">' + Number(totalCPMGrand).toLocaleString('vi-VN') + ' đ</span>';
    h += '</div>';
    h += '<div style="display:flex; justify-content:space-between; font-size:15px; border-top:1px solid #cbd5e1; padding-top:6px; margin-top:2px;">';
    h += '<span><b>TỔNG CỘNG DUYỆT:</b></span>';
    h += '<span style="font-weight:950; color:#4f46e5; font-size:18px;">' + Number(totalThoGrand + totalCPMGrand).toLocaleString('vi-VN') + ' đ</span>';
    h += '</div>';
    h += '</div>';

    h += '</div>'; // End body

    // Footer actions
    h += '<div class="bpc-modal-actions" style="display: flex; gap: 10px; padding: 16px 24px; border-top: 1px solid #e2e8f0; background:#fff;">';
    h += '<button class="bpc-modal-btn cancel" style="flex: 1; padding: 12px; border: none; border-radius: 10px; font-size: 14px; font-weight: 700; cursor: pointer; transition: all .15s; background: #f1f5f9; color: #475569;" onclick="var m=document.getElementById(\'_bpeBulkSewingQCModal\');if(m){m.classList.remove(\'show\');setTimeout(function(){m.remove()},300)}">Hủy</button>';
    h += '<button class="bpc-modal-btn confirm" style="flex: 1; padding: 12px; border: none; border-radius: 10px; font-size: 14px; font-weight: 700; cursor: pointer; transition: all .15s; background: linear-gradient(135deg, #6366f1, #4f46e5); color: #fff; box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);" onclick="_lsxSubmitBulkSewingApprove()">XÁC NHẬN DUYỆT</button>';
    h += '</div>';

    h += '</div></div>';

    document.body.insertAdjacentHTML('beforeend', h);
    setTimeout(function() {
        var m = document.getElementById('_bpeBulkSewingQCModal');
        if (m) m.classList.add('show');
    }, 50);
}

async function _lsxSubmitBulkSewingApprove() {
    var targets = _lsx.selectedRecords.map(function(r) {
        return { id: r.id, dept: r.dept };
    });

    try {
        showToast('Đang xử lý...', 'info');
        var res = await apiCall('/api/production-salary/approve-bulk', 'POST', {
            records: targets,
            approved: true
        });
        
        if (res && (res.success || res.count !== undefined)) {
            showToast('Duyệt hàng loạt thành công!', 'success');
            
            // Close the bulk QC modal
            var m = document.getElementById('_bpeBulkSewingQCModal');
            if (m) {
                m.classList.remove('show');
                setTimeout(function() { m.remove(); }, 300);
            }
            
            _lsx.selectedRecords = [];
            _lsx.lastSelectedIndex = undefined;
            _lsxUpdateFloatingBar();
            await _lsxLoadAll();
        } else {
            showToast((res && res.error) || 'Có lỗi xảy ra', 'error');
        }
    } catch (e) {
        console.error(e);
        showToast(e.message || 'Lỗi khi duyệt hàng loạt', 'error');
    }
}
